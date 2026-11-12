-- Reporte de operación.
-- Un recorrido de orden_venta y uno de sus líneas.
-- Comprador, coincidencia y sustituciones salen de comprador y pedido.
-- La bitácora es auditoria_operacion, unida por la orden del rango.
-- SLA provisional, quemado en 1 día. Ver el bloque "etapa".
-- Ciclo por etapa, límites quemados: 60 min, 60 min y 2 h. Ver el bloque "ciclo".
-- Pegar en el SQL Editor y correr todo de una vez.
-- p_horas y el rango son opcionales. p_fecha elige el corte: entrega (default), pedido o creacion.
-- Una fecha de entrega ilegible no entra en el corte de entrega. La lee fecha_iso_segura.

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.fecha_iso_segura(valor text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN left(btrim(valor), 10)::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.fecha_iso_segura(text)
  TO service_role, authenticator, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fecha_iso_segura(valor text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN left(btrim(valor), 10)::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fecha_iso_segura(text)
  TO service_role, authenticator, anon, authenticated;

DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_operacion_ordenes(date, date);
DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_operacion_ordenes(date, date, integer);
DROP FUNCTION IF EXISTS emp_jbr_cygnus_y9ihz.get_operacion_ordenes(date, date, integer, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.get_operacion_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date,
  p_horas integer DEFAULT NULL,
  p_hora_inicio timestamp with time zone DEFAULT NULL,
  p_hora_fin timestamp with time zone DEFAULT NULL,
  p_fecha text DEFAULT 'entrega'
)
RETURNS TABLE (
  seccion text,
  clave text,
  etiqueta text,
  ordenes bigint,
  cantidad numeric,
  importe numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET statement_timeout = '120s'
AS $$
  WITH ordenes AS MATERIALIZED (
    SELECT
      ov.id_orden_venta,
      COALESCE(NULLIF(btrim(ov.estado::text), ''), 'sin estado') AS estado,
      ov.fecha_pedido::date AS fecha,
      COALESCE(NULLIF(btrim(ov.centro_consumo), ''), 'Sin centro') AS centro,
      ov.id_comprador,
      ov.estado_desde
    FROM emp_jbr_cygnus_y9ihz.orden_venta ov
    WHERE ov.estado IS DISTINCT FROM 'cancelada'
      AND (
        CASE
          WHEN p_hora_inicio IS NOT NULL AND p_hora_fin IS NOT NULL THEN
            ov.created_at >= p_hora_inicio AND ov.created_at <= p_hora_fin
          WHEN p_horas IS NOT NULL AND p_horas > 0 THEN
            ov.created_at >= now() - make_interval(hours => LEAST(p_horas, 168))
            AND ov.created_at <= now()
          WHEN lower(btrim(COALESCE(p_fecha, 'entrega'))) = 'creacion' THEN
            (ov.created_at AT TIME ZONE 'America/Cancun')::date >= p_fecha_inicio
            AND (ov.created_at AT TIME ZONE 'America/Cancun')::date < (p_fecha_fin + 1)
          WHEN lower(btrim(p_fecha)) = 'pedido' THEN
            ov.fecha_pedido >= p_fecha_inicio
            AND ov.fecha_pedido < (p_fecha_fin + 1)
          ELSE
            COALESCE(emp_jbr_cygnus_y9ihz.fecha_iso_segura(ov.fecha_entrega) BETWEEN p_fecha_inicio AND p_fecha_fin, false)
        END
      )
  ),
  lineas AS MATERIALIZED (
    SELECT
      l.id_orden_venta,
      l.id_producto,
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) AS cantidad,
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0)
        * COALESCE(l.precio_unitario, 0) AS importe
    FROM ordenes o
    INNER JOIN emp_jbr_cygnus_y9ihz.orden_venta_linea l
      ON l.id_orden_venta = o.id_orden_venta
  ),
  por_orden AS MATERIALIZED (
    SELECT
      o.id_orden_venta,
      o.estado,
      o.fecha,
      o.centro,
      o.id_comprador,
      o.estado_desde,
      COALESCE(SUM(l.cantidad), 0) AS cantidad,
      COALESCE(SUM(l.importe), 0) AS importe
    FROM ordenes o
    LEFT JOIN lineas l ON l.id_orden_venta = o.id_orden_venta
    GROUP BY o.id_orden_venta, o.estado, o.fecha, o.centro, o.id_comprador, o.estado_desde
  ),
  top_productos AS MATERIALIZED (
    SELECT
      l.id_producto,
      COUNT(DISTINCT l.id_orden_venta)::bigint AS ordenes,
      SUM(l.cantidad) AS cantidad,
      SUM(l.importe) AS importe
    FROM lineas l
    GROUP BY l.id_producto
    ORDER BY SUM(l.cantidad) DESC
    LIMIT 15
  ),
  pedidos AS MATERIALIZED (
    SELECT
      pe.id_orden_venta,
      pe.id_producto_sugerido,
      pe.id_producto_digitado,
      NULLIF(btrim(pe.nombre_sugerido), '') AS nombre_sugerido,
      NULLIF(btrim(pe.nombre_digitado), '') AS nombre_digitado,
      NULLIF(btrim(pe.producto), '') AS texto,
      CASE
        WHEN pe.id_producto_sugerido IS NOT NULL AND pe.id_producto_digitado IS NULL THEN 'sin_eleccion'
        WHEN pe.id_producto_sugerido IS NOT NULL
         AND pe.id_producto_digitado IS NOT DISTINCT FROM pe.id_producto_sugerido THEN 'mantuvo'
        WHEN pe.id_producto_sugerido IS NOT NULL
         AND pe.id_producto_digitado IS DISTINCT FROM pe.id_producto_sugerido THEN 'cambio'
        WHEN pe.id_producto_sugerido IS NULL AND NULLIF(btrim(pe.producto), '') IS NOT NULL THEN 'sin_coincidencia'
        ELSE 'sin_dato'
      END AS clase,
      (pe.created_at AT TIME ZONE 'America/Cancun')::date AS fecha
    FROM emp_jbr_cygnus_y9ihz.pedido pe
    INNER JOIN ordenes o ON o.id_orden_venta = pe.id_orden_venta
  ),
  eventos AS MATERIALIZED (
    SELECT
      o.id_orden_venta,
      a.accion,
      a.created_at,
      COALESCE(a.payload->>'tipo', '') AS tipo,
      COALESCE(a.payload->>'estadoNuevo', '') AS estado_nuevo,
      NULLIF(btrim(a.payload->>'autorNombre'), '') AS autor
    FROM ordenes o
    INNER JOIN emp_jbr_cygnus_y9ihz.auditoria_operacion a
      ON a.entidad = 'orden_venta'
     AND a.entidad_id = o.id_orden_venta
  ),
  marcas AS MATERIALIZED (
    SELECT
      e.id_orden_venta,
      MIN(e.created_at) FILTER (WHERE e.accion = 'creacion') AS entro,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'confirmada'
      ) AS confirmo,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'alistamiento'
      ) AS alisto,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'alistada'
      ) AS alisto_fin,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'revisada'
      ) AS reviso,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'despachada'
      ) AS despacho,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'facturada'
      ) AS facturo
    FROM eventos e
    GROUP BY e.id_orden_venta
  ),
  tramos_cierre AS MATERIALIZED (
    -- 3 Alistada, 4 Revisada, 5 Despachada, 6 Facturada.
    -- Minutos desde la marca anterior hasta quedar en ese estado. Sin límite.
    SELECT
      cierre.etapa,
      EXTRACT(EPOCH FROM (cierre.llego - previa.marca)) / 60.0 AS minutos,
      (cierre.llego AT TIME ZONE 'America/Cancun')::date AS fecha
    FROM marcas m
    CROSS JOIN LATERAL (
      VALUES
        ('3'::text, m.alisto_fin),
        ('4'::text, m.reviso),
        ('5'::text, m.despacho),
        ('6'::text, m.facturo)
    ) AS cierre(etapa, llego)
    CROSS JOIN LATERAL (
      SELECT MAX(marca) AS marca
      FROM (
        VALUES (m.entro), (m.confirmo), (m.alisto), (m.alisto_fin), (m.reviso), (m.despacho)
      ) AS previas(marca)
      WHERE marca IS NOT NULL AND cierre.llego IS NOT NULL AND marca < cierre.llego
    ) AS previa
    WHERE cierre.llego IS NOT NULL AND previa.marca IS NOT NULL
  ),
  duraciones AS MATERIALIZED (
    -- Límites quemados, en minutos: Por confirmar 60, Confirmada 60, Alistamiento 120.
    -- Igual que LIMITES_CICLO en src/components/ReporteOperacionTablero.js.
    -- Luego estos tres números salen de una tabla de parámetros.
    -- 0: desde que entró hasta que pasó a confirmada.
    -- 1: desde confirmada hasta alistamiento.
    -- 2: desde alistamiento hasta quedar alistada.
    SELECT '0'::text AS etapa, EXTRACT(EPOCH FROM (m.confirmo - m.entro)) / 60.0 AS minutos
    FROM marcas m
    WHERE m.entro IS NOT NULL AND m.confirmo IS NOT NULL AND m.confirmo >= m.entro
    UNION ALL
    SELECT '1'::text, EXTRACT(EPOCH FROM (m.alisto - m.confirmo)) / 60.0
    FROM marcas m
    WHERE m.confirmo IS NOT NULL AND m.alisto IS NOT NULL AND m.alisto >= m.confirmo
    UNION ALL
    SELECT '2'::text, EXTRACT(EPOCH FROM (p.estado_desde - m.alisto)) / 60.0
    FROM marcas m
    INNER JOIN por_orden p ON p.id_orden_venta = m.id_orden_venta
    WHERE m.alisto IS NOT NULL
      AND p.estado = 'alistada'
      AND p.estado_desde IS NOT NULL
      AND p.estado_desde >= m.alisto
    UNION ALL
    SELECT t.etapa, t.minutos
    FROM tramos_cierre t
  )
  SELECT
    CASE
      WHEN GROUPING(p.estado) = 0 THEN 'estado'
      WHEN GROUPING(p.centro) = 0 THEN 'centro'
      WHEN GROUPING(p.fecha) = 0 THEN 'dia'
      ELSE 'resumen'
    END,
    CASE
      WHEN GROUPING(p.estado) = 0 THEN p.estado
      WHEN GROUPING(p.centro) = 0 THEN p.centro
      WHEN GROUPING(p.fecha) = 0 THEN p.fecha::text
      ELSE 'total'
    END,
    CASE
      WHEN GROUPING(p.estado) = 0 THEN
        CASE p.estado
          WHEN 'por_confirmar' THEN 'Por confirmar'
          WHEN 'confirmada' THEN 'Confirmada'
          WHEN 'alistamiento' THEN 'Alistamiento'
          WHEN 'alistada' THEN 'Alistada'
          WHEN 'revisada' THEN 'Revisada'
          WHEN 'despachada' THEN 'Despachada'
          WHEN 'facturada' THEN 'Facturada'
          ELSE p.estado
        END
      WHEN GROUPING(p.centro) = 0 THEN p.centro
      WHEN GROUPING(p.fecha) = 0 THEN p.fecha::text
      ELSE 'Total'
    END,
    COUNT(*)::bigint,
    COALESCE(SUM(p.cantidad), 0)::numeric,
    COALESCE(SUM(p.importe), 0)::numeric
  FROM por_orden p
  GROUP BY GROUPING SETS ((), (p.estado), (p.centro), (p.fecha))
  UNION ALL
  SELECT
    'producto'::text,
    COALESCE(pr.sku, tp.id_producto::text, 'sin-producto'),
    COALESCE(pr.descripcion, 'Sin producto en catálogo'),
    tp.ordenes,
    COALESCE(tp.cantidad, 0)::numeric,
    COALESCE(tp.importe, 0)::numeric
  FROM top_productos tp
  LEFT JOIN emp_jbr_cygnus_y9ihz.producto pr ON pr.id_producto = tp.id_producto
  UNION ALL
  SELECT *
  FROM (
    SELECT
      'comprador'::text,
      COALESCE(c.id_comprador::text, 'sin-comprador'),
      COALESCE(NULLIF(btrim(c.nombre), ''), 'Sin comprador'),
      COUNT(*)::bigint,
      COALESCE(SUM(p.cantidad), 0)::numeric,
      COALESCE(SUM(p.importe), 0)::numeric
    FROM por_orden p
    LEFT JOIN emp_jbr_cygnus_y9ihz.comprador c ON c.id_comprador = p.id_comprador
    GROUP BY c.id_comprador, c.nombre
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ) compradores
  UNION ALL
  SELECT
    'coincidencia'::text,
    pe.clase,
    CASE pe.clase
      WHEN 'mantuvo' THEN 'Coincidió'
      WHEN 'cambio' THEN 'La persona lo cambió'
      WHEN 'sin_coincidencia' THEN 'Sin coincidencia'
      WHEN 'sin_eleccion' THEN 'Sugirió y no quedó producto'
      ELSE 'Sin dato'
    END,
    COUNT(DISTINCT pe.id_orden_venta)::bigint,
    COUNT(*)::numeric,
    0::numeric
  FROM pedidos pe
  GROUP BY pe.clase
  UNION ALL
  SELECT *
  FROM (
    SELECT
      'sustitucion'::text,
      left(COALESCE(pe.nombre_sugerido, 'Sin sugerencia') || ' → ' || COALESCE(pe.nombre_digitado, 'Sin producto'), 180),
      left(COALESCE(pe.nombre_sugerido, 'Sin sugerencia') || ' → ' || COALESCE(pe.nombre_digitado, 'Sin producto'), 180),
      COUNT(*)::bigint,
      COUNT(*)::numeric,
      0::numeric
    FROM pedidos pe
    WHERE pe.clase = 'cambio'
    GROUP BY 2, 3
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ) sustituciones
  UNION ALL
  SELECT
    'edad'::text,
    CASE
      WHEN p.estado_desde IS NULL THEN '4'
      WHEN p.estado_desde >= now() - interval '1 day' THEN '0'
      WHEN p.estado_desde >= now() - interval '3 day' THEN '1'
      WHEN p.estado_desde >= now() - interval '7 day' THEN '2'
      ELSE '3'
    END,
    CASE
      WHEN p.estado_desde IS NULL THEN 'Sin marca de tiempo'
      WHEN p.estado_desde >= now() - interval '1 day' THEN '0 a 1 día'
      WHEN p.estado_desde >= now() - interval '3 day' THEN '2 a 3 días'
      WHEN p.estado_desde >= now() - interval '7 day' THEN '4 a 7 días'
      ELSE '8 días o más'
    END,
    COUNT(*)::bigint,
    COALESCE(SUM(p.cantidad), 0)::numeric,
    COALESCE(SUM(p.importe), 0)::numeric
  FROM por_orden p
  WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento')
  GROUP BY 2, 3
  UNION ALL
  SELECT
    'evento'::text,
    e.clave,
    e.etiqueta,
    COUNT(DISTINCT e.id_orden_venta)::bigint,
    COUNT(*)::numeric,
    0::numeric
  FROM (
    SELECT
      id_orden_venta,
      CASE
        WHEN accion = 'creacion' THEN 'ingreso'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'confirmada' THEN 'confirmada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'alistamiento' THEN 'alistamiento'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'revisada' THEN 'revisada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'despachada' THEN 'despachada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'facturada' THEN 'facturada'
        WHEN accion = 'cambio_estado' THEN 'otro_estado'
        WHEN tipo = 'impresion_pdf_auto' THEN 'impresion_auto'
        WHEN tipo = 'impresion_pdf' THEN 'impresion'
        WHEN tipo = 'foto_surtido' THEN 'foto'
        WHEN tipo = 'estado_alistamiento' THEN 'marca_alistamiento'
        ELSE 'otro'
      END AS clave,
      CASE
        WHEN accion = 'creacion' THEN 'Pedido ingresado'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'confirmada' THEN 'Pasó a confirmada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'alistamiento' THEN 'Pasó a alistamiento'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'revisada' THEN 'Pasó a revisada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'despachada' THEN 'Pasó a despachada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'facturada' THEN 'Pasó a facturada'
        WHEN accion = 'cambio_estado' THEN 'Cambió de estado'
        WHEN tipo = 'impresion_pdf_auto' THEN 'Impresión automática'
        WHEN tipo = 'impresion_pdf' THEN 'Impresión'
        WHEN tipo = 'foto_surtido' THEN 'Foto de surtido'
        WHEN tipo = 'estado_alistamiento' THEN 'Marca de alistamiento'
        ELSE 'Otro movimiento'
      END AS etiqueta
    FROM eventos
  ) e
  GROUP BY e.clave, e.etiqueta
  UNION ALL
  SELECT
    'hora'::text,
    lpad(h.hora::text, 2, '0'),
    lpad(h.hora::text, 2, '0') || ':00',
    COUNT(DISTINCT ev.id_orden_venta)::bigint,
    COUNT(ev.id_orden_venta)::numeric,
    0::numeric
  FROM generate_series(0, 23) AS h(hora)
  LEFT JOIN (
    SELECT
      id_orden_venta,
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Cancun')::int AS hora
    FROM eventos
  ) ev ON ev.hora = h.hora
  GROUP BY h.hora
  UNION ALL
  SELECT
    'confirmacion'::text,
    m.clave,
    m.etiqueta,
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM (
    SELECT
      CASE
        WHEN confirmo IS NULL THEN '5'
        WHEN confirmo < entro THEN '6'
        WHEN confirmo - entro < interval '1 hour' THEN '0'
        WHEN confirmo - entro < interval '4 hour' THEN '1'
        WHEN confirmo - entro < interval '12 hour' THEN '2'
        WHEN confirmo - entro < interval '24 hour' THEN '3'
        ELSE '4'
      END AS clave,
      CASE
        WHEN confirmo IS NULL THEN 'Entró y no quedó confirmada'
        WHEN confirmo < entro THEN 'La confirmación quedó antes del ingreso'
        WHEN confirmo - entro < interval '1 hour' THEN 'Menos de 1 hora'
        WHEN confirmo - entro < interval '4 hour' THEN '1 a 4 horas'
        WHEN confirmo - entro < interval '12 hour' THEN '4 a 12 horas'
        WHEN confirmo - entro < interval '24 hour' THEN '12 a 24 horas'
        ELSE 'Más de 1 día'
      END AS etiqueta
    FROM marcas
    WHERE entro IS NOT NULL
    UNION ALL
    SELECT
      '7'::text,
      'Confirmada sin hora de entrada'::text
    FROM marcas
    WHERE entro IS NULL AND confirmo IS NOT NULL
  ) m
  GROUP BY m.clave, m.etiqueta
  -- SLA provisional. El 1 está quemado a propósito.
  -- Una orden abierta está en tiempo si hoy, en America/Cancun, menos la fecha
  -- de pedido es de 1 día como máximo. Si la diferencia es mayor, está atrasada.
  -- Alistada, revisada, despachada y facturada salen como cerradas y no se parten.
  -- Mantener este 1 igual que SLA_DIAS en src/components/ReporteOperacionTablero.js.
  -- El siguiente paso es leer ese día desde una tabla de parámetros.
  UNION ALL
  SELECT
    'etapa'::text,
    CASE p.estado
      WHEN 'por_confirmar' THEN '0'
      WHEN 'confirmada' THEN '1'
      WHEN 'alistamiento' THEN '2'
      WHEN 'alistada' THEN '3'
      WHEN 'revisada' THEN '4'
      WHEN 'despachada' THEN '5'
      WHEN 'facturada' THEN '6'
    END,
    CASE
      WHEN p.estado IN ('alistada', 'revisada', 'despachada', 'facturada') THEN 'cerrada'
      WHEN (timezone('America/Cancun', now()))::date - p.fecha <= 1 THEN 'en_tiempo'
      ELSE 'atrasada'
    END,
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM por_orden p
  WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento', 'alistada', 'revisada', 'despachada', 'facturada')
  GROUP BY 2, 3
  UNION ALL
  SELECT
    'ciclo'::text,
    d.etapa,
    CASE
      WHEN d.minutos <= 15 THEN '015'
      WHEN d.minutos <= 30 THEN '030'
      WHEN d.minutos <= 45 THEN '045'
      WHEN d.minutos <= 60 THEN '060'
      WHEN d.minutos <= 120 THEN '120'
      WHEN d.minutos <= 240 THEN '240'
      WHEN d.minutos <= 480 THEN '480'
      WHEN d.minutos <= 720 THEN '720'
      ELSE '721'
    END,
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM duraciones d
  GROUP BY 2, 3
  UNION ALL
  SELECT
    'ciclo'::text,
    d.etapa,
    'mediana'::text,
    COUNT(*)::bigint,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY d.minutos)::numeric,
    percentile_cont(0.9) WITHIN GROUP (ORDER BY d.minutos)::numeric
  FROM duraciones d
  GROUP BY d.etapa
  UNION ALL
  SELECT
    'ciclo'::text,
    d.etapa,
    'cumple'::text,
    COUNT(*) FILTER (
      WHERE (d.etapa IN ('0', '1') AND d.minutos <= 60)
         OR (d.etapa = '2' AND d.minutos <= 120)
    )::bigint,
    AVG(d.minutos)::numeric,
    0::numeric
  FROM duraciones d
  GROUP BY d.etapa
  UNION ALL
  SELECT
    'actor'::text,
    a.clase,
    a.etiqueta,
    COUNT(*)::bigint,
    COUNT(*)::numeric,
    0::numeric
  FROM (
    SELECT
      e.id_orden_venta,
      CASE
        WHEN bool_or(e.autor IS NOT NULL AND lower(e.autor) !~ '(mateo|sistema|api|auto)') THEN 'persona'
        WHEN bool_or(e.autor IS NOT NULL) THEN 'sistema'
        ELSE 'sin_nombre'
      END AS clase,
      CASE
        WHEN bool_or(e.autor IS NOT NULL AND lower(e.autor) !~ '(mateo|sistema|api|auto)') THEN 'Persona'
        WHEN bool_or(e.autor IS NOT NULL) THEN 'Sistema'
        ELSE 'Sin nombre'
      END AS etiqueta
    FROM eventos e
    GROUP BY e.id_orden_venta
  ) a
  GROUP BY a.clase, a.etiqueta
  UNION ALL
  SELECT
    'correccion'::text,
    p.fecha::text,
    p.fecha::text,
    COUNT(*)::bigint,
    COUNT(DISTINCT p.id_orden_venta)::numeric,
    0::numeric
  FROM pedidos p
  WHERE p.clase = 'cambio'
    AND p.fecha IS NOT NULL
  GROUP BY p.fecha
  UNION ALL
  SELECT
    'atraso_hora'::text,
    lpad(h.hora::text, 2, '0'),
    lpad(h.hora::text, 2, '0') || ':00',
    COUNT(ev.id_orden_venta)::bigint,
    COUNT(ev.id_orden_venta)::numeric,
    0::numeric
  FROM generate_series(0, 23) AS h(hora)
  LEFT JOIN (
    SELECT
      p.id_orden_venta,
      EXTRACT(HOUR FROM MIN(e.created_at) AT TIME ZONE 'America/Cancun')::int AS hora
    FROM por_orden p
    INNER JOIN eventos e
      ON e.id_orden_venta = p.id_orden_venta
     AND e.accion = 'creacion'
    WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento')
      AND (timezone('America/Cancun', now()))::date - p.fecha > 1
    GROUP BY p.id_orden_venta
  ) ev ON ev.hora = h.hora
  GROUP BY h.hora
  UNION ALL
  SELECT
    'tendencia'::text,
    d.etapa,
    d.fecha::text,
    COUNT(*)::bigint,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY d.minutos)::numeric,
    0::numeric
  FROM (
    SELECT
      '0'::text AS etapa,
      EXTRACT(EPOCH FROM (m.confirmo - m.entro)) / 60.0 AS minutos,
      (m.confirmo AT TIME ZONE 'America/Cancun')::date AS fecha
    FROM marcas m
    WHERE m.entro IS NOT NULL AND m.confirmo IS NOT NULL AND m.confirmo >= m.entro
    UNION ALL
    SELECT
      '1'::text,
      EXTRACT(EPOCH FROM (m.alisto - m.confirmo)) / 60.0,
      (m.alisto AT TIME ZONE 'America/Cancun')::date
    FROM marcas m
    WHERE m.confirmo IS NOT NULL AND m.alisto IS NOT NULL AND m.alisto >= m.confirmo
    UNION ALL
    SELECT
      '2'::text,
      EXTRACT(EPOCH FROM (p.estado_desde - m.alisto)) / 60.0,
      (p.estado_desde AT TIME ZONE 'America/Cancun')::date
    FROM marcas m
    INNER JOIN por_orden p ON p.id_orden_venta = m.id_orden_venta
    WHERE m.alisto IS NOT NULL
      AND p.estado = 'alistada'
      AND p.estado_desde IS NOT NULL
      AND p.estado_desde >= m.alisto
    UNION ALL
    SELECT t.etapa, t.minutos, t.fecha
    FROM tramos_cierre t
  ) d
  GROUP BY d.etapa, d.fecha
  UNION ALL
  SELECT
    'reloj'::text,
    q.etapa,
    q.cubeta,
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM (
    SELECT
      CASE p.estado
        WHEN 'por_confirmar' THEN '0'
        WHEN 'confirmada' THEN '1'
        ELSE '2'
      END AS etapa,
      CASE
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 15 THEN '015'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 30 THEN '030'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 45 THEN '045'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 60 THEN '060'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 90 THEN '090'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 120 THEN '120'
        ELSE '121'
      END AS cubeta
    FROM por_orden p
    WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento')
      AND p.estado_desde IS NOT NULL
  ) q
  GROUP BY q.etapa, q.cubeta
  UNION ALL
  SELECT
    'rojo_hora'::text,
    r.etapa,
    lpad(EXTRACT(HOUR FROM r.cruce AT TIME ZONE 'America/Cancun')::int::text, 2, '0'),
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM (
    SELECT
      CASE p.estado
        WHEN 'por_confirmar' THEN '0'
        WHEN 'confirmada' THEN '1'
        WHEN 'alistamiento' THEN '2'
        WHEN 'alistada' THEN '3'
        WHEN 'revisada' THEN '4'
        WHEN 'despachada' THEN '5'
        WHEN 'facturada' THEN '6'
      END AS etapa,
      CASE p.estado
        WHEN 'alistamiento' THEN p.estado_desde + interval '120 minutes'
        WHEN 'por_confirmar' THEN p.estado_desde + interval '60 minutes'
        WHEN 'confirmada' THEN p.estado_desde + interval '60 minutes'
        ELSE p.estado_desde
      END AS cruce
    FROM por_orden p
    WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento', 'alistada', 'revisada', 'despachada', 'facturada')
      AND p.estado_desde IS NOT NULL
  ) r
  WHERE r.cruce <= now()
    AND (r.cruce AT TIME ZONE 'America/Cancun')::date BETWEEN p_fecha_inicio AND p_fecha_fin
  GROUP BY r.etapa, 3
