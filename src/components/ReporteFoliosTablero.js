'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { construirPivotFolios, descargarExcelFolios } from '../lib/reporte-folios-excel';

const OCULTAR_COLUMNAS = /^(id_folio_digital|id_venta|id_comprador|estado_contable|cancelado|uuid_estado)$/i;
const DINERO_2DEC = {
  neto: true,
  descuento: true,
  impuesto: true,
  total: true,
  pendiente: true,
};
const ENTERO = {
  folio: true,
  folios: true,
};

const ESTADOS_CONTABLES = [
  { value: 1, label: '1-NO contabilizado en Contpaqi-contabilidad' },
  { value: 2, label: '2-¿?' },
  { value: 5, label: '5-Contabilizado en Contpaqi-contabilidad' },
];
const ESTADOS_CANCELADO = [
  { value: 0, label: '0-Activo' },
  { value: 1, label: '1-Cancelado' },
];
const ESTADOS_UUID = [
  { value: 1, label: '1-Sin timbrar (UUID estado)' },
  { value: 2, label: '2-Vigente (UUID estado)' },
  { value: 3, label: '3-Cancelado (UUID estado)' },
  { value: 5, label: '5-Por confirmar cancelación (UUID estado)' },
  { value: 13, label: '13-¿? (UUID estado)' },
];

function esFechaIso(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function esColumnaNumerica(nombre, rows) {
  if (DINERO_2DEC[nombre] || ENTERO[nombre]) return true;
  if (/^(id_|serie|razon|rfc|estado|cancelado|uuid|email|status|codigo|nombre|folio_venta)/i.test(nombre)) {
    return false;
  }
  return rows.some((row) => aNumero(row[nombre]) !== null);
}

function sumaColumna(rows, nombre) {
  return rows.reduce((acc, row) => acc + (aNumero(row[nombre]) || 0), 0);
}

function formatoNumero(valor, columna) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = aNumero(valor);
  if (n === null) return String(valor);
  if (DINERO_2DEC[columna] || ['neto', 'descuento', 'impuesto', 'total', 'pendiente'].includes(columna)) {
    return `$ ${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (ENTERO[columna]) {
    return Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

function totalColumna(nombre, rows) {
  if (!esColumnaNumerica(nombre, rows)) return null;
  return sumaColumna(rows, nombre);
}

function fechaAyerIso() {
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  return `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
}

function isoToDmy(iso) {
  if (!esFechaIso(iso)) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function dmyToIso(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!match) return null;
  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== yyyy ||
    parsed.getMonth() + 1 !== mm ||
    parsed.getDate() !== dd
  ) {
    return null;
  }
  return iso;
}

function formatoCelda(valor, columna) {
  if (valor == null || valor === '') return '';
  if (columna === 'fecha_emision' || columna === 'fecha_venta' || columna === 'fecha_cancelacion') {
    const iso = String(valor).slice(0, 10);
    return esFechaIso(iso) ? isoToDmy(iso) : String(valor);
  }
  return String(valor);
}

function filtrarYOrdenar(rows, columnas, filtros, orden, numericas) {
  const textoFiltros = Object.entries(filtros).filter(([, v]) => String(v || '').trim());
  let out = rows;
  if (textoFiltros.length) {
    out = rows.filter((row) => textoFiltros.every(([col, texto]) => (
      String(row[col] ?? '').toLowerCase().includes(String(texto).toLowerCase())
    )));
  }
  if (!orden.col) return out;
  const col = orden.col;
  const dir = orden.dir;
  const numerica = numericas[col];
  return [...out].sort((a, b) => {
    if (numerica) {
      const na = aNumero(a[col]);
      const nb = aNumero(b[col]);
      if (na === null && nb === null) return 0;
      if (na === null) return 1;
      if (nb === null) return -1;
      return (na - nb) * dir;
    }
    return String(a[col] || '').localeCompare(String(b[col] || ''), 'es', {
      numeric: true,
      sensitivity: 'base',
    }) * dir;
  });
}

function toggleValor(lista, valor) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

function CampoFecha({ id, label, iso, texto, onIso, onTexto }) {
  return (
    <div className="rp-campo">
      <label htmlFor={id}>{label}</label>
      <div className="rp-date-wrap">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          value={texto}
          onChange={(e) => {
            const next = e.target.value;
            onTexto(next);
            const parsed = dmyToIso(next);
            if (parsed) onIso(parsed);
          }}
          onBlur={() => {
            const parsed = dmyToIso(texto);
            if (parsed) {
              onIso(parsed);
              onTexto(isoToDmy(parsed));
              return;
            }
            onTexto(isoToDmy(iso));
          }}
        />
        <input
          lang="es-MX"
          className="rp-date-native"
          type="date"
          tabIndex={-1}
          aria-label={label}
          value={iso}
          onChange={(e) => {
            onIso(e.target.value);
            onTexto(isoToDmy(e.target.value));
          }}
        />
      </div>
    </div>
  );
}

