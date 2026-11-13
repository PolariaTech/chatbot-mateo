-- Detalle del listado: una fila por producto de cada orden de trabajo.
-- Si el correo trae centro de consumo, el centro es la orden de trabajo.
-- Si no hay centro, se usa el código de la orden de trabajo.
-- Si no hay centro ni orden de trabajo, y el correo trae producto, sale de ahí.
-- Si el correo no trae producto, salen las líneas de la orden de venta.
-- El corte de fechas es el mismo de get_listado_ordenes.

DO $crear$
DECLARE
  esquema text;
  cuerpo constant text := $cuerpo$
WITH ordenes AS (
  SELECT
    ov.id_orden_venta,
    ov.codigo::text AS numero,
    ov.estado::text AS estado,
    NULLIF(btrim(c.nombre), '') AS cliente,
    ov.origen_correo,
    (
      jsonb_typeof(ov.origen_correo) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(ov.origen_correo) elemento
        WHERE NULLIF(btrim(elemento->>'Almacen'), '') IS NOT NULL
      )
    ) AS tiene_centro,
    EXISTS (
      SELECT 1 FROM orden_trabajo ot0 WHERE ot0.id_orden_venta = ov.id_orden_venta
    ) AS tiene_ot,
    (
      jsonb_typeof(ov.origen_correo) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(ov.origen_correo) elemento
        WHERE NULLIF(btrim(elemento->>'Producto'), '') IS NOT NULL
          OR NULLIF(btrim(elemento->>'Codigo producto'), '') IS NOT NULL
      )
    ) AS tiene_producto_correo
  FROM orden_venta ov
  LEFT JOIN comprador c ON c.id_comprador = ov.id_comprador
  WHERE ov.estado IS DISTINCT FROM 'cancelada'
    AND (
      CASE
        WHEN lower(btrim(COALESCE(p_fecha, 'entrega'))) = 'creacion' THEN
          (ov.created_at AT TIME ZONE 'America/Cancun')::date >= p_fecha_inicio
          AND (ov.created_at AT TIME ZONE 'America/Cancun')::date < (p_fecha_fin + 1)
        WHEN lower(btrim(p_fecha)) = 'pedido' THEN
          ov.fecha_pedido::date >= p_fecha_inicio
          AND ov.fecha_pedido::date < (p_fecha_fin + 1)
        ELSE
          COALESCE(fecha_iso_segura(ov.fecha_entrega) BETWEEN p_fecha_inicio AND p_fecha_fin, false)
      END
    )
),
por_centro AS (
  SELECT
    o.numero,
    o.cliente,
    o.estado,
    NULLIF(btrim(elemento->>'Almacen'), '') AS orden_trabajo,
    NULLIF(btrim(elemento->>'Codigo producto'), '') AS codigo_producto,
    NULLIF(btrim(elemento->>'Producto'), '') AS producto,
    CASE
      WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
        THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
      ELSE 0::numeric
    END AS cantidad,
    NULLIF(btrim(elemento->>'Unidad'), '') AS unidad,
    (
      CASE
        WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
        ELSE 0::numeric
      END
      *
      CASE
        WHEN btrim(COALESCE(elemento->>'Precio', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Precio'), ',', '.')::numeric
        ELSE 0::numeric
      END
    ) AS importe
  FROM ordenes o
  CROSS JOIN LATERAL jsonb_array_elements(o.origen_correo) elemento
  WHERE o.tiene_centro
    AND NULLIF(btrim(elemento->>'Almacen'), '') IS NOT NULL
),
por_ot AS (
  SELECT
    o.numero,
    o.cliente,
    o.estado,
    ot.codigo::text AS orden_trabajo,
    NULLIF(btrim(p.sku), '') AS codigo_producto,
    COALESCE(NULLIF(btrim(p.descripcion), ''), NULLIF(btrim(p.sku), '')) AS producto,
    COALESCE(otl.cantidad, 0) AS cantidad,
    NULLIF(btrim(COALESCE(linea.unidad_medida, p.unidad_medida)), '') AS unidad,
    (COALESCE(otl.cantidad, 0) * COALESCE(linea.precio_unitario, 0)) AS importe
  FROM ordenes o
  INNER JOIN orden_trabajo ot ON ot.id_orden_venta = o.id_orden_venta
  INNER JOIN orden_trabajo_linea otl ON otl.id_orden_trabajo = ot.id_orden_trabajo
  LEFT JOIN producto p ON p.id_producto = otl.id_producto
  LEFT JOIN LATERAL (
    SELECT l.precio_unitario, l.unidad_medida
    FROM orden_venta_linea l
    WHERE l.id_orden_venta = o.id_orden_venta
      AND l.id_producto = otl.id_producto
    ORDER BY l.id_linea_orden_venta
    LIMIT 1
  ) linea ON true
  WHERE o.tiene_ot
    AND NOT o.tiene_centro
),
sin_ot AS (
  SELECT
    o.numero,
    o.cliente,
    o.estado,
    NULL::text AS orden_trabajo,
    NULLIF(btrim(elemento->>'Codigo producto'), '') AS codigo_producto,
    NULLIF(btrim(elemento->>'Producto'), '') AS producto,
    CASE
      WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
        THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
      ELSE 0::numeric
    END AS cantidad,
    NULLIF(btrim(elemento->>'Unidad'), '') AS unidad,
    (
      CASE
        WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
        ELSE 0::numeric
      END
      *
      CASE
        WHEN btrim(COALESCE(elemento->>'Precio', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Precio'), ',', '.')::numeric
        ELSE 0::numeric
      END
    ) AS importe
  FROM ordenes o
  CROSS JOIN LATERAL jsonb_array_elements(o.origen_correo) elemento
  WHERE NOT o.tiene_ot
    AND NOT o.tiene_centro
    AND o.tiene_producto_correo
    AND (
      NULLIF(btrim(elemento->>'Producto'), '') IS NOT NULL
      OR NULLIF(btrim(elemento->>'Codigo producto'), '') IS NOT NULL
    )
  UNION ALL
  SELECT
    o.numero,
    o.cliente,
    o.estado,
    NULL::text AS orden_trabajo,
    NULLIF(btrim(p.sku), '') AS codigo_producto,
    COALESCE(NULLIF(btrim(p.descripcion), ''), NULLIF(btrim(p.sku), '')) AS producto,
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) AS cantidad,
    NULLIF(btrim(COALESCE(l.unidad_medida, p.unidad_medida)), '') AS unidad,
    (
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0)
      * COALESCE(l.precio_unitario, 0)
    ) AS importe
  FROM ordenes o
  INNER JOIN orden_venta_linea l ON l.id_orden_venta = o.id_orden_venta
  LEFT JOIN producto p ON p.id_producto = l.id_producto
  WHERE NOT o.tiene_ot
    AND NOT o.tiene_centro
    AND NOT o.tiene_producto_correo
)
SELECT numero, cliente, estado, orden_trabajo, codigo_producto, producto, cantidad, unidad, importe
FROM (
  SELECT * FROM por_centro
  UNION ALL
  SELECT * FROM por_ot
  UNION ALL
  SELECT * FROM sin_ot
) detalle
ORDER BY numero, orden_trabajo NULLS LAST, producto, codigo_producto, cantidad, importe
OFFSET GREATEST(COALESCE(p_desde, 0), 0)
LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 5000)
$cuerpo$;
BEGIN
  FOREACH esquema IN ARRAY ARRAY['emp_jbr_cygnus_y9ihz', 'public']
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.get_detalle_ot_ordenes(date, date, integer, integer, text)',
      esquema
    );
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION %I.get_detalle_ot_ordenes(
        p_fecha_inicio date,
        p_fecha_fin date,
        p_desde integer DEFAULT 0,
        p_limite integer DEFAULT 1000,
        p_fecha text DEFAULT ''entrega''
      )
      RETURNS TABLE (
        numero text,
        cliente text,
        estado text,
        orden_trabajo text,
        codigo_producto text,
        producto text,
        cantidad numeric,
        unidad text,
        importe numeric
      )
      LANGUAGE sql
      STABLE
      SET search_path TO %I
      SET statement_timeout TO ''120s''
      AS %L',
      esquema,
      esquema,
      cuerpo
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.get_detalle_ot_ordenes(date, date, integer, integer, text) TO service_role, authenticator, anon, authenticated',
      esquema
    );
  END LOOP;
