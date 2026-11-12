-- Una fila por orden de venta del rango.
-- La fecha de entrega ilegible no entra. La lee fecha_iso_segura, definida en get_operacion_ordenes.sql.
-- p_fecha elige el corte: entrega (default), pedido o creacion.
-- La cancelada no entra. total_rango es el conteo del periodo, antes del límite.
-- cantidad cuenta las filas del correo. Si el correo no trae filas, cuenta las líneas guardadas.

DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_listado_ordenes(date, date, integer, integer);
DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_listado_ordenes(date, date, integer, integer, text);
DROP FUNCTION IF EXISTS public.get_listado_ordenes(date, date, integer, integer);
DROP FUNCTION IF EXISTS public.get_listado_ordenes(date, date, integer, integer, text);

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.cantidad_ot_orden(p_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(COALESCE((
    SELECT CASE
      WHEN jsonb_typeof(ov.origen_correo) = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(ov.origen_correo) elemento
          WHERE NULLIF(btrim(elemento->>'Almacen'), '') IS NOT NULL
        )
      THEN (
        SELECT COUNT(DISTINCT NULLIF(btrim(elemento->>'Almacen'), ''))
        FROM jsonb_array_elements(ov.origen_correo) elemento
      )
      ELSE (
        SELECT COUNT(DISTINCT ot.codigo)
        FROM emp_jbr_cygnus_y9ihz.orden_trabajo ot
        WHERE ot.id_orden_venta = ov.id_orden_venta
      )
    END
    FROM emp_jbr_cygnus_y9ihz.orden_venta ov
    WHERE ov.id_orden_venta = p_id
  ), 0), 1)
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.cantidad_ot_orden(uuid)
  TO service_role, authenticator, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cantidad_ot_orden(p_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(COALESCE((
    SELECT CASE
      WHEN jsonb_typeof(ov.origen_correo) = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(ov.origen_correo) elemento
          WHERE NULLIF(btrim(elemento->>'Almacen'), '') IS NOT NULL
        )
      THEN (
        SELECT COUNT(DISTINCT NULLIF(btrim(elemento->>'Almacen'), ''))
        FROM jsonb_array_elements(ov.origen_correo) elemento
      )
      ELSE (
        SELECT COUNT(DISTINCT ot.codigo)
        FROM public.orden_trabajo ot
        WHERE ot.id_orden_venta = ov.id_orden_venta
      )
    END
    FROM public.orden_venta ov
    WHERE ov.id_orden_venta = p_id
  ), 0), 1)
$$;

GRANT EXECUTE ON FUNCTION public.cantidad_ot_orden(uuid)
  TO service_role, authenticator, anon, authenticated;

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_listado_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date,
  p_desde integer DEFAULT 0,
  p_limite integer DEFAULT 1000,
  p_fecha text DEFAULT 'entrega'
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
  ordenes_trabajo bigint,
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
    CASE
      WHEN jsonb_typeof(ov.origen_correo) = 'array' AND jsonb_array_length(ov.origen_correo) > 0
        THEN jsonb_array_length(ov.origen_correo)::numeric
      ELSE COUNT(l.id_linea_orden_venta)::numeric
    END,
    COALESCE(SUM(
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)
    ), 0),
    to_char(ov.created_at AT TIME ZONE 'America/Cancun', 'YYYY-MM-DD HH24:MI:SS'),
    emp_jbr_cygnus_y9ihz.cantidad_ot_orden(ov.id_orden_venta),
    COUNT(*) OVER ()
  FROM emp_jbr_cygnus_y9ihz.orden_venta ov
  LEFT JOIN emp_jbr_cygnus_y9ihz.comprador c ON c.id_comprador = ov.id_comprador
  LEFT JOIN emp_jbr_cygnus_y9ihz.orden_venta_linea l ON l.id_orden_venta = ov.id_orden_venta
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
          COALESCE(emp_jbr_cygnus_y9ihz.fecha_iso_segura(ov.fecha_entrega) BETWEEN p_fecha_inicio AND p_fecha_fin, false)
      END
    )
  GROUP BY ov.id_orden_venta, ov.codigo, ov.fecha_pedido, ov.fecha_entrega, ov.estado,
    c.nombre, ov.centro_consumo, ov.orden_compra_hotel, ov.created_at, ov.origen_correo
  ORDER BY ov.fecha_pedido DESC, ov.codigo DESC
  OFFSET GREATEST(COALESCE(p_desde, 0), 0)
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 1000)
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_listado_ordenes(date, date, integer, integer, text)
  TO service_role, authenticator, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_listado_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date,
  p_desde integer DEFAULT 0,
  p_limite integer DEFAULT 1000,
  p_fecha text DEFAULT 'entrega'
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
  ordenes_trabajo bigint,
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
    CASE
      WHEN jsonb_typeof(ov.origen_correo) = 'array' AND jsonb_array_length(ov.origen_correo) > 0
        THEN jsonb_array_length(ov.origen_correo)::numeric
      ELSE COUNT(l.id_linea_orden_venta)::numeric
    END,
    COALESCE(SUM(
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) * COALESCE(l.precio_unitario, 0)
    ), 0),
    to_char(ov.created_at AT TIME ZONE 'America/Cancun', 'YYYY-MM-DD HH24:MI:SS'),
    public.cantidad_ot_orden(ov.id_orden_venta),
    COUNT(*) OVER ()
  FROM public.orden_venta ov
  LEFT JOIN public.comprador c ON c.id_comprador = ov.id_comprador
  LEFT JOIN public.orden_venta_linea l ON l.id_orden_venta = ov.id_orden_venta
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
          COALESCE(public.fecha_iso_segura(ov.fecha_entrega) BETWEEN p_fecha_inicio AND p_fecha_fin, false)
      END
    )
  GROUP BY ov.id_orden_venta, ov.codigo, ov.fecha_pedido, ov.fecha_entrega, ov.estado,
    c.nombre, ov.centro_consumo, ov.orden_compra_hotel, ov.created_at, ov.origen_correo
  ORDER BY ov.fecha_pedido DESC, ov.codigo DESC
  OFFSET GREATEST(COALESCE(p_desde, 0), 0)
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 1000), 1), 1000)
$$;

GRANT EXECUTE ON FUNCTION public.get_listado_ordenes(date, date, integer, integer, text)
  TO service_role, authenticator, anon, authenticated;

NOTIFY pgrst, 'reload schema';
