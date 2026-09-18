'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { descargarExcelFolios } from '../lib/reporte-folios-excel';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const PAGINA = 1000;

function leerLista(searchParams, clave) {
  return searchParams.getAll(clave).map((v) => Number(v)).filter((n) => Number.isFinite(n));
}

export default function ReporteFoliosExcelDescarga({ accessToken }) {
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState('preparando');
  const [detalle, setDetalle] = useState('Preparando descarga…');
  const [archivo, setArchivo] = useState('');

  useEffect(() => {
    let cancelado = false;

    async function pedirPagina(offset) {
      const response = await fetch('/api/reportefolios/tablero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fecha_inicio: searchParams.get('fecha_inicio'),
          fecha_fin: searchParams.get('fecha_fin'),
          estado_contable: leerLista(searchParams, 'estado_contable'),
          cancelado: leerLista(searchParams, 'cancelado'),
          uuid_estado: leerLista(searchParams, 'uuid_estado'),
          offset,
          limite: PAGINA,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('La sesión expiró. Cierra esta pestaña, entra de nuevo y vuelve a exportar.');
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron leer los folios.');
      }
      return data;
    }

    async function correr() {
      const fechaInicio = searchParams.get('fecha_inicio') || '';
      const fechaFin = searchParams.get('fecha_fin') || '';

      if (!FECHA_ISO.test(fechaInicio) || !FECHA_ISO.test(fechaFin)) {
        throw new Error('Faltan las fechas del reporte.');
      }

      const todas = [];
      let offset = 0;
      let total = 0;

      while (!cancelado) {
        const data = await pedirPagina(offset);
        const chunk = data.rows || [];
        total = Number(data.total) || total;
        todas.push(...chunk);
        offset += chunk.length;
        setDetalle(
          total
            ? `Leyendo ${todas.length.toLocaleString('es-MX')} de ${total.toLocaleString('es-MX')} folios…`
            : `Leyendo ${todas.length.toLocaleString('es-MX')} folios…`,
        );
        if (!chunk.length || chunk.length < PAGINA || (total && todas.length >= total)) break;
      }

      if (cancelado) return;
      if (!todas.length) throw new Error('La consulta no devolvió registros.');

      setEstado('armando');
      setDetalle('Armando el archivo Excel…');
      const nombre = descargarExcelFolios(todas, { fechaInicio, fechaFin });
      if (cancelado) return;
      setArchivo(nombre);
      setEstado('listo');
      setDetalle('Descarga lista. Ya puedes cerrar esta pestaña.');
    }

    correr().catch((error) => {
      if (cancelado) return;
      setEstado('error');
      setDetalle(error.message || 'No se pudo generar el Excel.');
    });

    return () => {
      cancelado = true;
    };
  }, [accessToken, searchParams]);

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>{estado === 'listo' ? 'Excel listo' : estado === 'error' ? 'No se pudo exportar' : 'Exportando folios…'}</h1>
        <p>{detalle}</p>
        {archivo ? <p>{archivo}</p> : null}
      </div>
    </div>
  );
}
