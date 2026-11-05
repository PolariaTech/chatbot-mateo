-- Todas las órdenes de venta de un periodo, una fila por línea.
-- La cancelada no entra. La app arma el Excel; esta función no filtra columnas.

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_export_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  estado text,
  comprador text,
  orden_compra_hotel text,
  centro_consumo text,
  producto text,
  unidad text,
  cantidad numeric,
  precio numeric,
  importe numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ov.codigo::text,
    ov.fecha_pedido::date,
    ov.estado::text,
    NULLIF(btrim(c.nombre), ''),
    NULLIF(btrim(ov.orden_compra_hotel), ''),
    NULLIF(btrim(ov.centro_consumo), ''),
    NULLIF(btrim(COALESCE(pr.descripcion, pr.sku)), ''),
    NULLIF(btrim(COALESCE(l.unidad_medida, pr.unidad_medida)), ''),
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0),
    COALESCE(l.precio_unitario, 0),
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)
  FROM emp_jbr_cygnus_y9ihz.orden_venta ov
  LEFT JOIN emp_jbr_cygnus_y9ihz.comprador c ON c.id_comprador = ov.id_comprador
  LEFT JOIN emp_jbr_cygnus_y9ihz.orden_venta_linea l ON l.id_orden_venta = ov.id_orden_venta
  LEFT JOIN emp_jbr_cygnus_y9ihz.producto pr ON pr.id_producto = l.id_producto
  WHERE ov.estado IS DISTINCT FROM 'cancelada'
    AND ov.fecha_pedido >= p_fecha_inicio
    AND ov.fecha_pedido < (p_fecha_fin + 1)
  ORDER BY ov.fecha_pedido, ov.codigo, pr.descripcion
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_export_ordenes(date, date)
  TO service_role, authenticator, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_export_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  estado text,
  comprador text,
  orden_compra_hotel text,
  centro_consumo text,
  producto text,
  unidad text,
  cantidad numeric,
  precio numeric,
  importe numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ov.codigo::text,
    ov.fecha_pedido::date,
    ov.estado::text,
    NULLIF(btrim(c.nombre), ''),
    NULLIF(btrim(ov.orden_compra_hotel), ''),
    NULLIF(btrim(ov.centro_consumo), ''),
    NULLIF(btrim(COALESCE(pr.descripcion, pr.sku)), ''),
    NULLIF(btrim(COALESCE(l.unidad_medida, pr.unidad_medida)), ''),
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0),
    COALESCE(l.precio_unitario, 0),
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)
  FROM public.orden_venta ov
  LEFT JOIN public.comprador c ON c.id_comprador = ov.id_comprador
  LEFT JOIN public.orden_venta_linea l ON l.id_orden_venta = ov.id_orden_venta
  LEFT JOIN public.producto pr ON pr.id_producto = l.id_producto
  WHERE ov.estado IS DISTINCT FROM 'cancelada'
    AND ov.fecha_pedido >= p_fecha_inicio
    AND ov.fecha_pedido < (p_fecha_fin + 1)
  ORDER BY ov.fecha_pedido, ov.codigo, pr.descripcion
$$;

GRANT EXECUTE ON FUNCTION public.get_export_ordenes(date, date)
  TO service_role, authenticator, anon, authenticated;

NOTIFY pgrst, 'reload schema';