function GrupoChecks({ titulo, opciones, valores, onChange }) {
  return (
    <fieldset className="rp-campo rp-check-group">
      <legend>{titulo}</legend>
      {opciones.map((op) => (
        <label key={op.value} className="rp-check">
          <input
            type="checkbox"
            checked={valores.includes(op.value)}
            onChange={() => onChange(toggleValor(valores, op.value))}
          />
          <span>{op.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function ReporteFoliosTablero({ accessToken, onSessionInvalid }) {
  const [fechaInicio, setFechaInicio] = useState(fechaAyerIso);
  const [fechaFin, setFechaFin] = useState(fechaAyerIso);
  const [fechaInicioTexto, setFechaInicioTexto] = useState(() => isoToDmy(fechaAyerIso()));
  const [fechaFinTexto, setFechaFinTexto] = useState(() => isoToDmy(fechaAyerIso()));
  const [estadoContable, setEstadoContable] = useState([]);
  const [cancelado, setCancelado] = useState([]);
  const [uuidEstado, setUuidEstado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('tabla');
  const [filtros, setFiltros] = useState({});
  const [orden, setOrden] = useState({ col: null, dir: 1 });
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const cargaIdRef = useRef(0);

  const columnas = useMemo(() => {
    if (!rows?.length) return [];
    return Object.keys(rows[0]).filter((column) => !OCULTAR_COLUMNAS.test(column));
  }, [rows]);

  const numericas = useMemo(() => {
    const map = {};
    columnas.forEach((column) => {
      map[column] = esColumnaNumerica(column, rows || []) || !!DINERO_2DEC[column];
    });
    return map;
  }, [columnas, rows]);

  const filasVisibles = useMemo(
    () => (rows ? filtrarYOrdenar(rows, columnas, filtros, orden, numericas) : []),
    [rows, columnas, filtros, orden, numericas],
  );

  const pivot = useMemo(() => (rows?.length ? construirPivotFolios(rows) : null), [rows]);

  async function pedirTablero({ offset, limite } = {}) {
    const response = await fetch('/api/reportefolios/tablero', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado_contable: estadoContable,
        cancelado,
        uuid_estado: uuidEstado,
        ...(offset != null ? { offset } : {}),
        ...(limite != null ? { limite } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      onSessionInvalid?.();
      throw new Error(data.error || 'Sesión inválida.');
    }
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error ejecutando la consulta');
    }
    return data;
  }

  async function cargarTablero() {
    const cargaId = cargaIdRef.current + 1;
    cargaIdRef.current = cargaId;
    setErrorMessage('');
    setFiltros({});
    setOrden({ col: null, dir: 1 });
    setTab('tabla');

    if (!esFechaIso(fechaInicio) || !esFechaIso(fechaFin)) {
      setErrorMessage('Indica fecha inicio y fecha fin (dd/mm/aaaa)');
      return;
    }
    if (fechaInicio > fechaFin) {
      setErrorMessage('La fecha inicio no puede ser mayor que la fecha fin');
      return;
    }

    setLoading(true);
    try {
      const data = await pedirTablero();
      if (cargaId !== cargaIdRef.current) return;
      const filas = data.rows || [];
      setRows(filas);
      setTotalRegistros(Number(data.total) || filas.length);
      setTruncated(Boolean(data.truncated));
    } catch (error) {
      if (cargaId !== cargaIdRef.current) return;
      setRows(null);
      setTotalRegistros(0);
      setTruncated(false);
      setErrorMessage(error.message || 'Error ejecutando la consulta');
    } finally {
      if (cargaId === cargaIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    cargarTablero();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function exportarExcel() {
    if (!rows?.length) {
      alert('No hay datos para exportar.');
      return;
    }
    if (truncated || totalRegistros > 5000) {
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      estadoContable.forEach((v) => params.append('estado_contable', String(v)));
      cancelado.forEach((v) => params.append('cancelado', String(v)));
      uuidEstado.forEach((v) => params.append('uuid_estado', String(v)));
      const ventana = window.open(`/reportefolios/exportar?${params.toString()}`, 'reporte_folios_excel');
      if (!ventana) {
        alert('El navegador bloqueó la descarga. Permite ventanas emergentes y vuelve a intentar.');
      }
      return;
    }
    try {
      descargarExcelFolios(rows, { fechaInicio, fechaFin });
    } catch (error) {
      console.error(error);
      alert(error.message || 'No fue posible generar el archivo Excel.');
    }
  }

  return (
    <div className="reportes-root" lang="es-MX">
      <div className="rp-page">
        <div className="rp-container">
          <div className="rp-filtros">
            <CampoFecha
              id="fechaInicioFolios"
              label="Fecha inicio (día/mes/año)"
              iso={fechaInicio}
              texto={fechaInicioTexto}
              onIso={setFechaInicio}
              onTexto={setFechaInicioTexto}
            />
            <CampoFecha
              id="fechaFinFolios"
              label="Fecha fin (día/mes/año)"
              iso={fechaFin}
              texto={fechaFinTexto}
              onIso={setFechaFin}
              onTexto={setFechaFinTexto}
            />
            <GrupoChecks
              titulo="Estado contable"
              opciones={ESTADOS_CONTABLES}
              valores={estadoContable}
              onChange={setEstadoContable}
            />
            <GrupoChecks
              titulo="Cancelado"
              opciones={ESTADOS_CANCELADO}
              valores={cancelado}
              onChange={setCancelado}
            />
            <GrupoChecks
              titulo="UUID estado"
              opciones={ESTADOS_UUID}
              valores={uuidEstado}
              onChange={setUuidEstado}
            />
            <div className="rp-actions">
              <button
                className="rp-execute"
                type="button"
                disabled={loading}
                onClick={cargarTablero}
              >
                {loading ? 'Cargando…' : 'Cargar Datos'}
              </button>
            </div>
          </div>

          {errorMessage && <div className="rp-warning">{errorMessage}</div>}

          {rows && rows.length === 0 && (
            <>
              <div className="rp-result-header">
                <h2>Resultado</h2>
                <span className="rp-row-count">0 registros</span>
              </div>
              <div className="rp-empty">La consulta no devolvió registros.</div>
            </>
          )}

          {rows && rows.length > 0 && (
            <>
              <div className="rp-result-header">
                <h2>Resultado</h2>
                <div className="rp-result-actions">
                  <span className="rp-row-count">
                    {filasVisibles.length} de {rows.length} folios en pantalla
                    {truncated && totalRegistros > rows.length
                      ? ` · ${totalRegistros.toLocaleString('es-MX')} en el rango (Excel completo abre una pestaña)`
                      : ''}
                  </span>
                  <button className="rp-export" type="button" onClick={exportarExcel}>
                    Exportar Excel
                  </button>
                </div>
              </div>

              <div className="rp-tabs">
                <button
                  className={`rp-tab${tab === 'tabla' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('tabla')}
                >
                  Tabla
                </button>
                <button
                  className={`rp-tab${tab === 'dashboard' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('dashboard')}
                >
                  Indicadores
                </button>
              </div>

              <div className={`rp-tab-panel${tab === 'tabla' ? ' rp-active' : ''}`}>
                <div className="rp-table-container">
                  <table>
                    <thead>
                      <tr>
                        {columnas.map((column) => (
                          <th key={column} className={numericas[column] ? 'rp-num' : ''}>
                            <button
                              type="button"
                              className="rp-th-sort"
                              onClick={() => setOrden((prev) => (
                                prev.col === column
                                  ? { col: column, dir: prev.dir === 1 ? -1 : 1 }
                                  : { col: column, dir: 1 }
                              ))}
                            >
                              {column}
                              <span className="rp-sort-ind">
                                {orden.col === column ? (orden.dir === 1 ? '▲' : '▼') : ''}
                              </span>
                            </button>
                            <input
                              className="rp-th-filter"
                              type="text"
                              placeholder="Filtrar"
                              value={filtros[column] || ''}
                              onChange={(e) => setFiltros((prev) => ({ ...prev, [column]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filasVisibles.length === 0 ? (
                        <tr>
                          <td colSpan={columnas.length} className="rp-empty">
                            Ningún registro coincide con el filtro.
                          </td>
                        </tr>
                      ) : (
                        filasVisibles.map((row, index) => (
                          <tr key={row.id_folio_digital || index}>
                            {columnas.map((column) => (
                              <td key={column} className={numericas[column] ? 'rp-num' : ''}>
                                {numericas[column]
                                  ? formatoNumero(row[column], column)
                                  : formatoCelda(row[column], column)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        {columnas.map((column, i) => {
                          if (i === 0) return <td key={column}>Total</td>;
                          const total = totalColumna(column, filasVisibles);
                          return (
                            <td key={column} className={numericas[column] ? 'rp-num' : ''}>
                              {total === null ? '' : formatoNumero(total, column)}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className={`rp-tab-panel${tab === 'dashboard' ? ' rp-active' : ''}`}>
                {truncated && (
                  <div className="rp-warning">
                    Los indicadores usan los primeros 5,000 registros.
                  </div>
                )}
                {pivot && (
                  <>
                    <div className="rp-kpi-grid">
                      <div className="rp-kpi">
                        <div className="rp-kpi-label">Folios</div>
                        <div className="rp-kpi-caption">Cuenta de FOLIO</div>
                        <div className="rp-kpi-value">{pivot.total.folios.toLocaleString('es-MX')}</div>
                      </div>
                      <div className="rp-kpi">
                        <div className="rp-kpi-label">Neto</div>
                        <div className="rp-kpi-caption">Suma de NETO</div>
                        <div className="rp-kpi-value">{formatoNumero(pivot.total.neto, 'neto')}</div>
                      </div>
                      <div className="rp-kpi">
                        <div className="rp-kpi-label">Total</div>
                        <div className="rp-kpi-caption">Suma de TOTAL</div>
                        <div className="rp-kpi-value">{formatoNumero(pivot.total.total, 'total')}</div>
                      </div>
                      <div className="rp-kpi">
                        <div className="rp-kpi-label">Pendiente</div>
                        <div className="rp-kpi-caption">Suma de PENDIENTE</div>
                        <div className="rp-kpi-value">{formatoNumero(pivot.total.pendiente, 'pendiente')}</div>
                      </div>
                    </div>
                    <div className="rp-table-container rp-pivot">
                      <table>
                        <thead>
                          <tr>
                            <th>Etiquetas de fila</th>
                            <th className="rp-num">Cuenta de FOLIO</th>
                            <th className="rp-num">Suma de NETO</th>
                            <th className="rp-num">Suma de DESCUENTO</th>
                            <th className="rp-num">Suma de IMPUESTO</th>
                            <th className="rp-num">Suma de TOTAL</th>
                            <th className="rp-num">Suma de PENDIENTE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pivot.lineas.map((contable) => (
                            <PivotGrupo key={contable.etiqueta} nodo={contable} />
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td>Total general</td>
                            <td className="rp-num">{formatoNumero(pivot.total.folios, 'folios')}</td>
                            <td className="rp-num">{formatoNumero(pivot.total.neto, 'neto')}</td>
                            <td className="rp-num">{formatoNumero(pivot.total.descuento, 'descuento')}</td>
                            <td className="rp-num">{formatoNumero(pivot.total.impuesto, 'impuesto')}</td>
                            <td className="rp-num">{formatoNumero(pivot.total.total, 'total')}</td>
                            <td className="rp-num">{formatoNumero(pivot.total.pendiente, 'pendiente')}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <p className="rp-footer-note">Supabase · Polaria Mateo</p>
      </div>
    </div>
  );
}

function CeldasMetricas({ nodo }) {
  return (
    <>
      <td className="rp-num">{formatoNumero(nodo.folios, 'folios')}</td>
      <td className="rp-num">{formatoNumero(nodo.neto, 'neto')}</td>
      <td className="rp-num">{formatoNumero(nodo.descuento, 'descuento')}</td>
      <td className="rp-num">{formatoNumero(nodo.impuesto, 'impuesto')}</td>
      <td className="rp-num">{formatoNumero(nodo.total, 'total')}</td>
      <td className="rp-num">{formatoNumero(nodo.pendiente, 'pendiente')}</td>
    </>
  );
}

function PivotGrupo({ nodo }) {
  return (
    <>
      <tr className={`rp-pivot-row rp-pivot-nivel-${nodo.nivel}`}>
        <td>{nodo.etiqueta}</td>
        <CeldasMetricas nodo={nodo} />
      </tr>
      {(nodo.hijos || []).map((hijo) => (
        hijo.hijos
          ? <PivotGrupo key={`${nodo.etiqueta}-${hijo.etiqueta}`} nodo={hijo} />
          : (
            <tr key={`${nodo.etiqueta}-${hijo.etiqueta}`} className="rp-pivot-row rp-pivot-nivel-3">
              <td>{hijo.etiqueta}</td>
              <CeldasMetricas nodo={hijo} />
            </tr>
          )
      ))}
    </>
  );
}
