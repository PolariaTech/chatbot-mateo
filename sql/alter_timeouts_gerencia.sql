-- El tablero (encabezado / KPIs / tabla) se cancela a ~8s por el
-- statement_timeout del rol. Esto permite que esas funciones terminen.
-- Ejecutar una vez en el schema emp_jbr_cygnus_y9ihz.

ALTER FUNCTION emp_jbr_cygnus_y9ihz.get_resumen_sku(date, date)
  SET statement_timeout = '60s';

ALTER FUNCTION emp_jbr_cygnus_y9ihz.get_tablero_sku(date, date)
  SET statement_timeout = '60s';

ALTER FUNCTION emp_jbr_cygnus_y9ihz.get_ventas_por_dia(date, date)
  SET statement_timeout = '60s';
