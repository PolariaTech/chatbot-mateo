'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { pedirExcelListado, pedirListado, pedirProductosOrden } from '../lib/listado-ordenes-cliente';
import {
  COLUMNAS_ORDENES_VENTA,
  filasExcel,
  gruposPorCentro,
  libroListado,
  nombreListado,
  notaDeTope,
  textoCelda,
} from '../lib/listado-ordenes';

function claveNumerica(clave) {
  return clave === 'importe' || clave === 'cantidad' || clave === 'ordenes' || clave === 'ordenes_trabajo';
}

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

function TablaListado({ columnas, filas, clase, onOrdenTrabajo }) {
  return (
    <div className={clase}>
      <table>
        <thead>
          <tr>
            {columnas.map(([clave, etiqueta]) => (
              <th key={clave} className={claveNumerica(clave) ? 'rp-num' : ''}>{etiqueta}</th>
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
                <td key={clave} className={claveNumerica(clave) ? 'rp-num' : ''}>
                  {clave === 'ordenes_trabajo' && onOrdenTrabajo ? (
                    <button type="button" className="rp-ot-link" onClick={() => onOrdenTrabajo(fila)}>
                      {textoCelda(fila[clave], clave)}
                    </button>
                  ) : textoCelda(fila[clave], clave)}
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

function useCargaListado(accessToken, fechaInicio, fechaFin, tipoFecha, onSessionInvalid) {
  const [ordenes, setOrdenes] = useState([]);
  const [total, setTotal] = useState(0);
  const [notaError, setNotaError] = useState('');

  useEffect(() => {
    if (!accessToken || !fechaInicio || !fechaFin) return undefined;
    let vigente = true;
    setNotaError('');
    pedirListado(accessToken, fechaInicio, fechaFin, tipoFecha).then((resultado) => {
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
  }, [accessToken, fechaInicio, fechaFin, tipoFecha, onSessionInvalid]);

  return { ordenes, total, notaError, setNotaError };
}

function AccionesDescarga({ descarga, bajando, onElegir, onDescargar }) {
  return (
    <div className="rp-result-actions">
      <div className="rp-rango-presets-list" role="radiogroup" aria-label="Tipo de Excel">
        <label className={`rp-rango-chip${descarga === 'ov' ? ' rp-active' : ''}`}>
          <input type="radio" name="descarga-ordenes" value="ov" checked={descarga === 'ov'} disabled={bajando} onChange={() => onElegir('ov')} />
          Órdenes de venta
        </label>
        <label className={`rp-rango-chip${descarga === 'ot' ? ' rp-active' : ''}`}>
          <input type="radio" name="descarga-ordenes" value="ot" checked={descarga === 'ot'} disabled={bajando} onChange={() => onElegir('ot')} />
          Con órdenes de trabajo
        </label>
      </div>
      <button type="button" className="rp-export" onClick={onDescargar} disabled={bajando}>Excel</button>
    </div>
  );
}

function TablaCentro({ grupo }) {
  return (
    <div>
      <h4>{grupo.centro}</h4>
      <div className="rp-table-container">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th className="rp-num">Cantidad</th>
              <th>Unidad de medida</th>
              <th className="rp-num">Importe</th>
            </tr>
          </thead>
          <tbody>
            {grupo.productos.map((producto, indice) => (
              <tr key={`${producto.codigo_producto || 'producto'}-${indice}`}>
                <td>{producto.codigo_producto || ''}</td>
                <td>{producto.producto || ''}</td>
                <td className="rp-num">{textoCelda(producto.cantidad, 'cantidad')}</td>
                <td>{producto.unidad || ''}</td>
                <td className="rp-num">{textoCelda(producto.importe, 'importe')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductosDeOrden({ detalle, onCerrar }) {
  useEffect(() => {
    function alTecla(evento) {
      if (evento.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', alTecla);
    return () => document.removeEventListener('keydown', alTecla);
  }, [onCerrar]);

  const raiz = document.querySelector('.reportes-root');
  if (!raiz) return null;

  return createPortal(
    <div className="rp-modal-fondo" onClick={onCerrar}>
      <div
        className="rp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="productos-orden-titulo"
        onClick={(evento) => evento.stopPropagation()}
      >
      <div className="rp-result-header">
        <h3 id="productos-orden-titulo">Productos de {detalle.numero}</h3>
        <button type="button" className="rp-export" onClick={onCerrar}>Cerrar</button>
      </div>
      {detalle.cargando ? <p className="rp-footer-note">Cargando los productos.</p> : null}
      {detalle.error ? <p className="rp-footer-note">{detalle.error}</p> : null}
      {!detalle.cargando && !detalle.error && detalle.grupos.length === 0 ? (
        <p className="rp-footer-note">Esta orden no tiene productos.</p>
      ) : null}
      {detalle.grupos.map((grupo) => <TablaCentro key={grupo.centro} grupo={grupo} />)}
      </div>
    </div>,
    raiz,
  );
}

export function ListadoOrdenesPeriodo({ accessToken, fechaInicio, fechaFin, tipoFecha = 'entrega', onSessionInvalid }) {
  const { ordenes, total, notaError, setNotaError } = useCargaListado(
    accessToken,
    fechaInicio,
    fechaFin,
    tipoFecha,
    onSessionInvalid,
  );
  const [bajando, setBajando] = useState(false);
  const [descarga, setDescarga] = useState('ov');
  const [detalle, setDetalle] = useState(null);

  async function abrirOrdenTrabajo(fila) {
    if (detalle?.numero === fila.numero && !detalle.cargando) {
      setDetalle(null);
      return;
    }
    setDetalle({ numero: fila.numero, grupos: [], cargando: true, error: '' });
    const resultado = await pedirProductosOrden(accessToken, fila.numero);
    if (resultado.status === 401) onSessionInvalid?.();
    setDetalle({
      numero: fila.numero,
      grupos: gruposPorCentro(resultado.productos),
      cargando: false,
      error: resultado.error,
    });
  }

  async function descargar() {
    setBajando(true);
    setNotaError('');
    try {
      const resultado = await pedirExcelListado(accessToken, fechaInicio, fechaFin, tipoFecha, descarga);
      if (resultado.status === 401) onSessionInvalid?.();
      if (resultado.error) throw new Error(resultado.error);
      const prefijo = descarga === 'ot' ? 'ordenes_ot' : 'ordenes';
      guardarExcel(resultado.bytes, nombreListado(prefijo, fechaInicio, fechaFin));
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
        <AccionesDescarga descarga={descarga} bajando={bajando} onElegir={setDescarga} onDescargar={descargar} />
      </div>
      {aviso ? <p className="rp-footer-note">{aviso}</p> : null}
      {notaError ? <p className="rp-footer-note">{notaError}</p> : null}
      {detalle ? <ProductosDeOrden detalle={detalle} onCerrar={() => setDetalle(null)} /> : null}
      <TablaListado
        columnas={COLUMNAS_ORDENES_VENTA}
        filas={ordenes}
        clase="rp-table-container rp-listado-ov"
        onOrdenTrabajo={abrirOrdenTrabajo}
      />
    </section>
  );
}
