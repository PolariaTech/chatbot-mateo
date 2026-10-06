-- Borradores que llegan por correo, en emp_jbr_cygnus_y9ihz.
-- La fecha del rango es la llegada (created_at en America/Cancun), no fecha_pedido.
-- El detalle y los totales salen de orden_venta.origen_correo. No leen orden_venta_linea.
-- No usan folio digital ni orden de trabajo: un borrador todavía no es una venta.
-- Pegar en el SQL Editor y correr todo de una vez.

CREATE INDEX IF NOT EXISTS idx_orden_venta_borrador_llegada
  ON emp_jbr_cygnus_y9ihz.orden_venta (created_at)
  WHERE estado = 'borrador';

DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_borradores(date, date);

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_borradores(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  fecha_pedido date,
  fecha_llegada date,
  comprador text,
  orden_compra text,
  orden_compra_hotel text,
  centro_consumo text,
  cantidad numeric,
  venta_total numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ov.codigo::text,
    COALESCE(ov.fecha_pedido, CASE WHEN btrim(COALESCE(ov.fecha_entrega, '')) ~ '^\d{4}-\d{2}-\d{2}' THEN left(btrim(ov.fecha_entrega), 10)::date WHEN btrim(COALESCE(ov.fecha_entrega, '')) ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN to_date(btrim(ov.fecha_entrega), 'DD/MM/YYYY') ELSE NULL::date END, (ov.created_at AT TIME ZONE 'America/Cancun')::date),
    ov.fecha_pedido::date,
    (ov.created_at AT TIME ZONE 'America/Cancun')::date,
    (
      array_agg(NULLIF(src.linea->>'Nombre cliente', '') ORDER BY src.n)
      FILTER (WHERE NULLIF(src.linea->>'Nombre cliente', '') IS NOT NULL)
    )[1],
    (
      array_agg(NULLIF(src.linea->>'Numero pedido', '') ORDER BY src.n)
      FILTER (WHERE NULLIF(src.linea->>'Numero pedido', '') IS NOT NULL)
    )[1],
    NULLIF(btrim(ov.orden_compra_hotel), ''),
    NULLIF(btrim(ov.centro_consumo), ''),
    COALESCE(SUM(src.cantidad), 0)::numeric,
    COALESCE(SUM(src.cantidad * src.precio), 0)::numeric
  FROM emp_jbr_cygnus_y9ihz.orden_venta ov
  LEFT JOIN LATERAL (
    SELECT
      e.linea,
      e.n,
      CASE
        WHEN jsonb_typeof(e.linea->'Cantidad') = 'number' THEN (e.linea->>'Cantidad')::numeric
        WHEN COALESCE(e.linea->>'Cantidad', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Cantidad')::numeric
        ELSE NULL
      END AS cantidad,
      CASE
        WHEN jsonb_typeof(e.linea->'Precio') = 'number' THEN (e.linea->>'Precio')::numeric
        WHEN COALESCE(e.linea->>'Precio', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Precio')::numeric
        ELSE NULL
      END AS precio
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(ov.origen_correo::jsonb) = 'array' THEN ov.origen_correo::jsonb
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS e(linea, n)
  ) src ON true
  WHERE ov.estado = 'borrador'
    AND (ov.created_at AT TIME ZONE 'America/Cancun')::date >= p_fecha_inicio
    AND (ov.created_at AT TIME ZONE 'America/Cancun')::date <= p_fecha_fin
  GROUP BY ov.codigo, ov.fecha_pedido, ov.fecha_entrega, ov.created_at, ov.orden_compra_hotel, ov.centro_consumo
  ORDER BY ov.created_at, ov.codigo
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_borradores(date, date)
  TO service_role, authenticator, anon, authenticated;

DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_detalle_borradores(date, date);

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_detalle_borradores(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  fecha_pedido date,
  fecha_llegada date,
  nombre_cliente text,
  numero_pedido text,
  producto text,
  nombre_producto text,
  codigo_producto text,
  cantidad numeric,
  unidad text,
  precio numeric,
  venta_total numeric,
  almacen text,
  orden_compra_hotel text,
  centro_consumo text,
  referencia_pedido text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ov.codigo::text,
    COALESCE(ov.fecha_pedido, CASE WHEN btrim(COALESCE(ov.fecha_entrega, '')) ~ '^\d{4}-\d{2}-\d{2}' THEN left(btrim(ov.fecha_entrega), 10)::date WHEN btrim(COALESCE(ov.fecha_entrega, '')) ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN to_date(btrim(ov.fecha_entrega), 'DD/MM/YYYY') ELSE NULL::date END, (ov.created_at AT TIME ZONE 'America/Cancun')::date),
    ov.fecha_pedido::date,
    (ov.created_at AT TIME ZONE 'America/Cancun')::date,
    NULLIF(e.linea->>'Nombre cliente', ''),
    NULLIF(e.linea->>'Numero pedido', ''),
    NULLIF(e.linea->>'Producto', ''),
    NULLIF(e.linea->>'Producto', ''),
    NULLIF(e.linea->>'Codigo producto', ''),
    CASE
      WHEN jsonb_typeof(e.linea->'Cantidad') = 'number' THEN (e.linea->>'Cantidad')::numeric
      WHEN COALESCE(e.linea->>'Cantidad', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Cantidad')::numeric
      ELSE NULL
    END,
    NULLIF(e.linea->>'Unidad', ''),
    CASE
      WHEN jsonb_typeof(e.linea->'Precio') = 'number' THEN (e.linea->>'Precio')::numeric
      WHEN COALESCE(e.linea->>'Precio', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Precio')::numeric
      ELSE NULL
    END,
    (
      CASE
        WHEN jsonb_typeof(e.linea->'Cantidad') = 'number' THEN (e.linea->>'Cantidad')::numeric
        WHEN COALESCE(e.linea->>'Cantidad', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Cantidad')::numeric
        ELSE NULL
      END
      *
      CASE
        WHEN jsonb_typeof(e.linea->'Precio') = 'number' THEN (e.linea->>'Precio')::numeric
        WHEN COALESCE(e.linea->>'Precio', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Precio')::numeric
        ELSE NULL
      END
    ),
    NULLIF(e.linea->>'Almacen', ''),
    NULLIF(btrim(ov.orden_compra_hotel), ''),
    NULLIF(btrim(ov.centro_consumo), ''),
    NULLIF(e.linea->>'Referencia pedido', '')
  FROM emp_jbr_cygnus_y9ihz.orden_venta ov
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(ov.origen_correo::jsonb) = 'array' THEN ov.origen_correo::jsonb
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS e(linea, n)
  WHERE ov.estado = 'borrador'
    AND (ov.created_at AT TIME ZONE 'America/Cancun')::date >= p_fecha_inicio
    AND (ov.created_at AT TIME ZONE 'America/Cancun')::date <= p_fecha_fin
  ORDER BY ov.created_at, ov.codigo, e.n
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_detalle_borradores(date, date)
  TO service_role, authenticator, anon, authenticated;

-- Las órdenes importadas de prueba también viven en public.
CREATE INDEX IF NOT EXISTS idx_orden_venta_borrador_llegada
  ON public.orden_venta (created_at)
  WHERE estado = 'borrador';

DROP FUNCTION IF EXISTS public.get_borradores(date, date);
DROP FUNCTION IF EXISTS public.get_detalle_borradores(date, date);

CREATE OR REPLACE FUNCTION public.get_borradores(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  fecha_pedido date,
  fecha_llegada date,
  comprador text,
  orden_compra text,
  orden_compra_hotel text,
  centro_consumo text,
  cantidad numeric,
  venta_total numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ov.codigo::text,
    COALESCE(ov.fecha_pedido, CASE WHEN btrim(COALESCE(ov.fecha_entrega, '')) ~ '^\d{4}-\d{2}-\d{2}' THEN left(btrim(ov.fecha_entrega), 10)::date WHEN btrim(COALESCE(ov.fecha_entrega, '')) ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN to_date(btrim(ov.fecha_entrega), 'DD/MM/YYYY') ELSE NULL::date END, (ov.created_at AT TIME ZONE 'America/Cancun')::date),
    ov.fecha_pedido::date,
    (ov.created_at AT TIME ZONE 'America/Cancun')::date,
    (
      array_agg(NULLIF(src.linea->>'Nombre cliente', '') ORDER BY src.n)
      FILTER (WHERE NULLIF(src.linea->>'Nombre cliente', '') IS NOT NULL)
    )[1],
    (
      array_agg(NULLIF(src.linea->>'Numero pedido', '') ORDER BY src.n)
      FILTER (WHERE NULLIF(src.linea->>'Numero pedido', '') IS NOT NULL)
    )[1],
    NULLIF(btrim(ov.orden_compra_hotel), ''),
    NULLIF(btrim(ov.centro_consumo), ''),
    COALESCE(SUM(src.cantidad), 0)::numeric,
    COALESCE(SUM(src.cantidad * src.precio), 0)::numeric
  FROM public.orden_venta ov
  LEFT JOIN LATERAL (
    SELECT
      e.linea,
      e.n,
      CASE
        WHEN jsonb_typeof(e.linea->'Cantidad') = 'number' THEN (e.linea->>'Cantidad')::numeric
        WHEN COALESCE(e.linea->>'Cantidad', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Cantidad')::numeric
        ELSE NULL
      END AS cantidad,
      CASE
        WHEN jsonb_typeof(e.linea->'Precio') = 'number' THEN (e.linea->>'Precio')::numeric
        WHEN COALESCE(e.linea->>'Precio', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Precio')::numeric
        ELSE NULL
      END AS precio
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(ov.origen_correo::jsonb) = 'array' THEN ov.origen_correo::jsonb
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS e(linea, n)
  ) src ON true
  WHERE ov.estado = 'borrador'
    AND (ov.created_at AT TIME ZONE 'America/Cancun')::date >= p_fecha_inicio
    AND (ov.created_at AT TIME ZONE 'America/Cancun')::date <= p_fecha_fin
  GROUP BY ov.codigo, ov.fecha_pedido, ov.fecha_entrega, ov.created_at, ov.orden_compra_hotel, ov.centro_consumo
  ORDER BY ov.created_at, ov.codigo
$$;

GRANT EXECUTE ON FUNCTION public.get_borradores(date, date)
  TO service_role, authenticator, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_detalle_borradores(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  numero_orden text,
  fecha date,
  fecha_pedido date,
  fecha_llegada date,
  nombre_cliente text,
  numero_pedido text,
  producto text,
  nombre_producto text,
  codigo_producto text,
  cantidad numeric,
  unidad text,
  precio numeric,
  venta_total numeric,
  almacen text,
  orden_compra_hotel text,
  centro_consumo text,
  referencia_pedido text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ov.codigo::text,
    COALESCE(ov.fecha_pedido, CASE WHEN btrim(COALESCE(ov.fecha_entrega, '')) ~ '^\d{4}-\d{2}-\d{2}' THEN left(btrim(ov.fecha_entrega), 10)::date WHEN btrim(COALESCE(ov.fecha_entrega, '')) ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN to_date(btrim(ov.fecha_entrega), 'DD/MM/YYYY') ELSE NULL::date END, (ov.created_at AT TIME ZONE 'America/Cancun')::date),
    ov.fecha_pedido::date,
    (ov.created_at AT TIME ZONE 'America/Cancun')::date,
    NULLIF(e.linea->>'Nombre cliente', ''),
    NULLIF(e.linea->>'Numero pedido', ''),
    NULLIF(e.linea->>'Producto', ''),
    NULLIF(e.linea->>'Producto', ''),
    NULLIF(e.linea->>'Codigo producto', ''),
    CASE
      WHEN jsonb_typeof(e.linea->'Cantidad') = 'number' THEN (e.linea->>'Cantidad')::numeric
      WHEN COALESCE(e.linea->>'Cantidad', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Cantidad')::numeric
      ELSE NULL
    END,
    NULLIF(e.linea->>'Unidad', ''),
    CASE
      WHEN jsonb_typeof(e.linea->'Precio') = 'number' THEN (e.linea->>'Precio')::numeric
      WHEN COALESCE(e.linea->>'Precio', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Precio')::numeric
      ELSE NULL
    END,
    (
      CASE
        WHEN jsonb_typeof(e.linea->'Cantidad') = 'number' THEN (e.linea->>'Cantidad')::numeric
        WHEN COALESCE(e.linea->>'Cantidad', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Cantidad')::numeric
        ELSE NULL
      END
      *
      CASE
        WHEN jsonb_typeof(e.linea->'Precio') = 'number' THEN (e.linea->>'Precio')::numeric
        WHEN COALESCE(e.linea->>'Precio', '') ~ '^-?[0-9]+([.][0-9]+)?$' THEN (e.linea->>'Precio')::numeric
        ELSE NULL
      END
    ),
    NULLIF(e.linea->>'Almacen', ''),
    NULLIF(btrim(ov.orden_compra_hotel), ''),
    NULLIF(btrim(ov.centro_consumo), ''),
    NULLIF(e.linea->>'Referencia pedido', '')
  FROM public.orden_venta ov
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(ov.origen_correo::jsonb) = 'array' THEN ov.origen_correo::jsonb
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS e(linea, n)
  WHERE ov.estado = 'borrador'
    AND (ov.created_at AT TIME ZONE 'America/Cancun')::date >= p_fecha_inicio
    AND (ov.created_at AT TIME ZONE 'America/Cancun')::date <= p_fecha_fin
  ORDER BY ov.created_at, ov.codigo, e.n
$$;

GRANT EXECUTE ON FUNCTION public.get_detalle_borradores(date, date)
  TO service_role, authenticator, anon, authenticated;

NOTIFY pgrst, 'reload schema';