$$;

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.get_operacion_ordenes(date, date, integer, timestamp with time zone, timestamp with time zone, text)
  TO service_role, authenticator, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_operacion_ordenes(date, date);
DROP FUNCTION IF EXISTS public.get_operacion_ordenes(date, date, integer);
DROP FUNCTION IF EXISTS public.get_operacion_ordenes(date, date, integer, timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_operacion_ordenes(
  p_fecha_inicio date,
  p_fecha_fin date,
  p_horas integer DEFAULT NULL,
  p_hora_inicio timestamp with time zone DEFAULT NULL,
  p_hora_fin timestamp with time zone DEFAULT NULL,
  p_fecha text DEFAULT 'entrega'
)
RETURNS TABLE (
  seccion text,
  clave text,
  etiqueta text,
  ordenes bigint,
  cantidad numeric,
  importe numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET statement_timeout = '120s'
AS $$
  WITH ordenes AS MATERIALIZED (
    SELECT
      ov.id_orden_venta,
      COALESCE(NULLIF(btrim(ov.estado::text), ''), 'sin estado') AS estado,
      ov.fecha_pedido::date AS fecha,
      COALESCE(NULLIF(btrim(ov.centro_consumo), ''), 'Sin centro') AS centro,
      ov.id_comprador,
      ov.estado_desde
    FROM public.orden_venta ov
    WHERE ov.estado IS DISTINCT FROM 'cancelada'
      AND (
        CASE
          WHEN p_hora_inicio IS NOT NULL AND p_hora_fin IS NOT NULL THEN
            ov.created_at >= p_hora_inicio AND ov.created_at <= p_hora_fin
          WHEN p_horas IS NOT NULL AND p_horas > 0 THEN
            ov.created_at >= now() - make_interval(hours => LEAST(p_horas, 168))
            AND ov.created_at <= now()
          WHEN lower(btrim(COALESCE(p_fecha, 'entrega'))) = 'creacion' THEN
            (ov.created_at AT TIME ZONE 'America/Cancun')::date >= p_fecha_inicio
            AND (ov.created_at AT TIME ZONE 'America/Cancun')::date < (p_fecha_fin + 1)
          WHEN lower(btrim(p_fecha)) = 'pedido' THEN
            ov.fecha_pedido >= p_fecha_inicio
            AND ov.fecha_pedido < (p_fecha_fin + 1)
          ELSE
            COALESCE(public.fecha_iso_segura(ov.fecha_entrega) BETWEEN p_fecha_inicio AND p_fecha_fin, false)
        END
      )
  ),
  lineas AS MATERIALIZED (
    SELECT
      l.id_orden_venta,
      l.id_producto,
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0) AS cantidad,
      COALESCE(NULLIF(l.cantidad_despachada, 0), l.cantidad_pedida, 0)
        * COALESCE(l.precio_unitario, 0) AS importe
    FROM ordenes o
    INNER JOIN public.orden_venta_linea l
      ON l.id_orden_venta = o.id_orden_venta
  ),
  por_orden AS MATERIALIZED (
    SELECT
      o.id_orden_venta,
      o.estado,
      o.fecha,
      o.centro,
      o.id_comprador,
      o.estado_desde,
      COALESCE(SUM(l.cantidad), 0) AS cantidad,
      COALESCE(SUM(l.importe), 0) AS importe
    FROM ordenes o
    LEFT JOIN lineas l ON l.id_orden_venta = o.id_orden_venta
    GROUP BY o.id_orden_venta, o.estado, o.fecha, o.centro, o.id_comprador, o.estado_desde
  ),
  top_productos AS MATERIALIZED (
    SELECT
      l.id_producto,
      COUNT(DISTINCT l.id_orden_venta)::bigint AS ordenes,
      SUM(l.cantidad) AS cantidad,
      SUM(l.importe) AS importe
    FROM lineas l
    GROUP BY l.id_producto
    ORDER BY SUM(l.cantidad) DESC
    LIMIT 15
  ),
  pedidos AS MATERIALIZED (
    SELECT
      pe.id_orden_venta,
      pe.id_producto_sugerido,
      pe.id_producto_digitado,
      NULLIF(btrim(pe.nombre_sugerido), '') AS nombre_sugerido,
      NULLIF(btrim(pe.nombre_digitado), '') AS nombre_digitado,
      NULLIF(btrim(pe.producto), '') AS texto,
      CASE
        WHEN pe.id_producto_sugerido IS NOT NULL AND pe.id_producto_digitado IS NULL THEN 'sin_eleccion'
        WHEN pe.id_producto_sugerido IS NOT NULL
         AND pe.id_producto_digitado IS NOT DISTINCT FROM pe.id_producto_sugerido THEN 'mantuvo'
        WHEN pe.id_producto_sugerido IS NOT NULL
         AND pe.id_producto_digitado IS DISTINCT FROM pe.id_producto_sugerido THEN 'cambio'
        WHEN pe.id_producto_sugerido IS NULL AND NULLIF(btrim(pe.producto), '') IS NOT NULL THEN 'sin_coincidencia'
        ELSE 'sin_dato'
      END AS clase,
      (pe.created_at AT TIME ZONE 'America/Cancun')::date AS fecha
    FROM public.pedido pe
    INNER JOIN ordenes o ON o.id_orden_venta = pe.id_orden_venta
  ),
  eventos AS MATERIALIZED (
    SELECT
      o.id_orden_venta,
      a.accion,
      a.created_at,
      COALESCE(a.payload->>'tipo', '') AS tipo,
      COALESCE(a.payload->>'estadoNuevo', '') AS estado_nuevo,
      NULLIF(btrim(a.payload->>'autorNombre'), '') AS autor
    FROM ordenes o
    INNER JOIN public.auditoria_operacion a
      ON a.entidad = 'orden_venta'
     AND a.entidad_id = o.id_orden_venta
  ),
  marcas AS MATERIALIZED (
    SELECT
      e.id_orden_venta,
      MIN(e.created_at) FILTER (WHERE e.accion = 'creacion') AS entro,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'confirmada'
      ) AS confirmo,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'alistamiento'
      ) AS alisto,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'alistada'
      ) AS alisto_fin,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'revisada'
      ) AS reviso,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'despachada'
      ) AS despacho,
      MIN(e.created_at) FILTER (
        WHERE e.accion = 'cambio_estado' AND e.estado_nuevo = 'facturada'
      ) AS facturo
    FROM eventos e
    GROUP BY e.id_orden_venta
  ),
  tramos_cierre AS MATERIALIZED (
    -- 3 Alistada, 4 Revisada, 5 Despachada, 6 Facturada.
    -- Minutos desde la marca anterior hasta quedar en ese estado. Sin límite.
    SELECT
      cierre.etapa,
      EXTRACT(EPOCH FROM (cierre.llego - previa.marca)) / 60.0 AS minutos,
      (cierre.llego AT TIME ZONE 'America/Cancun')::date AS fecha
    FROM marcas m
    CROSS JOIN LATERAL (
      VALUES
        ('3'::text, m.alisto_fin),
        ('4'::text, m.reviso),
        ('5'::text, m.despacho),
        ('6'::text, m.facturo)
    ) AS cierre(etapa, llego)
    CROSS JOIN LATERAL (
      SELECT MAX(marca) AS marca
      FROM (
        VALUES (m.entro), (m.confirmo), (m.alisto), (m.alisto_fin), (m.reviso), (m.despacho)
      ) AS previas(marca)
      WHERE marca IS NOT NULL AND cierre.llego IS NOT NULL AND marca < cierre.llego
    ) AS previa
    WHERE cierre.llego IS NOT NULL AND previa.marca IS NOT NULL
  ),
  duraciones AS MATERIALIZED (
    -- Límites quemados, en minutos: Por confirmar 60, Confirmada 60, Alistamiento 120.
    -- Igual que LIMITES_CICLO en src/components/ReporteOperacionTablero.js.
    -- Luego estos tres números salen de una tabla de parámetros.
    -- 0: desde que entró hasta que pasó a confirmada.
    -- 1: desde confirmada hasta alistamiento.
    -- 2: desde alistamiento hasta quedar alistada.
    SELECT '0'::text AS etapa, EXTRACT(EPOCH FROM (m.confirmo - m.entro)) / 60.0 AS minutos
    FROM marcas m
    WHERE m.entro IS NOT NULL AND m.confirmo IS NOT NULL AND m.confirmo >= m.entro
    UNION ALL
    SELECT '1'::text, EXTRACT(EPOCH FROM (m.alisto - m.confirmo)) / 60.0
    FROM marcas m
    WHERE m.confirmo IS NOT NULL AND m.alisto IS NOT NULL AND m.alisto >= m.confirmo
    UNION ALL
    SELECT '2'::text, EXTRACT(EPOCH FROM (p.estado_desde - m.alisto)) / 60.0
    FROM marcas m
    INNER JOIN por_orden p ON p.id_orden_venta = m.id_orden_venta
    WHERE m.alisto IS NOT NULL
      AND p.estado = 'alistada'
      AND p.estado_desde IS NOT NULL
      AND p.estado_desde >= m.alisto
    UNION ALL
    SELECT t.etapa, t.minutos
    FROM tramos_cierre t
  )
  SELECT
    CASE
      WHEN GROUPING(p.estado) = 0 THEN 'estado'
      WHEN GROUPING(p.centro) = 0 THEN 'centro'
      WHEN GROUPING(p.fecha) = 0 THEN 'dia'
      ELSE 'resumen'
    END,
    CASE
      WHEN GROUPING(p.estado) = 0 THEN p.estado
      WHEN GROUPING(p.centro) = 0 THEN p.centro
      WHEN GROUPING(p.fecha) = 0 THEN p.fecha::text
      ELSE 'total'
    END,
    CASE
      WHEN GROUPING(p.estado) = 0 THEN
        CASE p.estado
          WHEN 'por_confirmar' THEN 'Por confirmar'
          WHEN 'confirmada' THEN 'Confirmada'
          WHEN 'alistamiento' THEN 'Alistamiento'
          WHEN 'alistada' THEN 'Alistada'
          WHEN 'revisada' THEN 'Revisada'
          WHEN 'despachada' THEN 'Despachada'
          WHEN 'facturada' THEN 'Facturada'
          ELSE p.estado
        END
      WHEN GROUPING(p.centro) = 0 THEN p.centro
      WHEN GROUPING(p.fecha) = 0 THEN p.fecha::text
      ELSE 'Total'
    END,
    COUNT(*)::bigint,
    COALESCE(SUM(p.cantidad), 0)::numeric,
    COALESCE(SUM(p.importe), 0)::numeric
  FROM por_orden p
  GROUP BY GROUPING SETS ((), (p.estado), (p.centro), (p.fecha))
  UNION ALL
  SELECT
    'producto'::text,
    COALESCE(pr.sku, tp.id_producto::text, 'sin-producto'),
    COALESCE(pr.descripcion, 'Sin producto en catálogo'),
    tp.ordenes,
    COALESCE(tp.cantidad, 0)::numeric,
    COALESCE(tp.importe, 0)::numeric
  FROM top_productos tp
  LEFT JOIN public.producto pr ON pr.id_producto = tp.id_producto
  UNION ALL
  SELECT *
  FROM (
    SELECT
      'comprador'::text,
      COALESCE(c.id_comprador::text, 'sin-comprador'),
      COALESCE(NULLIF(btrim(c.nombre), ''), 'Sin comprador'),
      COUNT(*)::bigint,
      COALESCE(SUM(p.cantidad), 0)::numeric,
      COALESCE(SUM(p.importe), 0)::numeric
    FROM por_orden p
    LEFT JOIN public.comprador c ON c.id_comprador = p.id_comprador
    GROUP BY c.id_comprador, c.nombre
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ) compradores
  UNION ALL
  SELECT
    'coincidencia'::text,
    pe.clase,
    CASE pe.clase
      WHEN 'mantuvo' THEN 'Coincidió'
      WHEN 'cambio' THEN 'La persona lo cambió'
      WHEN 'sin_coincidencia' THEN 'Sin coincidencia'
      WHEN 'sin_eleccion' THEN 'Sugirió y no quedó producto'
      ELSE 'Sin dato'
    END,
    COUNT(DISTINCT pe.id_orden_venta)::bigint,
    COUNT(*)::numeric,
    0::numeric
  FROM pedidos pe
  GROUP BY pe.clase
  UNION ALL
  SELECT *
  FROM (
    SELECT
      'sustitucion'::text,
      left(COALESCE(pe.nombre_sugerido, 'Sin sugerencia') || ' → ' || COALESCE(pe.nombre_digitado, 'Sin producto'), 180),
      left(COALESCE(pe.nombre_sugerido, 'Sin sugerencia') || ' → ' || COALESCE(pe.nombre_digitado, 'Sin producto'), 180),
      COUNT(*)::bigint,
      COUNT(*)::numeric,
      0::numeric
    FROM pedidos pe
    WHERE pe.clase = 'cambio'
    GROUP BY 2, 3
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ) sustituciones
  UNION ALL
  SELECT
    'edad'::text,
    CASE
      WHEN p.estado_desde IS NULL THEN '4'
      WHEN p.estado_desde >= now() - interval '1 day' THEN '0'
      WHEN p.estado_desde >= now() - interval '3 day' THEN '1'
      WHEN p.estado_desde >= now() - interval '7 day' THEN '2'
      ELSE '3'
    END,
    CASE
      WHEN p.estado_desde IS NULL THEN 'Sin marca de tiempo'
      WHEN p.estado_desde >= now() - interval '1 day' THEN '0 a 1 día'
      WHEN p.estado_desde >= now() - interval '3 day' THEN '2 a 3 días'
      WHEN p.estado_desde >= now() - interval '7 day' THEN '4 a 7 días'
      ELSE '8 días o más'
    END,
    COUNT(*)::bigint,
    COALESCE(SUM(p.cantidad), 0)::numeric,
    COALESCE(SUM(p.importe), 0)::numeric
  FROM por_orden p
  WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento')
  GROUP BY 2, 3
  UNION ALL
  SELECT
    'evento'::text,
    e.clave,
    e.etiqueta,
    COUNT(DISTINCT e.id_orden_venta)::bigint,
    COUNT(*)::numeric,
    0::numeric
  FROM (
    SELECT
      id_orden_venta,
      CASE
        WHEN accion = 'creacion' THEN 'ingreso'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'confirmada' THEN 'confirmada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'alistamiento' THEN 'alistamiento'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'revisada' THEN 'revisada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'despachada' THEN 'despachada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'facturada' THEN 'facturada'
        WHEN accion = 'cambio_estado' THEN 'otro_estado'
        WHEN tipo = 'impresion_pdf_auto' THEN 'impresion_auto'
        WHEN tipo = 'impresion_pdf' THEN 'impresion'
        WHEN tipo = 'foto_surtido' THEN 'foto'
        WHEN tipo = 'estado_alistamiento' THEN 'marca_alistamiento'
        ELSE 'otro'
      END AS clave,
      CASE
        WHEN accion = 'creacion' THEN 'Pedido ingresado'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'confirmada' THEN 'Pasó a confirmada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'alistamiento' THEN 'Pasó a alistamiento'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'revisada' THEN 'Pasó a revisada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'despachada' THEN 'Pasó a despachada'
        WHEN accion = 'cambio_estado' AND estado_nuevo = 'facturada' THEN 'Pasó a facturada'
        WHEN accion = 'cambio_estado' THEN 'Cambió de estado'
        WHEN tipo = 'impresion_pdf_auto' THEN 'Impresión automática'
        WHEN tipo = 'impresion_pdf' THEN 'Impresión'
        WHEN tipo = 'foto_surtido' THEN 'Foto de surtido'
        WHEN tipo = 'estado_alistamiento' THEN 'Marca de alistamiento'
        ELSE 'Otro movimiento'
      END AS etiqueta
    FROM eventos
  ) e
  GROUP BY e.clave, e.etiqueta
  UNION ALL
  SELECT
    'hora'::text,
    lpad(h.hora::text, 2, '0'),
    lpad(h.hora::text, 2, '0') || ':00',
    COUNT(DISTINCT ev.id_orden_venta)::bigint,
    COUNT(ev.id_orden_venta)::numeric,
    0::numeric
  FROM generate_series(0, 23) AS h(hora)
  LEFT JOIN (
    SELECT
      id_orden_venta,
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Cancun')::int AS hora
    FROM eventos
  ) ev ON ev.hora = h.hora
  GROUP BY h.hora
  UNION ALL
  SELECT
    'confirmacion'::text,
    m.clave,
    m.etiqueta,
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM (
    SELECT
      CASE
        WHEN confirmo IS NULL THEN '5'
        WHEN confirmo < entro THEN '6'
        WHEN confirmo - entro < interval '1 hour' THEN '0'
        WHEN confirmo - entro < interval '4 hour' THEN '1'
        WHEN confirmo - entro < interval '12 hour' THEN '2'
        WHEN confirmo - entro < interval '24 hour' THEN '3'
        ELSE '4'
      END AS clave,
      CASE
        WHEN confirmo IS NULL THEN 'Entró y no quedó confirmada'
        WHEN confirmo < entro THEN 'La confirmación quedó antes del ingreso'
        WHEN confirmo - entro < interval '1 hour' THEN 'Menos de 1 hora'
        WHEN confirmo - entro < interval '4 hour' THEN '1 a 4 horas'
        WHEN confirmo - entro < interval '12 hour' THEN '4 a 12 horas'
        WHEN confirmo - entro < interval '24 hour' THEN '12 a 24 horas'
        ELSE 'Más de 1 día'
      END AS etiqueta
    FROM marcas
    WHERE entro IS NOT NULL
    UNION ALL
    SELECT
      '7'::text,
      'Confirmada sin hora de entrada'::text
    FROM marcas
    WHERE entro IS NULL AND confirmo IS NOT NULL
  ) m
  GROUP BY m.clave, m.etiqueta
  -- SLA provisional. El 1 está quemado a propósito.
  -- Una orden abierta está en tiempo si hoy, en America/Cancun, menos la fecha
  -- de pedido es de 1 día como máximo. Si la diferencia es mayor, está atrasada.
  -- Alistada, revisada, despachada y facturada salen como cerradas y no se parten.
  -- Mantener este 1 igual que SLA_DIAS en src/components/ReporteOperacionTablero.js.
  -- El siguiente paso es leer ese día desde una tabla de parámetros.
  UNION ALL
  SELECT
    'etapa'::text,
    CASE p.estado
      WHEN 'por_confirmar' THEN '0'
      WHEN 'confirmada' THEN '1'
      WHEN 'alistamiento' THEN '2'
      WHEN 'alistada' THEN '3'
      WHEN 'revisada' THEN '4'
      WHEN 'despachada' THEN '5'
      WHEN 'facturada' THEN '6'
    END,
    CASE
      WHEN p.estado IN ('alistada', 'revisada', 'despachada', 'facturada') THEN 'cerrada'
      WHEN (timezone('America/Cancun', now()))::date - p.fecha <= 1 THEN 'en_tiempo'
      ELSE 'atrasada'
    END,
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM por_orden p
  WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento', 'alistada', 'revisada', 'despachada', 'facturada')
  GROUP BY 2, 3
  UNION ALL
  SELECT
    'ciclo'::text,
    d.etapa,
    CASE
      WHEN d.minutos <= 15 THEN '015'
      WHEN d.minutos <= 30 THEN '030'
      WHEN d.minutos <= 45 THEN '045'
      WHEN d.minutos <= 60 THEN '060'
      WHEN d.minutos <= 120 THEN '120'
      WHEN d.minutos <= 240 THEN '240'
      WHEN d.minutos <= 480 THEN '480'
      WHEN d.minutos <= 720 THEN '720'
      ELSE '721'
    END,
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM duraciones d
  GROUP BY 2, 3
  UNION ALL
  SELECT
    'ciclo'::text,
    d.etapa,
    'mediana'::text,
    COUNT(*)::bigint,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY d.minutos)::numeric,
    percentile_cont(0.9) WITHIN GROUP (ORDER BY d.minutos)::numeric
  FROM duraciones d
  GROUP BY d.etapa
  UNION ALL
  SELECT
    'ciclo'::text,
    d.etapa,
    'cumple'::text,
    COUNT(*) FILTER (
      WHERE (d.etapa IN ('0', '1') AND d.minutos <= 60)
         OR (d.etapa = '2' AND d.minutos <= 120)
    )::bigint,
    AVG(d.minutos)::numeric,
    0::numeric
  FROM duraciones d
  GROUP BY d.etapa
  UNION ALL
  SELECT
    'actor'::text,
    a.clase,
    a.etiqueta,
    COUNT(*)::bigint,
    COUNT(*)::numeric,
    0::numeric
  FROM (
    SELECT
      e.id_orden_venta,
      CASE
        WHEN bool_or(e.autor IS NOT NULL AND lower(e.autor) !~ '(mateo|sistema|api|auto)') THEN 'persona'
        WHEN bool_or(e.autor IS NOT NULL) THEN 'sistema'
        ELSE 'sin_nombre'
      END AS clase,
      CASE
        WHEN bool_or(e.autor IS NOT NULL AND lower(e.autor) !~ '(mateo|sistema|api|auto)') THEN 'Persona'
        WHEN bool_or(e.autor IS NOT NULL) THEN 'Sistema'
        ELSE 'Sin nombre'
      END AS etiqueta
    FROM eventos e
    GROUP BY e.id_orden_venta
  ) a
  GROUP BY a.clase, a.etiqueta
  UNION ALL
  SELECT
    'correccion'::text,
    p.fecha::text,
    p.fecha::text,
    COUNT(*)::bigint,
    COUNT(DISTINCT p.id_orden_venta)::numeric,
    0::numeric
  FROM pedidos p
  WHERE p.clase = 'cambio'
    AND p.fecha IS NOT NULL
  GROUP BY p.fecha
  UNION ALL
  SELECT
    'atraso_hora'::text,
    lpad(h.hora::text, 2, '0'),
    lpad(h.hora::text, 2, '0') || ':00',
    COUNT(ev.id_orden_venta)::bigint,
    COUNT(ev.id_orden_venta)::numeric,
    0::numeric
  FROM generate_series(0, 23) AS h(hora)
  LEFT JOIN (
    SELECT
      p.id_orden_venta,
      EXTRACT(HOUR FROM MIN(e.created_at) AT TIME ZONE 'America/Cancun')::int AS hora
    FROM por_orden p
    INNER JOIN eventos e
      ON e.id_orden_venta = p.id_orden_venta
     AND e.accion = 'creacion'
    WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento')
      AND (timezone('America/Cancun', now()))::date - p.fecha > 1
    GROUP BY p.id_orden_venta
  ) ev ON ev.hora = h.hora
  GROUP BY h.hora
  UNION ALL
  SELECT
    'tendencia'::text,
    d.etapa,
    d.fecha::text,
    COUNT(*)::bigint,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY d.minutos)::numeric,
    0::numeric
  FROM (
    SELECT
      '0'::text AS etapa,
      EXTRACT(EPOCH FROM (m.confirmo - m.entro)) / 60.0 AS minutos,
      (m.confirmo AT TIME ZONE 'America/Cancun')::date AS fecha
    FROM marcas m
    WHERE m.entro IS NOT NULL AND m.confirmo IS NOT NULL AND m.confirmo >= m.entro
    UNION ALL
    SELECT
      '1'::text,
      EXTRACT(EPOCH FROM (m.alisto - m.confirmo)) / 60.0,
      (m.alisto AT TIME ZONE 'America/Cancun')::date
    FROM marcas m
    WHERE m.confirmo IS NOT NULL AND m.alisto IS NOT NULL AND m.alisto >= m.confirmo
    UNION ALL
    SELECT
      '2'::text,
      EXTRACT(EPOCH FROM (p.estado_desde - m.alisto)) / 60.0,
      (p.estado_desde AT TIME ZONE 'America/Cancun')::date
    FROM marcas m
    INNER JOIN por_orden p ON p.id_orden_venta = m.id_orden_venta
    WHERE m.alisto IS NOT NULL
      AND p.estado = 'alistada'
      AND p.estado_desde IS NOT NULL
      AND p.estado_desde >= m.alisto
    UNION ALL
    SELECT t.etapa, t.minutos, t.fecha
    FROM tramos_cierre t
  ) d
  GROUP BY d.etapa, d.fecha
  UNION ALL
  SELECT
    'reloj'::text,
    q.etapa,
    q.cubeta,
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM (
    SELECT
      CASE p.estado
        WHEN 'por_confirmar' THEN '0'
        WHEN 'confirmada' THEN '1'
        ELSE '2'
      END AS etapa,
      CASE
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 15 THEN '015'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 30 THEN '030'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 45 THEN '045'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 60 THEN '060'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 90 THEN '090'
        WHEN EXTRACT(EPOCH FROM (now() - p.estado_desde)) / 60.0 <= 120 THEN '120'
        ELSE '121'
      END AS cubeta
    FROM por_orden p
    WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento')
      AND p.estado_desde IS NOT NULL
  ) q
  GROUP BY q.etapa, q.cubeta
  UNION ALL
  SELECT
    'rojo_hora'::text,
    r.etapa,
    lpad(EXTRACT(HOUR FROM r.cruce AT TIME ZONE 'America/Cancun')::int::text, 2, '0'),
    COUNT(*)::bigint,
    0::numeric,
    0::numeric
  FROM (
    SELECT
      CASE p.estado
        WHEN 'por_confirmar' THEN '0'
        WHEN 'confirmada' THEN '1'
        WHEN 'alistamiento' THEN '2'
        WHEN 'alistada' THEN '3'
        WHEN 'revisada' THEN '4'
        WHEN 'despachada' THEN '5'
        WHEN 'facturada' THEN '6'
      END AS etapa,
      CASE p.estado
        WHEN 'alistamiento' THEN p.estado_desde + interval '120 minutes'
        WHEN 'por_confirmar' THEN p.estado_desde + interval '60 minutes'
        WHEN 'confirmada' THEN p.estado_desde + interval '60 minutes'
        ELSE p.estado_desde
      END AS cruce
    FROM por_orden p
    WHERE p.estado IN ('por_confirmar', 'confirmada', 'alistamiento', 'alistada', 'revisada', 'despachada', 'facturada')
      AND p.estado_desde IS NOT NULL
  ) r
  WHERE r.cruce <= now()
    AND (r.cruce AT TIME ZONE 'America/Cancun')::date BETWEEN p_fecha_inicio AND p_fecha_fin
  GROUP BY r.etapa, 3
$$;

GRANT EXECUTE ON FUNCTION public.get_operacion_ordenes(date, date, integer, timestamp with time zone, timestamp with time zone, text)
  TO service_role, authenticator, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_auditoria_orden_venta
  ON emp_jbr_cygnus_y9ihz.auditoria_operacion (entidad_id)
  WHERE entidad = 'orden_venta';

CREATE INDEX IF NOT EXISTS idx_auditoria_orden_venta
  ON public.auditoria_operacion (entidad_id)
  WHERE entidad = 'orden_venta';

NOTIFY pgrst, 'reload schema';
