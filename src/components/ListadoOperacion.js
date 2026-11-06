'use client';

import { useEffect, useState } from 'react';
import { pedirExcelListado, pedirListado } from '../lib/listado-ordenes-cliente';
import {
  COLUMNAS_ORDENES_VENTA,
  filasExcel,
  libroListado,
  nombreListado,
  notaDeTope,
  textoCelda,
} from '../lib/listado-ordenes';

function guardarExcel(bytes, nombre) {
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

function TablaListado({ columnas, filas, clase }) {
  return (
    <div className={clase}>
      <table>
        <thead>
          <tr>
            {columnas.map(([clave, etiqueta]) => (
              <th key={clave} className={clave === 'importe' || clave === 'cantidad' || clave === 'ordenes' ? 'rp-num' : ''}>{etiqueta}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="rp-empty">Ningún registro en este rango.</td>
            </tr>
          ) : filas.map((fila, indice) => (
            <tr key={fila.clave || fila.numero || indice}>
              {columnas.map(([clave]) => (
                <td key={clave} className={clave === 'importe' || clave === 'cantidad' || clave === 'ordenes' ? 'rp-num' : ''}>
                  {textoCelda(fila[clave], clave)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListadoOperacion({ titulo, columnas, filas, nombre, claseTabla = 'rp-table-container' }) {
  function descargar() {
    guardarExcel(libroListado(filasExcel(columnas, filas)), nombre);
  }

  return (
    <section>
      <div className="rp-result-header">
        <h2>{titulo}</h2>
        <button type="button" className="rp-export" onClick={descargar}>Excel</button>
      </div>
      <TablaListado columnas={columnas} filas={filas} clase={claseTabla} />
    </section>
  );
}

function useCargaListado(accessToken, fechaInicio, fechaFin, onSessionInvalid) {
  const [ordenes, setOrdenes] = useState([]);
  const [total, setTotal] = useState(0);
  const [notaError, setNotaError] = useState('');

  useEffect(() => {
    if (!accessToken || !fechaInicio || !fechaFin) return undefined;
    let vigente = true;
    setNotaError('');
    pedirListado(accessToken, fechaInicio, fechaFin).then((resultado) => {
      if (!vigente) return;
      if (resultado.status === 401) onSessionInvalid?.();
      setOrdenes(resultado.ordenes);
      setTotal(resultado.total);
      setNotaError(resultado.error);
    }).catch((error) => {
      if (!vigente) return;
      setOrdenes([]);
      setTotal(0);
      setNotaError(error.message || 'No se pudo leer el listado.');
    });
    return () => {
      vigente = false;
    };
  }, [accessToken, fechaInicio, fechaFin, onSessionInvalid]);

  return { ordenes, total, notaError, setNotaError };
}

export function ListadoOrdenesPeriodo({ accessToken, fechaInicio, fechaFin, onSessionInvalid }) {
  const { ordenes, total, notaError, setNotaError } = useCargaListado(
    accessToken,
    fechaInicio,
    fechaFin,
    onSessionInvalid,
  );
  const [bajando, setBajando] = useState(false);

  async function descargar() {
    setBajando(true);
    setNotaError('');
    try {
      const resultado = await pedirExcelListado(accessToken, fechaInicio, fechaFin);
      if (resultado.status === 401) onSessionInvalid?.();
      if (resultado.error) throw new Error(resultado.error);
      guardarExcel(resultado.bytes, nombreListado('ordenes', fechaInicio, fechaFin));
    } catch (error) {
      setNotaError(error.message || 'No se pudo generar el Excel.');
    } finally {
      setBajando(false);
    }
  }

  const aviso = notaDeTope(ordenes.length, total);

  return (
    <section>
      <div className="rp-result-header">
        <h2>Órdenes de venta</h2>
        <button type="button" className="rp-export" onClick={descargar} disabled={bajando}>Excel</button>
      </div>
      {aviso ? <p className="rp-footer-note">{aviso}</p> : null}
      {notaError ? <p className="rp-footer-note">{notaError}</p> : null}
      <TablaListado columnas={COLUMNAS_ORDENES_VENTA} filas={ordenes} clase="rp-table-container rp-listado-ov" />
    </section>
  );
}
