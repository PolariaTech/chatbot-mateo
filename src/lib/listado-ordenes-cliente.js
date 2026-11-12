async function postJson(ruta, accessToken, fechaInicio, fechaFin, tipoFecha, descarga) {
  const cuerpo = {
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    tipo_fecha: tipoFecha,
  };
  if (descarga) cuerpo.descarga = descarga;
  const respuesta = await fetch(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(cuerpo),
  });
  return respuesta;
}

export async function pedirListado(accessToken, fechaInicio, fechaFin, tipoFecha) {
  const respuesta = await postJson('/api/ordenesventa/listado', accessToken, fechaInicio, fechaFin, tipoFecha);
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !cuerpo.success) {
    return {
      status: respuesta.status,
      error: cuerpo.error || 'No se pudo leer el listado.',
      ordenes: [],
      total: 0,
    };
  }
  return { status: respuesta.status, error: '', ordenes: cuerpo.ordenes || [], total: cuerpo.total || 0 };
}

export async function pedirProductosOrden(accessToken, numero) {
  const respuesta = await fetch('/api/ordenesventa/listado/productos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ numero }),
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !cuerpo.success) {
    return { status: respuesta.status, error: cuerpo.error || 'No se pudieron leer los productos.', productos: [] };
  }
  return { status: respuesta.status, error: '', productos: cuerpo.productos || [] };
}

export async function pedirExcelListado(accessToken, fechaInicio, fechaFin, tipoFecha, descarga = 'ov') {
  const respuesta = await postJson(
    '/api/ordenesventa/listado/excel',
    accessToken,
    fechaInicio,
    fechaFin,
    tipoFecha,
    descarga,
  );
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    return { status: respuesta.status, error: cuerpo.error || 'No se pudo generar el Excel.', bytes: null };
  }
  return { status: respuesta.status, error: '', bytes: await respuesta.arrayBuffer() };
}
