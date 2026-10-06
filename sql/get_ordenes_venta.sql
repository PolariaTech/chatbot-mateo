-- Este nombre no existe. El listado es get_borradores y el detalle es get_detalle_borradores.
-- Las dos leen orden_venta.origen_correo. Están en sql/get_borradores.sql.
-- Pegar en el SQL Editor solo si llegaste a crear la función con el nombre viejo.

DROP FUNCTION IF EXISTS public.get_ordenes_venta(date, date);

NOTIFY pgrst, 'reload schema';
