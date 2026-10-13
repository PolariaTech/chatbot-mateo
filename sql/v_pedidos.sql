-- Líneas de los borradores que llegan por correo (public.orden_venta.origen_correo).
-- Una fila por elemento del arreglo. Pegar en el SQL Editor y correr una vez.

DROP VIEW IF EXISTS public.v_lineas_borrador_correo;
DROP VIEW IF EXISTS public.v_pedidos;

CREATE VIEW public.v_pedidos AS
SELECT
    ov.*,
    elemento->>'Responsable interno'    AS "Responsable interno",
    elemento->>'Codigo producto'        AS "Codigo producto",
    elemento->>'Precio'                 AS "Precio",
    elemento->>'Horario'                AS "Horario",
    elemento->>'Referencia del cliente' AS "Referencia del cliente",
    elemento->>'Producto'               AS "Producto",
    elemento->>'Responsable externo'    AS "Responsable externo",
    elemento->>'Fecha'                  AS "Fecha",
    elemento->>'Almacen'                AS "Almacen",
    elemento->>'Nombre cliente'         AS "Nombre cliente",
    elemento->>'Referencia pedido'      AS "Referencia pedido",
    elemento->>'Numero almacen'         AS "Numero almacen",
    elemento->>'Cantidad'               AS "Cantidad",
    elemento->>'Numero pedido'          AS "Numero pedido",
    elemento->>'Unidad'                 AS "Unidad",
    elemento->>'Numero correo'          AS "Numero correo",
    elemento->>'_lineaIndex'            AS "_lineaIndex"
FROM public.orden_venta ov
CROSS JOIN LATERAL jsonb_array_elements(ov.origen_correo::jsonb) AS elemento
WHERE ov.estado = 'borrador';