END
$crear$;

DO $productos$
DECLARE
  esquema text;
  cuerpo constant text := $cuerpo$
WITH ordenes AS (
  SELECT
    ov.id_orden_venta,
    ov.codigo::text AS numero,
    ov.estado::text AS estado,
    NULLIF(btrim(c.nombre), '') AS cliente,
    ov.origen_correo,
    (
      jsonb_typeof(ov.origen_correo) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(ov.origen_correo) elemento
        WHERE NULLIF(btrim(elemento->>'Almacen'), '') IS NOT NULL
      )
    ) AS tiene_centro,
    EXISTS (
      SELECT 1 FROM orden_trabajo ot0 WHERE ot0.id_orden_venta = ov.id_orden_venta
    ) AS tiene_ot,
    (
      jsonb_typeof(ov.origen_correo) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(ov.origen_correo) elemento
        WHERE NULLIF(btrim(elemento->>'Producto'), '') IS NOT NULL
          OR NULLIF(btrim(elemento->>'Codigo producto'), '') IS NOT NULL
      )
    ) AS tiene_producto_correo
  FROM orden_venta ov
  LEFT JOIN comprador c ON c.id_comprador = ov.id_comprador
  WHERE ov.codigo = btrim(p_numero)
    AND ov.estado IS DISTINCT FROM 'cancelada'
),
por_centro AS (
  SELECT
    o.numero, o.cliente, o.estado,
    NULLIF(btrim(elemento->>'Almacen'), '') AS orden_trabajo,
    NULLIF(btrim(elemento->>'Codigo producto'), '') AS codigo_producto,
    NULLIF(btrim(elemento->>'Producto'), '') AS producto,
    CASE
      WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
        THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
      ELSE 0::numeric
    END AS cantidad,
    NULLIF(btrim(elemento->>'Unidad'), '') AS unidad,
    (
      CASE
        WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
        ELSE 0::numeric
      END
      *
      CASE
        WHEN btrim(COALESCE(elemento->>'Precio', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Precio'), ',', '.')::numeric
        ELSE 0::numeric
      END
    ) AS importe
  FROM ordenes o
  CROSS JOIN LATERAL jsonb_array_elements(o.origen_correo) elemento
  WHERE o.tiene_centro
    AND NULLIF(btrim(elemento->>'Almacen'), '') IS NOT NULL
),
por_ot AS (
  SELECT
    o.numero, o.cliente, o.estado,
    ot.codigo::text AS orden_trabajo,
    NULLIF(btrim(p.sku), '') AS codigo_producto,
    COALESCE(NULLIF(btrim(p.descripcion), ''), NULLIF(btrim(p.sku), '')) AS producto,
    COALESCE(otl.cantidad, 0) AS cantidad,
    NULLIF(btrim(COALESCE(linea.unidad_medida, p.unidad_medida)), '') AS unidad,
    (COALESCE(otl.cantidad, 0) * COALESCE(linea.precio_unitario, 0)) AS importe
  FROM ordenes o
  INNER JOIN orden_trabajo ot ON ot.id_orden_venta = o.id_orden_venta
  INNER JOIN orden_trabajo_linea otl ON otl.id_orden_trabajo = ot.id_orden_trabajo
  LEFT JOIN producto p ON p.id_producto = otl.id_producto
  LEFT JOIN LATERAL (
    SELECT l.precio_unitario, l.unidad_medida
    FROM orden_venta_linea l
    WHERE l.id_orden_venta = o.id_orden_venta
      AND l.id_producto = otl.id_producto
    ORDER BY l.id_linea_orden_venta
    LIMIT 1
  ) linea ON true
  WHERE o.tiene_ot AND NOT o.tiene_centro
),
sin_ot AS (
  SELECT
    o.numero, o.cliente, o.estado,
    NULL::text AS orden_trabajo,
    NULLIF(btrim(elemento->>'Codigo producto'), '') AS codigo_producto,
    NULLIF(btrim(elemento->>'Producto'), '') AS producto,
    CASE
      WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
        THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
      ELSE 0::numeric
    END AS cantidad,
    NULLIF(btrim(elemento->>'Unidad'), '') AS unidad,
    (
      CASE
        WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
        ELSE 0::numeric
      END
      *
      CASE
        WHEN btrim(COALESCE(elemento->>'Precio', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Precio'), ',', '.')::numeric
        ELSE 0::numeric
      END
    ) AS importe
  FROM ordenes o
  CROSS JOIN LATERAL jsonb_array_elements(o.origen_correo) elemento
  WHERE NOT o.tiene_ot
    AND NOT o.tiene_centro
    AND o.tiene_producto_correo
    AND (
      NULLIF(btrim(elemento->>'Producto'), '') IS NOT NULL
      OR NULLIF(btrim(elemento->>'Codigo producto'), '') IS NOT NULL
    )
  UNION ALL
  SELECT
    o.numero, o.cliente, o.estado,
    NULL::text AS orden_trabajo,
    NULLIF(btrim(p.sku), '') AS codigo_producto,
    COALESCE(NULLIF(btrim(p.descripcion), ''), NULLIF(btrim(p.sku), '')) AS producto,
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) AS cantidad,
    NULLIF(btrim(COALESCE(l.unidad_medida, p.unidad_medida)), '') AS unidad,
    (COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)) AS importe
  FROM ordenes o
  INNER JOIN orden_venta_linea l ON l.id_orden_venta = o.id_orden_venta
  LEFT JOIN producto p ON p.id_producto = l.id_producto
  WHERE NOT o.tiene_ot
    AND NOT o.tiene_centro
    AND NOT o.tiene_producto_correo
)
SELECT numero, cliente, estado, orden_trabajo, codigo_producto, producto, cantidad, unidad, importe
FROM (
  SELECT * FROM por_centro
  UNION ALL
  SELECT * FROM por_ot
  UNION ALL
  SELECT * FROM sin_ot
) detalle
ORDER BY orden_trabajo NULLS LAST, producto, codigo_producto, cantidad
LIMIT 5000
$cuerpo$;
BEGIN
  FOREACH esquema IN ARRAY ARRAY['emp_jbr_cygnus_y9ihz', 'public']
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.get_productos_orden(text)', esquema);
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION %I.get_productos_orden(p_numero text)
      RETURNS TABLE (
        numero text, cliente text, estado text, orden_trabajo text,
        codigo_producto text, producto text, cantidad numeric, unidad text, importe numeric
      )
      LANGUAGE sql STABLE
      SET search_path TO %I
      SET statement_timeout TO ''30s''
      AS %L',
      esquema, esquema, cuerpo
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.get_productos_orden(text) TO service_role, authenticator, anon, authenticated',
      esquema
    );
  END LOOP;
END
$productos$;

NOTIFY pgrst, 'reload schema';
