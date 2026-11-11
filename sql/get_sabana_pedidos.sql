-- Sábana de pedidos para Mateo. Una fila por producto.
-- Si el correo trae centro de consumo, la fila sale de ahí. El centro es la orden de trabajo.
-- Si no hay centro y sí hay orden de trabajo, la fila sale del código OT.
-- Si no hay ni centro ni orden de trabajo, y el correo trae líneas, salen de ahí.
--
-- Filtro de tiempo, dentro de la función:
--   p_fecha: pedido (default), creacion o entrega.
--   p_horas, p_hora_inicio y p_hora_fin cortan por la fecha de creación
--   y mandan sobre el rango de fechas.
-- El resto (estado, cliente, almacén, orden) se filtra en la sentencia
-- que llama a esta función.
--
-- Ejemplo:
--   SELECT * FROM emp_jbr_cygnus_y9ihz.get_sabana_pedidos(DATE '2026-11-11', DATE '2026-11-11');

DO $crear$
DECLARE
  esquema text;
  cuerpo constant text := $cuerpo$
WITH ordenes AS (
  SELECT
    ov.id_orden_venta,
    ov.codigo::text AS orden_venta,
    COALESCE(NULLIF(btrim(ov.estado::text), ''), 'sin estado') AS estado,
    COALESCE(NULLIF(btrim(c.nombre), ''), 'Sin cliente') AS cliente,
    NULLIF(btrim(ov.orden_compra_hotel), '') AS orden_compra,
    ov.fecha_pedido::date AS fecha_pedido,
    ov.created_at AS fecha_creacion,
    NULLIF(btrim(ov.fecha_entrega), '') AS fecha_entrega,
    NULLIF(btrim(ov.ventana_desde), '') AS ventana_desde,
    NULLIF(btrim(ov.ventana_hasta), '') AS ventana_hasta,
    NULLIF(btrim(ov.direccion_entrega), '') AS direccion_entrega,
    NULLIF(btrim(ov.contacto_entrega), '') AS contacto_entrega,
    NULLIF(btrim(ov.telefono_contacto), '') AS telefono,
    NULLIF(btrim(ov.vendedor), '') AS vendedor,
    NULLIF(btrim(ov.prioridad), '') AS prioridad,
    NULLIF(btrim(ov.moneda), '') AS moneda,
    ov.origen_correo,
    EXISTS (
      SELECT 1
      FROM orden_trabajo ot0
      WHERE ot0.id_orden_venta = ov.id_orden_venta
    ) AS tiene_ot,
    (
      jsonb_typeof(ov.origen_correo) = 'array'
      AND jsonb_array_length(ov.origen_correo) > 0
    ) AS tiene_correo,
    (
      jsonb_typeof(ov.origen_correo) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(ov.origen_correo) elemento
        WHERE NULLIF(btrim(elemento->>'Almacen'), '') IS NOT NULL
      )
    ) AS tiene_centro
  FROM orden_venta ov
  LEFT JOIN comprador c ON c.id_comprador = ov.id_comprador
  WHERE ov.estado IS DISTINCT FROM 'cancelada'
    AND p_fecha_inicio IS NOT NULL
    AND p_fecha_fin IS NOT NULL
    AND p_fecha_inicio <= p_fecha_fin
    AND (
      CASE
        WHEN p_hora_inicio IS NOT NULL AND p_hora_fin IS NOT NULL THEN
          ov.created_at >= p_hora_inicio AND ov.created_at <= p_hora_fin
        WHEN p_horas IS NOT NULL AND p_horas > 0 THEN
          ov.created_at >= now() - make_interval(hours => LEAST(p_horas, 168))
          AND ov.created_at <= now()
        WHEN lower(btrim(COALESCE(p_fecha, 'pedido'))) = 'creacion' THEN
          (ov.created_at AT TIME ZONE 'America/Cancun')::date >= p_fecha_inicio
          AND (ov.created_at AT TIME ZONE 'America/Cancun')::date < (p_fecha_fin + 1)
        WHEN lower(btrim(p_fecha)) = 'entrega' THEN
          left(btrim(ov.fecha_entrega), 10) ~ '^\d{4}-\d{2}-\d{2}$'
          AND left(btrim(ov.fecha_entrega), 10)::date >= p_fecha_inicio
          AND left(btrim(ov.fecha_entrega), 10)::date <= p_fecha_fin
        ELSE
          ov.fecha_pedido >= p_fecha_inicio
          AND ov.fecha_pedido < (p_fecha_fin + 1)
      END
    )
),
por_ot AS (
  SELECT
    o.orden_venta, o.estado, o.cliente, o.orden_compra, o.fecha_pedido, o.fecha_creacion,
    o.fecha_entrega, o.ventana_desde, o.ventana_hasta, o.direccion_entrega, o.contacto_entrega,
    o.telefono, o.vendedor, o.prioridad, o.moneda,
    'orden_trabajo'::text AS origen_desglose,
    ot.codigo::text AS orden_trabajo,
    ot.tipo::text AS tipo_orden_trabajo,
    ot.estado::text AS estado_orden_trabajo,
    ot.created_at AS fecha_creacion_orden_trabajo,
    COALESCE(b.nombre, b.codigo)::text AS almacen,
    u.codigo::text AS destino,
    NULL::text AS numero_pedido,
    COALESCE(NULLIF(btrim(p.descripcion), ''), NULLIF(btrim(p.sku), ''))::text AS producto,
    NULLIF(btrim(p.sku), '')::text AS codigo_producto,
    NULLIF(btrim(COALESCE(l.unidad_medida, p.unidad_medida)), '')::text AS unidad,
    COALESCE(otl.cantidad, 0)::numeric AS cantidad,
    COALESCE(l.precio_unitario, 0)::numeric AS precio,
    (COALESCE(otl.cantidad, 0) * COALESCE(l.precio_unitario, 0))::numeric AS importe
  FROM ordenes o
  INNER JOIN orden_trabajo ot ON ot.id_orden_venta = o.id_orden_venta
  INNER JOIN orden_trabajo_linea otl ON otl.id_orden_trabajo = ot.id_orden_trabajo
  LEFT JOIN producto p ON p.id_producto = otl.id_producto
  LEFT JOIN bodega b ON b.id_bodega = ot.id_bodega
  LEFT JOIN ubicacion u ON u.id_ubicacion = ot.id_ubicacion_destino
  LEFT JOIN LATERAL (
    SELECT linea.precio_unitario, linea.unidad_medida
    FROM orden_venta_linea linea
    WHERE linea.id_orden_venta = o.id_orden_venta
      AND linea.id_producto = otl.id_producto
    ORDER BY linea.id_linea_orden_venta
    LIMIT 1
  ) l ON true
  WHERE o.tiene_ot
    AND NOT o.tiene_centro
),
por_almacen AS (
  SELECT
    o.orden_venta, o.estado, o.cliente, o.orden_compra, o.fecha_pedido, o.fecha_creacion,
    o.fecha_entrega, o.ventana_desde, o.ventana_hasta, o.direccion_entrega, o.contacto_entrega,
    o.telefono, o.vendedor, o.prioridad, o.moneda,
    'almacen'::text AS origen_desglose,
    NULL::text AS orden_trabajo,
    NULL::text AS tipo_orden_trabajo,
    NULL::text AS estado_orden_trabajo,
    NULL::timestamp with time zone AS fecha_creacion_orden_trabajo,
    NULLIF(btrim(elemento->>'Almacen'), '') AS almacen,
    NULLIF(btrim(elemento->>'Destino'), '') AS destino,
    NULLIF(btrim(elemento->>'Numero pedido'), '') AS numero_pedido,
    NULLIF(btrim(elemento->>'Producto'), '') AS producto,
    NULLIF(btrim(elemento->>'Codigo producto'), '') AS codigo_producto,
    NULLIF(btrim(elemento->>'Unidad'), '') AS unidad,
    CASE
      WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
        THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
      ELSE 0::numeric
    END AS cantidad,
    CASE
      WHEN btrim(COALESCE(elemento->>'Precio', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
        THEN replace(btrim(elemento->>'Precio'), ',', '.')::numeric
      ELSE 0::numeric
    END AS precio,
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
  CROSS JOIN LATERAL jsonb_array_elements(o.origen_correo) AS elemento
  WHERE o.tiene_correo
    AND (o.tiene_centro OR NOT o.tiene_ot)
),
sin_desglose AS (
  SELECT
    o.orden_venta, o.estado, o.cliente, o.orden_compra, o.fecha_pedido, o.fecha_creacion,
    o.fecha_entrega, o.ventana_desde, o.ventana_hasta, o.direccion_entrega, o.contacto_entrega,
    o.telefono, o.vendedor, o.prioridad, o.moneda,
    'sin_desglose'::text AS origen_desglose,
    NULL::text, NULL::text, NULL::text, NULL::timestamp with time zone,
    NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
    NULL::numeric, NULL::numeric, NULL::numeric
  FROM ordenes o
  WHERE NOT o.tiene_ot
    AND NOT o.tiene_correo
)
SELECT * FROM por_ot
UNION ALL
SELECT * FROM por_almacen
UNION ALL
SELECT * FROM sin_desglose
$cuerpo$;
BEGIN
  FOREACH esquema IN ARRAY ARRAY[
    'emp_jbr_cygnus_y9ihz',
    'emp_andino_4v053',
    'emp_demo_1xz77',
    'public',
    'template_wms'
  ]
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.get_sabana_pedidos(date, date, text, integer, timestamp with time zone, timestamp with time zone)',
      esquema
    );
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION %I.get_sabana_pedidos(
        p_fecha_inicio date,
        p_fecha_fin date,
        p_fecha text DEFAULT ''pedido'',
        p_horas integer DEFAULT NULL,
        p_hora_inicio timestamp with time zone DEFAULT NULL,
        p_hora_fin timestamp with time zone DEFAULT NULL
      )
      RETURNS TABLE (
        orden_venta text,
        estado text,
        cliente text,
        orden_compra text,
        fecha_pedido date,
        fecha_creacion timestamp with time zone,
        fecha_entrega text,
        ventana_desde text,
        ventana_hasta text,
        direccion_entrega text,
        contacto_entrega text,
        telefono text,
        vendedor text,
        prioridad text,
        moneda text,
        origen_desglose text,
        orden_trabajo text,
        tipo_orden_trabajo text,
        estado_orden_trabajo text,
        fecha_creacion_orden_trabajo timestamp with time zone,
        almacen text,
        destino text,
        numero_pedido text,
        producto text,
        codigo_producto text,
        unidad text,
        cantidad numeric,
        precio numeric,
        importe numeric
      )
      LANGUAGE sql
      STABLE
      SECURITY INVOKER
      SET search_path TO %I
      SET statement_timeout TO ''120s''
      AS %L',
      esquema,
      esquema,
      cuerpo
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.get_sabana_pedidos(date, date, text, integer, timestamp with time zone, timestamp with time zone) TO service_role, authenticator, anon, authenticated',
      esquema
    );
  END LOOP;
END
$crear$;

NOTIFY pgrst, 'reload schema';
