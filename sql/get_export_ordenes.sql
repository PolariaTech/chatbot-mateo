-- Órdenes de venta para el Excel, una fila por línea.
-- La cancelada no entra. El periodo es la fecha del pedido (fecha_pedido).
-- Sin fechas devuelve todas. El total es el de la orden, repetido en cada línea.

DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_export_ordenes(date, date);
DROP FUNCTION IF EXISTS public.get_export_ordenes(date, date);

DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_export_ordenes(date, date, text);
DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_export_ordenes(date, date, text, integer, integer);

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_export_ordenes(
  p_fecha_inicio date DEFAULT NULL,
  p_fecha_fin date DEFAULT NULL,
  p_fecha text DEFAULT 'pedido',
  p_desde integer DEFAULT 0,
  p_limite integer DEFAULT 1000
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
  importe numeric,
  id_ov text,
  cliente text,
  creacion text,
  entrega text,
  total numeric
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
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0),
    ov.codigo::text,
    NULLIF(btrim(c.nombre), ''),
    to_char(ov.created_at AT TIME ZONE 'America/Cancun', 'YYYY-MM-DD HH24:MI:SS'),
    NULLIF(btrim(ov.fecha_entrega), ''),
    COALESCE(SUM(
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)
    ) OVER (PARTITION BY ov.id_orden_venta), 0)
  FROM emp_jbr_cygnus_y9ihz.orden_venta ov
  LEFT JOIN emp_jbr_cygnus_y9ihz.comprador c ON c.id_comprador = ov.id_comprador
  LEFT JOIN emp_jbr_cygnus_y9ihz.orden_venta_linea l ON l.id_orden_venta = ov.id_orden_venta
  LEFT JOIN emp_jbr_cygnus_y9ihz.producto pr ON pr.id_producto = l.id_producto
  WHERE ov.estado IS DISTINCT FROM 'cancelada'
    AND (
      (p_fecha_inicio IS NULL AND p_fecha_fin IS NULL)
      OR (
        p_fecha_inicio IS NOT NULL
        AND p_fecha_fin IS NOT NULL
        AND ov.fecha_pedido::date >= p_fecha_inicio
        AND ov.fecha_pedido::date < (p_fecha_fin + 1)
      )
    )
  ORDER BY ov.created_at, ov.codigo, pr.descripcion
  OFFSET GREATEST(COALESCE(p_desde, 0), 0)
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 1000)
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_export_ordenes(date, date, text, integer, integer)
  TO service_role, authenticator, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_export_ordenes(date, date, text);
DROP FUNCTION IF EXISTS public.get_export_ordenes(date, date, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_export_ordenes(
  p_fecha_inicio date DEFAULT NULL,
  p_fecha_fin date DEFAULT NULL,
  p_fecha text DEFAULT 'pedido',
  p_desde integer DEFAULT 0,
  p_limite integer DEFAULT 1000
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
  importe numeric,
  id_ov text,
  cliente text,
  creacion text,
  entrega text,
  total numeric
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
    COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0),
    ov.codigo::text,
    NULLIF(btrim(c.nombre), ''),
    to_char(ov.created_at AT TIME ZONE 'America/Cancun', 'YYYY-MM-DD HH24:MI:SS'),
    NULLIF(btrim(ov.fecha_entrega), ''),
    COALESCE(SUM(
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)
    ) OVER (PARTITION BY ov.id_orden_venta), 0)
  FROM public.orden_venta ov
  LEFT JOIN public.comprador c ON c.id_comprador = ov.id_comprador
  LEFT JOIN public.orden_venta_linea l ON l.id_orden_venta = ov.id_orden_venta
  LEFT JOIN public.producto pr ON pr.id_producto = l.id_producto
  WHERE ov.estado IS DISTINCT FROM 'cancelada'
    AND (
      (p_fecha_inicio IS NULL AND p_fecha_fin IS NULL)
      OR (
        p_fecha_inicio IS NOT NULL
        AND p_fecha_fin IS NOT NULL
        AND ov.fecha_pedido::date >= p_fecha_inicio
        AND ov.fecha_pedido::date < (p_fecha_fin + 1)
      )
    )
  ORDER BY ov.created_at, ov.codigo, pr.descripcion
  OFFSET GREATEST(COALESCE(p_desde, 0), 0)
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 1000)
$$;

GRANT EXECUTE ON FUNCTION public.get_export_ordenes(date, date, text, integer, integer)
  TO service_role, authenticator, anon, authenticated;

NOTIFY pgrst, 'reload schema';
