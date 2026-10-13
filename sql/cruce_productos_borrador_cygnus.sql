-- Cruce de las líneas del correo con el catálogo de Cygnus, por nombre.
-- Requiere public.v_pedidos (sql/v_pedidos.sql).
-- Ignora mayúsculas, espacios de más y acentos. Si hay varios productos
-- con el mismo nombre, toma el de menor SKU y cuenta el resto.

WITH catalogo AS (
    SELECT
        p.id_producto,
        p.sku,
        p.descripcion,
        translate(
            lower(regexp_replace(btrim(p.descripcion), '\s+', ' ', 'g')),
            'áéíóúüñ',
            'aeiouun'
        ) AS nombre_norm
    FROM emp_jbr_cygnus_y9ihz.producto p
)
SELECT
    l.*,
    c.id_producto,
    c.sku         AS sku_cygnus,
    c.descripcion AS nombre_cygnus,
    COALESCE(n.coincidencias, 0) AS coincidencias_cygnus,
    CASE
        WHEN c.id_producto IS NOT NULL THEN 'registrado'
        ELSE 'no registrado'
    END AS estado_catalogo
FROM public.v_pedidos l
LEFT JOIN LATERAL (
    SELECT
        cat.id_producto,
        cat.sku,
        cat.descripcion
    FROM catalogo cat
    WHERE cat.nombre_norm = translate(
        lower(regexp_replace(btrim(l."Producto"), '\s+', ' ', 'g')),
        'áéíóúüñ',
        'aeiouun'
    )
    ORDER BY cat.sku
    LIMIT 1
) c ON true
LEFT JOIN LATERAL (
    SELECT count(*) AS coincidencias
    FROM catalogo cat
    WHERE cat.nombre_norm = translate(
        lower(regexp_replace(btrim(l."Producto"), '\s+', ' ', 'g')),
        'áéíóúüñ',
        'aeiouun'
    )
) n ON true
ORDER BY
    (c.id_producto IS NULL) DESC,
    l.fecha_pedido ASC,
    l."Producto";
