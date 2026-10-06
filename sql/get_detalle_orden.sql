-- Detalle de venta con la orden de trabajo de cada producto.
-- La línea de venta no apunta a la orden de trabajo.
-- La orden de trabajo apunta a la venta, y el producto se cruza en su línea.
-- Pegar en el SQL Editor (schema public) y correr todo de una vez.

DROP FUNCTION IF EXISTS public.get_detalle_orden(text);

CREATE OR REPLACE FUNCTION public.get_detalle_orden(p_numero text)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  estado text,
  nombre_producto text,
  cantidad numeric,
  precio_unitario numeric,
  venta_total numeric,
  numero_orden_trabajo text,
  almacen text,
  destino text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
SELECT
  ov.codigo::text,
  ov.fecha_pedido::date,
  ov.estado::text,
  p.descripcion::text,
  COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida)::numeric,
  COALESCE(l.precio_unitario, 0)::numeric,
  (COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida) * COALESCE(l.precio_unitario, 0))::numeric,
  ot.numero_orden_trabajo,
  ot.almacen,
  ot.destino
FROM public.orden_venta ov
INNER JOIN public.orden_venta_linea l
  ON l.id_orden_venta = ov.id_orden_venta
INNER JOIN public.producto p
  ON p.id_producto = l.id_producto
LEFT JOIN LATERAL (
  SELECT DISTINCT
    otx.codigo::text AS numero_orden_trabajo,
    COALESCE(b.nombre, b.codigo)::text AS almacen,
    u.codigo::text AS destino
  FROM public.orden_trabajo otx
  INNER JOIN public.orden_trabajo_linea otl
    ON otl.id_orden_trabajo = otx.id_orden_trabajo
   AND otl.id_producto = l.id_producto
  LEFT JOIN public.bodega b
    ON b.id_bodega = otx.id_bodega
  LEFT JOIN public.ubicacion u
    ON u.id_ubicacion = otx.id_ubicacion_destino
  WHERE otx.id_orden_venta = ov.id_orden_venta
) ot ON true
WHERE ov.codigo ILIKE '%' || btrim(p_numero) || '%'
ORDER BY p.descripcion, ot.numero_orden_trabajo
$$;

GRANT EXECUTE ON FUNCTION public.get_detalle_orden(text)
  TO service_role, authenticator, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_detalle_ordenes(date, date);

CREATE OR REPLACE FUNCTION public.get_detalle_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  estado text,
  nombre_producto text,
  cantidad numeric,
  precio_unitario numeric,
  venta_total numeric,
  numero_orden_trabajo text,
  almacen text,
  destino text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
SELECT
  ov.codigo::text,
  ov.fecha_pedido::date,
  ov.estado::text,
  p.descripcion::text,
  COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida)::numeric,
  COALESCE(l.precio_unitario, 0)::numeric,
  (COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida) * COALESCE(l.precio_unitario, 0))::numeric,
  ot.numero_orden_trabajo,
  ot.almacen,
  ot.destino
FROM public.orden_venta ov
INNER JOIN public.orden_venta_linea l
  ON l.id_orden_venta = ov.id_orden_venta
INNER JOIN public.producto p
  ON p.id_producto = l.id_producto
LEFT JOIN LATERAL (
  SELECT DISTINCT
    otx.codigo::text AS numero_orden_trabajo,
    COALESCE(b.nombre, b.codigo)::text AS almacen,
    u.codigo::text AS destino
  FROM public.orden_trabajo otx
  INNER JOIN public.orden_trabajo_linea otl
    ON otl.id_orden_trabajo = otx.id_orden_trabajo
   AND otl.id_producto = l.id_producto
  LEFT JOIN public.bodega b
    ON b.id_bodega = otx.id_bodega
  LEFT JOIN public.ubicacion u
    ON u.id_ubicacion = otx.id_ubicacion_destino
  WHERE otx.id_orden_venta = ov.id_orden_venta
) ot ON true
WHERE ov.estado IS DISTINCT FROM 'cancelada'
  AND ov.fecha_pedido >= p_fecha_inicio
  AND ov.fecha_pedido < (p_fecha_fin + 1)
ORDER BY ov.fecha_pedido::date, ov.codigo, p.descripcion, ot.numero_orden_trabajo
$$;

GRANT EXECUTE ON FUNCTION public.get_detalle_ordenes(date, date)
  TO service_role, authenticator, anon, authenticated;

NOTIFY pgrst, 'reload schema';
