-- Sube el timeout DENTRO de la transacción de cada RPC.
-- ALTER FUNCTION ... SET a veces no gana al timeout del rol de Supabase;
-- set_config(..., true) sí aplica al entrar a estas funciones.

CREATE OR REPLACE FUNCTION emp_jbr_cygnus_y9ihz.mateo_tablero_sku(
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS SETOF emp_jbr_cygnus_y9ihz.get_tablero_sku
LANGUAGE plpgsql
SET statement_timeout = '120s'
AS $$
BEGIN
  PERFORM set_config('statement_timeout', '120s', true);
  RETURN QUERY
    SELECT * FROM emp_jbr_cygnus_y9ihz.get_tablero_sku(p_fecha_inicio, p_fecha_fin);
END;
$$;

NOTIFY pgrst, 'reload schema';

GRANT EXECUTE ON FUNCTION emp_jbr_cygnus_y9ihz.mateo_tablero_sku(date, date)
  TO service_role, authenticator, anon, authenticated;
