'use client';

import React, { useState } from 'react';
import { nombreArchivoOrdenes } from '../lib/descarga-ov-excel';
import { nombreArchivoOt } from '../lib/descarga-ot-excel';

function esPedidoOt(pedido) {
  return pedido?.tipo === 'ot';
}

async function pedirArchivo(pedido, accessToken) {
  const esOt = esPedidoOt(pedido);
  const respuesta = await fetch(esOt ? '/api/mateo/ordenes-trabajo/excel' : '/api/mateo/ordenes/excel', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(esOt ? {
      fecha_inicio: pedido.inicio,
      fecha_fin: pedido.fin,
      horas: pedido.horas,
      hora_inicio: pedido.horaInicio,
      hora_fin: pedido.horaFin,
      columnas: pedido.columnas,
    } : {
      fecha_inicio: pedido.inicio,
      fecha_fin: pedido.fin,
      fecha: pedido.fecha,
      todo: Boolean(pedido.todo),
      horas: pedido.horas,
      hora_inicio: pedido.horaInicio,
      hora_fin: pedido.horaFin,
      columnas: pedido.columnas,
    }),
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new Error(cuerpo.error || 'No se pudo generar el Excel.');
  }
  return respuesta.blob();
}

function guardarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export default function DescargaOv({ pedido, accessToken }) {
  const [nota, setNota] = useState('');
  const desconocidas = pedido?.desconocidas || [];

  async function descargar() {
    setNota('Preparando el Excel…');
    try {
      const blob = await pedirArchivo(pedido, accessToken);
      const nombre = esPedidoOt(pedido)
        ? nombreArchivoOt(pedido.inicio, pedido.fin)
        : nombreArchivoOrdenes(pedido.inicio, pedido.fin);
      guardarBlob(blob, nombre);
      setNota('');
    } catch (error) {
      setNota(error.message || 'No se pudo generar el Excel.');
    }
  }

  return (
    <div className="descarga-ov">
      <button type="button" className="descarga-ov__boton" onClick={descargar}>
        Descargar Excel
      </button>
      {desconocidas.length > 0 && (
        <p className="descarga-ov__nota">No incluí: {desconocidas.join(', ')}</p>
      )}
      {nota ? <p className="descarga-ov__nota">{nota}</p> : null}
    </div>
  );
}
