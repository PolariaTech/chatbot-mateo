-- Índices para que get_ventas_por_dia y el CTE de ventas de get_tablero_sku
-- no hagan seq scan. Sin esto el tope de ~8s de Supabase cancela la consulta.

CREATE INDEX IF NOT EXISTS idx_orden_venta_fecha_estado
  ON emp_jbr_cygnus_y9ihz.orden_venta (fecha_pedido)
  WHERE estado IS DISTINCT FROM 'cancelada';

CREATE INDEX IF NOT EXISTS idx_folio_digital_ov_uuid
  ON emp_jbr_cygnus_y9ihz.folio_digital (id_orden_venta)
  WHERE uuid_estado = 2;

CREATE INDEX IF NOT EXISTS idx_orden_venta_linea_ov
  ON emp_jbr_cygnus_y9ihz.orden_venta_linea (id_orden_venta, id_producto);
