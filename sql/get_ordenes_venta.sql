-- Una fila por orden de venta, con su número y su importe.
-- Pegar en el SQL Editor (schema public) y correr todo de una vez.
-- No cuenta borrador ni cancelada.
-- Si cantidad_despachada viene en 0, usa cantidad_pedida.

DROP FUNCTION IF EXISTS public.get_ordenes_venta(date, date);

CREATE OR REPLACE FUNCTION public.get_ordenes_venta(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  estado text,
  cantidad numeric,
  venta_total numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
SELECT
  ov.codigo::text,
  ov.fecha_pedido::date,
  ov.estado::text,
  SUM(COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida))::numeric,
  SUM(
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida)
    * COALESCE(l.precio_unitario, 0)
  )::numeric
FROM public.orden_venta ov
INNER JOIN public.orden_venta_linea l
  ON l.id_orden_venta = ov.id_orden_venta
WHERE ov.estado IS NOT NULL
  AND lower(ov.estado) NOT IN ('cancelada', 'borrador')
  AND ov.fecha_pedido >= p_fecha_inicio
  AND ov.fecha_pedido < (p_fecha_fin + 1)
GROUP BY ov.codigo, ov.fecha_pedido::date, ov.estado
ORDER BY ov.fecha_pedido::date, ov.codigo
$$;

GRANT EXECUTE ON FUNCTION public.get_ordenes_venta(date, date)
  TO service_role, authenticator, anon, authenticated;

NOTIFY pgrst, 'reload schema';
