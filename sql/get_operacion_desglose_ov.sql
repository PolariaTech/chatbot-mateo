-- Desglose de una OV: OT real si existe; si no, rompimiento por almacén del correo.
-- Una fila = un producto del desglose (o una fila "ninguno" si no hay OT ni correo).
-- Pegar en el SQL Editor o aplicar por esquema tenant.

-- Ejemplo de uso:
--   SELECT * FROM emp_jbr_cygnus_y9ihz.get_operacion_desglose_ov(DATE '2026-10-31', DATE '2026-10-31');
--   SELECT * FROM emp_jbr_cygnus_y9ihz.get_operacion_desglose_ov(...) WHERE numero_orden ILIKE '%OV-00001402%';

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_operacion_desglose_ov(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  estado text,
  modo text,
  referencia text,
  numero_pedido text,
  producto text,
  cantidad numeric,
  unidad text,
  precio numeric,
  importe numeric,
  almacen text,
  destino text,
  estado_ot text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET statement_timeout TO '120s'
AS $$
  WITH ordenes AS (
    SELECT
      ov.id_orden_venta,
      ov.codigo::text AS numero_orden,
      ov.fecha_pedido::date AS fecha,
      COALESCE(NULLIF(btrim(ov.estado::text), ''), 'sin estado') AS estado,
      ov.origen_correo,
      EXISTS (
        SELECT 1
        FROM emp_jbr_cygnus_y9ihz.orden_trabajo ot0
        WHERE ot0.id_orden_venta = ov.id_orden_venta
      ) AS tiene_ot,
      (
        jsonb_typeof(ov.origen_correo) = 'array'
        AND jsonb_array_length(ov.origen_correo) > 0
      ) AS tiene_correo
    FROM emp_jbr_cygnus_y9ihz.orden_venta ov
    WHERE p_fecha_inicio IS NOT NULL
      AND p_fecha_fin IS NOT NULL
      AND p_fecha_inicio <= p_fecha_fin
      AND ov.estado IS DISTINCT FROM 'cancelada'
      AND ov.fecha_pedido >= p_fecha_inicio
      AND ov.fecha_pedido < (p_fecha_fin + 1)
  ),
  por_ot AS (
    SELECT
      o.numero_orden,
      o.fecha,
      o.estado,
      'ot'::text AS modo,
      ot.codigo::text AS referencia,
      NULL::text AS numero_pedido,
      p.descripcion::text AS producto,
      COALESCE(otl.cantidad, 0)::numeric AS cantidad,
      NULLIF(btrim(l.unidad_medida), '')::text AS unidad,
      COALESCE(l.precio_unitario, 0)::numeric AS precio,
      (COALESCE(otl.cantidad, 0) * COALESCE(l.precio_unitario, 0))::numeric AS importe,
      COALESCE(b.nombre, b.codigo)::text AS almacen,
      u.codigo::text AS destino,
      ot.estado::text AS estado_ot
    FROM ordenes o
    INNER JOIN emp_jbr_cygnus_y9ihz.orden_trabajo ot
      ON ot.id_orden_venta = o.id_orden_venta
    INNER JOIN emp_jbr_cygnus_y9ihz.orden_trabajo_linea otl
      ON otl.id_orden_trabajo = ot.id_orden_trabajo
    LEFT JOIN emp_jbr_cygnus_y9ihz.producto p
      ON p.id_producto = otl.id_producto
    LEFT JOIN emp_jbr_cygnus_y9ihz.bodega b
      ON b.id_bodega = ot.id_bodega
    LEFT JOIN emp_jbr_cygnus_y9ihz.ubicacion u
      ON u.id_ubicacion = ot.id_ubicacion_destino
    LEFT JOIN LATERAL (
      SELECT
        linea.precio_unitario,
        linea.unidad_medida
      FROM emp_jbr_cygnus_y9ihz.orden_venta_linea linea
      WHERE linea.id_orden_venta = o.id_orden_venta
        AND linea.id_producto = otl.id_producto
      ORDER BY linea.id_linea_orden_venta
      LIMIT 1
    ) l ON true
    WHERE o.tiene_ot
  ),
  por_almacen AS (
    SELECT
      o.numero_orden,
      o.fecha,
      o.estado,
      'almacen'::text AS modo,
      NULLIF(btrim(elemento->>'Almacen'), '')::text AS referencia,
      NULLIF(btrim(elemento->>'Numero pedido'), '')::text AS numero_pedido,
      NULLIF(btrim(elemento->>'Producto'), '')::text AS producto,
      CASE
        WHEN btrim(COALESCE(elemento->>'Cantidad', '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN replace(btrim(elemento->>'Cantidad'), ',', '.')::numeric
        ELSE 0::numeric
      END AS cantidad,
      NULLIF(btrim(elemento->>'Unidad'), '')::text AS unidad,
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
      )::numeric AS importe,
      NULLIF(btrim(elemento->>'Almacen'), '')::text AS almacen,
      NULLIF(btrim(elemento->>'Destino'), '')::text AS destino,
      NULL::text AS estado_ot
    FROM ordenes o
    CROSS JOIN LATERAL jsonb_array_elements(o.origen_correo) AS elemento
    WHERE NOT o.tiene_ot
      AND o.tiene_correo
  ),
  sin_desglose AS (
    SELECT
      o.numero_orden,
      o.fecha,
      o.estado,
      'ninguno'::text AS modo,
      NULL::text AS referencia,
      NULL::text AS numero_pedido,
      NULL::text AS producto,
      NULL::numeric AS cantidad,
      NULL::text AS unidad,
      NULL::numeric AS precio,
      NULL::numeric AS importe,
      NULL::text AS almacen,
      NULL::text AS destino,
      NULL::text AS estado_ot
    FROM ordenes o
    WHERE NOT o.tiene_ot
      AND NOT o.tiene_correo
  )
  SELECT * FROM por_ot
  UNION ALL
  SELECT * FROM por_almacen
  UNION ALL
  SELECT * FROM sin_desglose
  ORDER BY 2, 1, 4, 5, 7
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_operacion_desglose_ov(date, date)
  TO service_role, authenticator, anon, authenticated;
