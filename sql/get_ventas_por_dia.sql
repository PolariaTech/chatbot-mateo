-- Volumen de ventas: 1 fila por día (total 1-Producto).
-- Misma definición de venta que get_resumen_sku:
-- orden no cancelada, fecha_pedido en el rango, folio digital uuid_estado = 2.
-- El timeout se sube DENTRO de la función (SET LOCAL), no en el cliente.

DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_ventas_por_dia(date, date);

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_ventas_por_dia(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  fecha date,
  id_producto uuid,
  codigo_producto text,
  nombre_producto text,
  cantidad_venta numeric,
  venta_total numeric
)
LANGUAGE plpgsql
STABLE
SET statement_timeout = '120s'
AS $$
BEGIN
  PERFORM set_config('statement_timeout', '120s', true);

  RETURN QUERY
  WITH productos_ok AS (
    SELECT
      p.id_producto,
      p.sku,
      p.descripcion
    FROM emp_jbr_cygnus_y9ihz.producto p
    WHERE (
      CASE
        WHEN COALESCE(
          NULLIF(p.metadatos_catalogo ->> 'tipo_producto', '')::integer,
          CASE WHEN p.categoria = 'servicio' THEN 3 ELSE 1 END
        ) = 3 THEN '3-Servicio'
        WHEN COALESCE(NULLIF(p.metadatos_catalogo ->> 'tipo_producto', '')::integer, 1) = 1
          AND p.sku ~ '^[0-9]+$'
          AND p.sku::bigint < 5010000000
          THEN '1-Producto'
        ELSE 'na'
      END
    ) = '1-Producto'
  ),
  ordenes_ok AS (
    SELECT DISTINCT
      ov.id_orden_venta,
      ov.fecha_pedido::date AS fecha
    FROM emp_jbr_cygnus_y9ihz.orden_venta ov
    INNER JOIN emp_jbr_cygnus_y9ihz.folio_digital fd
      ON fd.id_orden_venta = ov.id_orden_venta
     AND fd.uuid_estado = 2
    WHERE ov.estado IS DISTINCT FROM 'cancelada'
      AND ov.fecha_pedido >= p_fecha_inicio
      AND ov.fecha_pedido < (p_fecha_fin + 1)
  )
  SELECT
    o.fecha,
    NULL::uuid,
    NULL::text,
    NULL::text,
    SUM(COALESCE(l.cantidad_despachada, l.cantidad_pedida))::numeric,
    SUM(
      COALESCE(
        l.importe_total,
        COALESCE(l.cantidad_despachada, l.cantidad_pedida) * l.precio_unitario
      )
    )::numeric
  FROM ordenes_ok o
  INNER JOIN emp_jbr_cygnus_y9ihz.orden_venta_linea l
    ON l.id_orden_venta = o.id_orden_venta
  INNER JOIN productos_ok p
    ON p.id_producto = l.id_producto
  GROUP BY o.fecha
  ORDER BY 1;
END;
$$;

NOTIFY pgrst, 'reload schema';

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_ventas_por_dia(date, date)
  TO service_role, authenticator, anon, authenticated;
