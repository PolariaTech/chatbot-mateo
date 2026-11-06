async function postJson(ruta, accessToken, fechaInicio, fechaFin) {
  const respuesta = await fetch(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
  });
  return respuesta;
}

export async function pedirListado(accessToken, fechaInicio, fechaFin) {
  const respuesta = await postJson('/api/ordenesventa/listado', accessToken, fechaInicio, fechaFin);
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

export async function pedirExcelListado(accessToken, fechaInicio, fechaFin) {
  const respuesta = await postJson('/api/ordenesventa/listado/excel', accessToken, fechaInicio, fechaFin);
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    return { status: respuesta.status, error: cuerpo.error || 'No se pudo generar el Excel.', bytes: null };
  }
  return { status: respuesta.status, error: '', bytes: await respuesta.arrayBuffer() };
}
