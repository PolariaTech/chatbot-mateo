-- Nodo n8n: Postgres → Execute Query.
-- Settings del nodo: Execute Once activado.
-- Options: Query Parameters vacío. Query Batching = Single (el default).
-- El UPDATE corre sobre todos los productos distintos de public.pedido.
-- El SELECT final es solo la muestra que devuelve el nodo.

SET statement_timeout = '180s';

CREATE OR REPLACE FUNCTION pg_temp.norm_prod(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(regexp_replace(
    translate(lower(COALESCE(t, '')), 'áéíóúüñ¥脩', 'aeiouunnn'),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION pg_temp.fold_tok(tok text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text;
BEGIN
  t := regexp_replace(
    translate(lower(COALESCE(tok, '')), 'áéíóúüñ¥脩', 'aeiouunnn'),
    '[^a-z0-9]+', '', 'g'
  );
  IF t = ''
     OR t ~ '^[0-9]+g?$'
     OR t IN (
       'de','a','y','con','para','por','del','la','el','los','las','en','al',
       'gr','g','kg','kilo','kilos','cm','mm','pza','pz','und','d',
       'fresco','fresca','maduro','madura'
     )
  THEN
    RETURN NULL;
  END IF;
  IF t ~ 'ies$' AND length(t) > 4 THEN
    t := regexp_replace(t, 'ies$', 'y');
  ELSIF t = 'nopales' THEN
    t := 'nopal';
  ELSIF length(t) > 3 AND right(t, 1) = 's' THEN
    t := left(t, -1);
  END IF;
  IF t = 'pia' THEN
    t := 'pina';
  END IF;
  IF t ~ '^amar+illo$' THEN
    t := 'amarillo';
  END IF;
  RETURN t;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.tokens_de(t text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(array_agg(f ORDER BY ord), ARRAY[]::text[])
  FROM (
    SELECT ord, pg_temp.fold_tok(tok) AS f
    FROM unnest(string_to_array(pg_temp.norm_prod(t), ' ')) WITH ORDINALITY AS u(tok, ord)
  ) s
  WHERE f IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION pg_temp.alias_tokens(src text[])
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text;
  base text[] := ARRAY[]::text[];
  out text[] := ARRAY[]::text[];
  has_limon boolean := false;
  has_aguacate boolean := false;
  has_lechuga boolean := false;
  has_jitomate boolean := false;
  has_tomate boolean := false;
  has_cherry boolean := false;
  has_mora boolean := false;
  has_azul boolean := false;
  has_verde boolean := false;
  has_amarillo boolean := false;
  has_larga boolean := false;
  has_guajillo boolean := false;
  has_grande boolean := false;
  has_habanero boolean := false;
  has_chile boolean := false;
  has_morron boolean := false;
  has_color boolean := false;
  has_smith boolean := false;
BEGIN
  IF src IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  FOREACH t IN ARRAY src LOOP
    IF t = 'pimiento' THEN t := 'chile'; END IF;
    IF t = 'calabacita' THEN t := 'calabaza'; END IF;
    IF t IN ('saladette', 'saladet') THEN t := 'guaje'; END IF;
    IF t = 'alechosa' THEN t := 'maradol'; END IF;
    IF t IN ('cantaloupe', 'cantaloup') THEN t := 'chino'; END IF;
    IF t = 'tayota' THEN t := 'chayote'; END IF;
    IF t IN ('1era', '1ra') THEN t := 'primera'; END IF;
    IF t = 'cebolleta' THEN t := 'cebolla'; END IF;
    IF t IN ('cherry', 'cherri') THEN t := 'cherry'; END IF;
    IF t ~ 'blu' AND t ~ 'berr' AND length(t) >= 6 THEN t := 'blueberry'; END IF;

    IF t = 'limon' THEN has_limon := true; END IF;
    IF t = 'aguacate' THEN has_aguacate := true; END IF;
    IF t = 'lechuga' THEN has_lechuga := true; END IF;
    IF t = 'jitomate' THEN has_jitomate := true; END IF;
    IF t = 'tomate' THEN has_tomate := true; END IF;
    IF t = 'cherry' THEN has_cherry := true; END IF;
    IF t = 'mora' THEN has_mora := true; END IF;
    IF t = 'azul' THEN has_azul := true; END IF;
    IF t = 'verde' THEN has_verde := true; END IF;
    IF t IN ('amarillo', 'amarilla') THEN has_amarillo := true; END IF;
    IF t = 'larga' THEN has_larga := true; END IF;
    IF t = 'guajillo' THEN has_guajillo := true; END IF;
    IF t = 'grande' THEN has_grande := true; END IF;
    IF t = 'habanero' THEN has_habanero := true; END IF;
    IF t = 'chile' THEN has_chile := true; END IF;
    IF t = 'morron' THEN has_morron := true; END IF;
    IF t = 'smith' THEN has_smith := true; END IF;
    IF t IN ('rojo','roja','verde','amarillo','amarilla') THEN has_color := true; END IF;
    base := base || t;
  END LOOP;

  FOREACH t IN ARRAY base LOOP
    IF has_lechuga AND has_larga AND t = 'larga' THEN
      t := 'orejona';
    ELSIF has_limon AND has_verde AND NOT has_amarillo AND t = 'verde' THEN
      CONTINUE;
    ELSIF has_limon AND has_amarillo AND t IN ('amarillo', 'amarilla') THEN
      t := 'eureka';
    ELSIF (has_jitomate OR (has_tomate AND NOT has_verde AND NOT has_cherry)) AND has_guajillo AND t = 'guajillo' THEN
      t := 'guaje';
    ELSIF has_tomate AND NOT has_verde AND NOT has_cherry AND t = 'tomate' THEN
      t := 'jitomate';
    ELSIF has_tomate AND has_verde AND t IN ('limpio', 'limpia', 'cascara') THEN
      CONTINUE;
    ELSIF has_aguacate AND has_grande AND t = 'grande' THEN
      t := 'extra';
    ELSIF has_mora AND has_azul AND t IN ('mora', 'azul') THEN
      CONTINUE;
    ELSIF has_smith AND t = 'grand' THEN
      t := 'granny';
    END IF;
    out := out || t;
  END LOOP;

  IF has_mora AND has_azul AND NOT ('blueberry' = ANY(out)) THEN
    out := array_append(out, 'blueberry');
  END IF;
  IF has_habanero AND NOT has_chile THEN
    out := array_append(out, 'chile');
  END IF;
  IF has_chile AND has_color AND NOT has_morron AND NOT has_habanero THEN
    out := array_append(out, 'morron');
  END IF;

  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.levenshtein_prod(a text, b text)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m int := length(COALESCE(a, ''));
  n int := length(COALESCE(b, ''));
  prev int[];
  curr int[];
  i int;
  j int;
  costo int;
BEGIN
  IF m = 0 THEN RETURN n; END IF;
  IF n = 0 THEN RETURN m; END IF;
  prev := ARRAY(SELECT g FROM generate_series(0, n) AS g);
  curr := prev;
  FOR i IN 1..m LOOP
    curr[1] := i;
    FOR j IN 1..n LOOP
      costo := CASE WHEN substr(a, i, 1) = substr(b, j, 1) THEN 0 ELSE 1 END;
      curr[j + 1] := least(curr[j] + 1, prev[j + 1] + 1, prev[j] + costo);
    END LOOP;
    prev := curr;
  END LOOP;
  RETURN prev[n + 1];
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.token_cubre(ped text[], uni text[], palabra text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  u text;
  base text[] := COALESCE(ped, ARRAY[]::text[]) || COALESCE(uni, ARRAY[]::text[]);
BEGIN
  IF palabra IS NULL OR palabra = '' THEN
    RETURN false;
  END IF;
  IF palabra = ANY(COALESCE(ped, ARRAY[]::text[]))
     OR palabra = ANY(COALESCE(uni, ARRAY[]::text[])) THEN
    RETURN true;
  END IF;
  FOREACH u IN ARRAY base LOOP
    IF least(length(palabra), length(u)) >= 6
       AND abs(length(palabra) - length(u)) <= 2
       AND pg_temp.levenshtein_prod(palabra, u) <= 1 THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.evaluar_prod(pedido text, catalogo text)
RETURNS TABLE (cubiertas int, rango_ok int, ancho int, puntaje numeric)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ped text[] := ARRAY[]::text[];
  uni text[] := ARRAY[]::text[];
  mand text[] := ARRAY[]::text[];
  cat_words text[] := ARRAY[]::text[];
  opc text[] := ARRAY[]::text[];
  grupos jsonb := '[]'::jsonb;
  grupo text[];
  pieza text;
  parte text;
  tok text;
  w text;
  g jsonb;
  i int;
  hits int;
  cub_m int := 0;
  cub_s int := 0;
  shared int := 0;
  n_email int := 0;
  mand_ok boolean := true;
  sin_ok boolean := true;
  color_ok boolean := true;
  palabra boolean;
  rango_si boolean;
  es_opc boolean;
  pr int[];
  cr int[];
  rm text[];
  izq text;
  der text;
  colores text[] := ARRAY['rojo','roja','amarillo','amarilla','verde','blanco','blanca','negro','negra','morado','morada','rosa','azul'];
BEGIN
  ped := pg_temp.alias_tokens(pg_temp.tokens_de(pedido));
  n_email := cardinality(ped);
  IF n_email = 0 THEN
    RETURN;
  END IF;

  FOR i IN 1..n_email LOOP
    IF i < n_email THEN
      uni := uni || (ped[i] || ped[i + 1]);
    END IF;
    IF i + 1 < n_email THEN
      uni := uni || (ped[i] || ped[i + 1] || ped[i + 2]);
    END IF;
  END LOOP;

  FOR parte IN
    SELECT (regexp_matches(COALESCE(catalogo, ''), '\(([^)]*)\)', 'g'))[1]
  LOOP
    FOR tok IN
      SELECT pg_temp.fold_tok(x)
      FROM unnest(string_to_array(parte, ' ')) AS x
    LOOP
      IF tok IS NOT NULL AND tok <> 'domo' AND tok NOT LIKE 'congelad%' THEN
        opc := opc || tok;
      END IF;
    END LOOP;
  END LOOP;

  FOR pieza IN
    SELECT x FROM unnest(regexp_split_to_array(btrim(COALESCE(catalogo, '')), '\s+')) AS x
  LOOP
    IF position('/' IN pieza) > 0 THEN
      grupo := ARRAY[]::text[];
      FOR parte IN SELECT y FROM unnest(string_to_array(pieza, '/')) AS y LOOP
        tok := pg_temp.fold_tok(parte);
        IF tok IS NOT NULL THEN
          grupo := grupo || tok;
        END IF;
      END LOOP;
      IF cardinality(grupo) > 0 THEN
        grupos := grupos || jsonb_build_array(to_jsonb(grupo));
      END IF;
    ELSE
      tok := pg_temp.fold_tok(pieza);
      IF tok IS NOT NULL THEN
        mand := mand || tok;
      END IF;
    END IF;
  END LOOP;

  IF cardinality(mand) = 0 AND jsonb_array_length(grupos) = 0 THEN
    RETURN;
  END IF;

  FOREACH tok IN ARRAY mand LOOP
    cat_words := cat_words || tok;
    es_opc := tok = ANY(opc)
      OR tok IN ('persa', 'local', 'maradol')
      OR (n_email = 1 AND tok IN ('verde', 'blanco', 'blanca'));
    IF pg_temp.token_cubre(ped, uni, tok) THEN
      cub_m := cub_m + 1;
    ELSIF NOT es_opc THEN
      mand_ok := false;
    END IF;
  END LOOP;

  FOR g IN SELECT value FROM jsonb_array_elements(grupos) LOOP
    hits := 0;
    FOR tok IN SELECT jsonb_array_elements_text(g) LOOP
      cat_words := cat_words || tok;
      IF pg_temp.token_cubre(ped, uni, tok) THEN
        hits := hits + 1;
      END IF;
    END LOOP;
    IF hits = 0 THEN
      sin_ok := false;
    END IF;
    cub_s := cub_s + hits;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM unnest(ped) AS c WHERE c = ANY(colores)
  )
  AND EXISTS (
    SELECT 1 FROM unnest(cat_words) AS c WHERE c = ANY(colores)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(ped) AS c
    WHERE c = ANY(colores)
      AND c = ANY(cat_words)
  ) THEN
    color_ok := false;
  END IF;

  rm := regexp_match(replace(pg_temp.norm_prod(pedido), '/', ' '), '([0-9]+)[^0-9]+([0-9]+)');
  IF rm IS NOT NULL AND rm[1]::int <= rm[2]::int THEN
    pr := ARRAY[rm[1]::int, rm[2]::int];
  END IF;
  rm := regexp_match(replace(pg_temp.norm_prod(catalogo), '/', ' '), '([0-9]+)[^0-9]+([0-9]+)');
  IF rm IS NOT NULL AND rm[1]::int <= rm[2]::int THEN
    cr := ARRAY[rm[1]::int, rm[2]::int];
  END IF;

  FOREACH w IN ARRAY ped LOOP
    IF length(w) >= 4 AND w = ANY(cat_words) THEN
      shared := shared + 1;
    END IF;
  END LOOP;

  rango_si := pr IS NOT NULL AND cr IS NOT NULL
    AND pr[1] >= cr[1] AND pr[2] <= cr[2]
    AND shared > 0;
  palabra := mand_ok AND sin_ok AND color_ok
    AND (cardinality(mand) > 0 OR jsonb_array_length(grupos) > 0)
    AND (cub_m + cub_s) > 0;

  IF palabra OR rango_si THEN
    cubiertas := CASE WHEN palabra THEN cub_m + cub_s ELSE shared END;
    rango_ok := CASE WHEN rango_si THEN 1 ELSE 0 END;
    ancho := CASE WHEN rango_si THEN cr[2] - cr[1] ELSE 1000000 END;
    puntaje := 1;
    RETURN NEXT;
    RETURN;
  END IF;

  izq := array_to_string(ped, ' ');
  der := array_to_string(cat_words, ' ');
  IF izq <> '' AND der <> '' THEN
    puntaje := 1 - pg_temp.levenshtein_prod(izq, der)::numeric
      / greatest(length(izq), length(der));
    IF puntaje >= 0.95 THEN
      cubiertas := 0;
      rango_ok := 0;
      ancho := 1000000;
      RETURN NEXT;
    END IF;
  END IF;
END;
$$;

WITH catalogo AS (
  SELECT p.id_producto, p.sku, btrim(p.descripcion) AS descripcion
  FROM public.producto p
  WHERE p.codigo_cuenta = '49M04'
    AND p.esta_activo IS TRUE
    AND btrim(COALESCE(p.descripcion, '')) <> ''
),
pendientes AS (
  SELECT DISTINCT producto
  FROM public.pedido
  WHERE btrim(COALESCE(producto, '')) <> ''
),
mejores AS (
  SELECT DISTINCT ON (pend.producto)
    pend.producto,
    cat.id_producto,
    cat.sku,
    cat.descripcion
  FROM pendientes pend
  JOIN catalogo cat ON true
  JOIN LATERAL pg_temp.evaluar_prod(pend.producto, cat.descripcion) ev ON true
  ORDER BY
    pend.producto,
    ev.cubiertas DESC,
    ev.rango_ok DESC,
    ev.ancho ASC,
    ev.puntaje DESC,
    length(cat.descripcion) DESC
),
todos AS (
  SELECT p.producto, m.id_producto, m.sku, m.descripcion
  FROM pendientes p
  LEFT JOIN mejores m ON m.producto = p.producto
)
UPDATE public.pedido d
SET
  id_producto_sugerido = t.id_producto,
  sku_sugerido = t.sku,
  nombre_sugerido = COALESCE(t.descripcion, 'No encontrado')
FROM todos t
WHERE d.producto = t.producto;

SELECT producto, nombre_sugerido, sku_sugerido, count(*) AS filas
FROM public.pedido
WHERE producto ILIKE ANY (ARRAY[
  '%TOMATE CHERRY%',
  '%TOMATE VERDE%',
  '%PI%A MIEL%',
  '%GRAND SMITH%',
  '%GRANNY SMITH%',
  'NOPALES KILO',
  'PAPA BLANCA',
  'PEPINO VERDE',
  '%CEBOLLETA%',
  'CEBOLLA CAMBRAY',
  'LECHUGA LARGA',
  'LIMON SIN SEMILLA%',
  'LIMON VERDE',
  'LIMON',
  'LIMON AMARILLO%',
  '%PIMIENTO MORRON%',
  'PEPINO%',
  '%CALABACITA%',
  '%SALADET%',
  'TORONJA%',
  'KIWI',
  '%MORA AZUL%',
  'AGUACATE HASS',
  '%AGUACATE HASS GRANDE%',
  '%1ERA%',
  '%HABANERO%',
  '%GUAJILLO%',
  '%PAPAYA%'
])
GROUP BY producto, nombre_sugerido, sku_sugerido
ORDER BY producto;

RESET statement_timeout;
