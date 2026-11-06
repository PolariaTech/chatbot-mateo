-- Una fila por orden de venta del rango, por fecha del pedido.
-- La cancelada no entra. total_rango es el conteo del periodo, antes del límite.

DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_listado_ordenes(date, date, integer, integer);
DROP FUNCTION IF EXISTS public.get_listado_ordenes(date, date, integer, integer);

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_listado_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date,
  p_desde integer DEFAULT 0,
  p_limite integer DEFAULT 1000
)
RETURNS TABLE (
  numero text,
  fecha_pedido date,
  fecha_entrega text,
  estado text,
  comprador text,
  centro text,
  orden_compra text,
  cantidad numeric,
  importe numeric,
  creacion text,
  total_rango bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ov.codigo::text,
    ov.fecha_pedido::date,
    NULLIF(btrim(ov.fecha_entrega), ''),
    ov.estado::text,
    NULLIF(btrim(c.nombre), ''),
    NULLIF(btrim(ov.centro_consumo), ''),
    NULLIF(btrim(ov.orden_compra_hotel), ''),
    COALESCE(SUM(COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0)), 0),
    COALESCE(SUM(
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)
    ), 0),
    to_char(ov.created_at AT TIME ZONE 'America/Cancun', 'YYYY-MM-DD HH24:MI:SS'),
    COUNT(*) OVER ()
  FROM emp_jbr_cygnus_y9ihz.orden_venta ov
  LEFT JOIN emp_jbr_cygnus_y9ihz.comprador c ON c.id_comprador = ov.id_comprador
  LEFT JOIN emp_jbr_cygnus_y9ihz.orden_venta_linea l ON l.id_orden_venta = ov.id_orden_venta
  WHERE ov.estado IS DISTINCT FROM 'cancelada'
    AND ov.fecha_pedido::date >= p_fecha_inicio
    AND ov.fecha_pedido::date < (p_fecha_fin + 1)
  GROUP BY ov.id_orden_venta, ov.codigo, ov.fecha_pedido, ov.fecha_entrega, ov.estado,
    c.nombre, ov.centro_consumo, ov.orden_compra_hotel, ov.created_at
  ORDER BY ov.fecha_pedido DESC, ov.codigo DESC
  OFFSET GREATEST(COALESCE(p_desde, 0), 0)
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 1000)
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_listado_ordenes(date, date, integer, integer)
  TO service_role, authenticator, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_listado_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date,
  p_desde integer DEFAULT 0,
  p_limite integer DEFAULT 1000
)
RETURNS TABLE (
  numero text,
  fecha_pedido date,
  fecha_entrega text,
  estado text,
  comprador text,
  centro text,
  orden_compra text,
  cantidad numeric,
  importe numeric,
  creacion text,
  total_rango bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ov.codigo::text,
    ov.fecha_pedido::date,
    NULLIF(btrim(ov.fecha_entrega), ''),
    ov.estado::text,
    NULLIF(btrim(c.nombre), ''),
    NULLIF(btrim(ov.centro_consumo), ''),
    NULLIF(btrim(ov.orden_compra_hotel), ''),
    COALESCE(SUM(COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0)), 0),
    COALESCE(SUM(
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)
    ), 0),
    to_char(ov.created_at AT TIME ZONE 'America/Cancun', 'YYYY-MM-DD HH24:MI:SS'),
    COUNT(*) OVER ()
  FROM public.orden_venta ov
  LEFT JOIN public.comprador c ON c.id_comprador = ov.id_comprador
  LEFT JOIN public.orden_venta_linea l ON l.id_orden_venta = ov.id_orden_venta
  WHERE ov.estado IS DISTINCT FROM 'cancelada'
    AND ov.fecha_pedido::date >= p_fecha_inicio
    AND ov.fecha_pedido::date < (p_fecha_fin + 1)
  GROUP BY ov.id_orden_venta, ov.codigo, ov.fecha_pedido, ov.fecha_entrega, ov.estado,
    c.nombre, ov.centro_consumo, ov.orden_compra_hotel, ov.created_at
  ORDER BY ov.fecha_pedido DESC, ov.codigo DESC
  OFFSET GREATEST(COALESCE(p_desde, 0), 0)
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 1000)
$$;

GRANT EXECUTE ON FUNCTION public.get_listado_ordenes(date, date, integer, integer)
  TO service_role, authenticator, anon, authenticated;

NOTIFY pgrst, 'reload schema';
