'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

const COLUMNAS_ORDEN = [
  ['numero_orden', 'Número'],
  ['fecha_llegada', 'Llegada'],
  ['fecha_pedido', 'Pedido'],
  ['comprador', 'Comprador'],
  ['orden_compra', 'Orden de compra'],
  ['cantidad', 'Cantidad'],
  ['venta_total', 'Importe'],
];

const COLUMNAS_DETALLE = [
  ['numero_orden', 'Número'],
  ['fecha_llegada', 'Llegada'],
  ['producto', 'Producto'],
  ['cantidad', 'Cantidad'],
  ['unidad', 'Unidad'],
  ['precio', 'Precio'],
  ['venta_total', 'Importe'],
  ['almacen', 'Almacén'],
];

const DINERO = {
  venta_total: true,
  precio: true,
};

function esFechaIso(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function isoDesdeFechaLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function hoyLocal() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function fechasMesActual() {
  const hoy = hoyLocal();
  return {
    inicio: isoDesdeFechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    fin: isoDesdeFechaLocal(hoy),
  };
}

function fechasSemanasHastaHoy(cantidadSemanas) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (cantidadSemanas * 7 - 1));
  return { inicio: isoDesdeFechaLocal(inicio), fin: isoDesdeFechaLocal(hoy) };
}

function fechasMesesHastaHoy(cantidadMeses) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidadMeses - 1), 1);
  return { inicio: isoDesdeFechaLocal(inicio), fin: isoDesdeFechaLocal(hoy) };
}

const RANGOS_PRESET = [
  { id: '1s', label: 'Última semana', semanas: 1 },
  { id: '1m', label: 'Este mes', meses: 1 },
  { id: '3m', label: 'Últimos 3 meses', meses: 3 },
];

function fechasDePreset(presetId) {
  const preset = RANGOS_PRESET.find((item) => item.id === presetId);
  if (!preset) return null;
  if (preset.id === '1m') return fechasMesActual();
  if (preset.semanas) return fechasSemanasHastaHoy(preset.semanas);
  if (preset.meses) return fechasMesesHastaHoy(preset.meses);
  return null;
}

function isoToDmy(iso) {
  if (!esFechaIso(iso)) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function dmyToIso(value) {
  const trimmed = String(value || '').trim();
  const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!match) return null;
  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== yyyy
    || parsed.getMonth() + 1 !== mm
    || parsed.getDate() !== dd
  ) {
    return null;
  }
  return iso;
}

function diaIso(valor) {
  const texto = String(valor || '');
  const iso = texto.slice(0, 10);
  return esFechaIso(iso) ? iso : '';
}

function formatoDinero(valor) {
  const n = aNumero(valor) || 0;
  return `$ ${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatoCantidad(valor) {
  const n = aNumero(valor) || 0;
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatoCelda(valor, columna) {
  if (valor == null || valor === '') return '';
  if (columna === 'fecha_llegada' || columna === 'fecha_pedido') return isoToDmy(diaIso(valor)) || String(valor);
  if (DINERO[columna]) return formatoDinero(valor);
  if (columna === 'cantidad') return formatoCantidad(valor);
  return String(valor);
}

function enumerarDias(inicio, fin) {
  const dias = [];
  const cursor = new Date(`${inicio}T00:00:00`);
  const limite = new Date(`${fin}T00:00:00`);
  while (cursor <= limite) {
    dias.push(isoDesdeFechaLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function serieDesdeOrdenes(ordenes, inicio, fin) {
  const dias = enumerarDias(inicio, fin);
  const mapa = new Map(dias.map((dia) => [dia, 0]));
  (ordenes || []).forEach((row) => {
    const dia = diaIso(row.fecha_llegada);
    if (!mapa.has(dia)) return;
    mapa.set(dia, mapa.get(dia) + (aNumero(row.venta_total) || 0));
  });
  return dias.map((dia) => ({ fecha: dia, venta: mapa.get(dia) || 0 }));
}

export default function ReporteOrdenesTablero({ accessToken, onSessionInvalid }) {
  const inicial = fechasMesActual();
  const [fechaInicio, setFechaInicio] = useState(inicial.inicio);
  const [fechaFin, setFechaFin] = useState(inicial.fin);
  const [fechaInicioTexto, setFechaInicioTexto] = useState(() => isoToDmy(inicial.inicio));
  const [fechaFinTexto, setFechaFinTexto] = useState(() => isoToDmy(inicial.fin));
  const [rangoPreset, setRangoPreset] = useState('1m');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [ordenes, setOrdenes] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [tab, setTab] = useState('ordenes');
  const [ordenSeleccionada, setOrdenSeleccionada] = useState('');
  const chartRef = useRef(null);
  const graficoRef = useRef(null);
  const cargaIdRef = useRef(0);

  const serie = useMemo(
    () => (ordenes ? serieDesdeOrdenes(ordenes, fechaInicio, fechaFin) : []),
    [ordenes, fechaInicio, fechaFin],
  );

  const kpis = useMemo(() => {
    if (!ordenes?.length) return null;
    const venta = ordenes.reduce((acc, row) => acc + (aNumero(row.venta_total) || 0), 0);
    const cantidad = ordenes.reduce((acc, row) => acc + (aNumero(row.cantidad) || 0), 0);
    return {
      venta,
      cantidad,
      ordenes: ordenes.length,
      ticket: ordenes.length ? venta / ordenes.length : 0,
    };
  }, [ordenes]);

  const detalleVisible = useMemo(() => {
    if (!ordenSeleccionada) return detalle;
    return detalle.filter((row) => row.numero_orden === ordenSeleccionada);
  }, [detalle, ordenSeleccionada]);

  useEffect(() => () => {
    graficoRef.current?.destroy();
  }, []);

  useEffect(() => {
    graficoRef.current?.destroy();
    graficoRef.current = null;
    if (tab !== 'indicadores' || !chartRef.current || !serie.length) return undefined;
    graficoRef.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: serie.map((punto) => isoToDmy(punto.fecha)),
        datasets: [{
          label: 'Importe',
          data: serie.map((punto) => punto.venta),
          backgroundColor: 'rgba(46, 230, 168, 0.75)',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8aa89c', maxRotation: 40, minRotation: 0 }, grid: { color: 'rgba(90, 200, 160, 0.12)' } },
          y: { ticks: { color: '#8aa89c' }, grid: { color: 'rgba(90, 200, 160, 0.12)' }, beginAtZero: true },
        },
      },
    });
    return () => {
      graficoRef.current?.destroy();
      graficoRef.current = null;
    };
  }, [tab, serie]);

  async function cargarTablero(rangoFechas) {
    const inicio = rangoFechas?.inicio || fechaInicio;
    const fin = rangoFechas?.fin || fechaFin;
    const cargaId = cargaIdRef.current + 1;
    cargaIdRef.current = cargaId;
    setErrorMessage('');
    setOrdenSeleccionada('');

    if (!esFechaIso(inicio) || !esFechaIso(fin)) {
      setErrorMessage('Indica fecha inicio y fecha fin (dd/mm/aaaa)');
      return;
    }
    if (inicio > fin) {
      setErrorMessage('La fecha inicio no puede ser mayor que la fecha fin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reporteordenes/tablero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fecha_inicio: inicio, fecha_fin: fin }),
      });
      const data = await response.json().catch(() => ({}));
      if (cargaId !== cargaIdRef.current) return;
      if (response.status === 401) {
        onSessionInvalid?.();
        throw new Error(data.error || 'Sesión inválida.');
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error ejecutando la consulta');
      }
      setOrdenes(data.ordenes || []);
      setDetalle(data.detalle || []);
    } catch (error) {
      if (cargaId !== cargaIdRef.current) return;
      setOrdenes(null);
      setDetalle([]);
      setErrorMessage(error.message || 'Error ejecutando la consulta');
    } finally {
      if (cargaId === cargaIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return undefined;
    }
    const rango = fechasMesActual();
    const t = setTimeout(() => cargarTablero(rango), 50);
    return () => clearTimeout(t);
  }, [accessToken]);

  function aplicarPreset(presetId) {
    const rango = fechasDePreset(presetId);
    if (!rango) return;
    setRangoPreset(presetId);
    setFechaInicio(rango.inicio);
    setFechaFin(rango.fin);
    setFechaInicioTexto(isoToDmy(rango.inicio));
    setFechaFinTexto(isoToDmy(rango.fin));
    cargarTablero(rango);
  }

  function exportarExcel() {
    const libro = XLSX.utils.book_new();
    const hojaOrdenes = (ordenes || []).map((row) => ({
      Número: row.numero_orden,
      Llegada: isoToDmy(diaIso(row.fecha_llegada)),
      Pedido: isoToDmy(diaIso(row.fecha_pedido)),
      Comprador: row.comprador,
      'Orden de compra': row.orden_compra,
      Cantidad: aNumero(row.cantidad) || 0,
      Importe: aNumero(row.venta_total) || 0,
    }));
    const hojaDetalle = (detalle || []).map((row) => ({
      Número: row.numero_orden,
      Llegada: isoToDmy(diaIso(row.fecha_llegada)),
      Producto: row.producto,
      Cantidad: aNumero(row.cantidad) || 0,
      Unidad: row.unidad,
      Precio: aNumero(row.precio) || 0,
      Importe: aNumero(row.venta_total) || 0,
      Almacén: row.almacen,
    }));
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojaOrdenes), 'Ordenes');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojaDetalle), 'Detalle');
    XLSX.writeFile(libro, `ordenes_${fechaInicio}_${fechaFin}.xlsx`);
  }

  return (
    <div className="reportes-root" lang="es-MX">
      <div className="rp-page">
        <div className="rp-container">
          <div className="rp-filtros">
            <fieldset className="rp-rango-presets">
              <legend>Rango rápido</legend>
              <div className="rp-rango-presets-list" role="radiogroup" aria-label="Rango de fechas">
                {RANGOS_PRESET.map((item) => (
                  <label
                    key={item.id}
                    className={`rp-rango-chip${rangoPreset === item.id ? ' rp-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="rango-ordenes"
                      value={item.id}
                      checked={rangoPreset === item.id}
                      disabled={loading}
                      onChange={() => aplicarPreset(item.id)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <CampoFecha
              id="fechaInicioOrdenes"
              label="Fecha inicio (día/mes/año)"
              texto={fechaInicioTexto}
              iso={fechaInicio}
              onTexto={setFechaInicioTexto}
              onIso={(iso) => {
                setRangoPreset('');
                setFechaInicio(iso);
                setFechaInicioTexto(isoToDmy(iso));
              }}
            />
            <CampoFecha
              id="fechaFinOrdenes"
              label="Fecha fin (día/mes/año)"
              texto={fechaFinTexto}
              iso={fechaFin}
              onTexto={setFechaFinTexto}
              onIso={(iso) => {
                setRangoPreset('');
                setFechaFin(iso);
                setFechaFinTexto(isoToDmy(iso));
              }}
            />
            <div className="rp-actions">
              <button className="rp-execute" type="button" disabled={loading} onClick={() => cargarTablero()}>
                {loading ? 'Cargando…' : 'Cargar Datos'}
              </button>
            </div>
          </div>

          {errorMessage && <div className="rp-warning">{errorMessage}</div>}
          {loading && !ordenes && !errorMessage && <div className="rp-empty">Cargando órdenes…</div>}

          {ordenes && ordenes.length === 0 && (
            <>
              <div className="rp-result-header">
                <h2>Órdenes</h2>
                <span className="rp-row-count">0 órdenes</span>
              </div>
              <div className="rp-empty">No hay órdenes en ese rango.</div>
            </>
          )}

          {ordenes && ordenes.length > 0 && (
            <>
              <div className="rp-result-header">
                <h2>Órdenes</h2>
                <div className="rp-result-actions">
                  <span className="rp-row-count">{ordenes.length} órdenes</span>
                  <button className="rp-export" type="button" onClick={exportarExcel}>
                    Exportar Excel
                  </button>
                </div>
              </div>

              <div className="rp-tabs">
                <button
                  className={`rp-tab${tab === 'ordenes' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('ordenes')}
                >
                  Por orden
                </button>
                <button
                  className={`rp-tab${tab === 'detalle' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('detalle')}
                >
                  Detalle
                </button>
                <button
                  className={`rp-tab${tab === 'indicadores' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('indicadores')}
                >
                  Indicadores
                </button>
              </div>

              <div className={`rp-tab-panel${tab === 'ordenes' ? ' rp-active' : ''}`}>
                <Tabla
                  columnas={COLUMNAS_ORDEN}
                  filas={ordenes}
                  rowKey={(row) => row.numero_orden}
                  onFila={(row) => {
                    setOrdenSeleccionada(row.numero_orden);
                    setTab('detalle');
                  }}
                />
              </div>

              <div className={`rp-tab-panel${tab === 'detalle' ? ' rp-active' : ''}`}>
                {ordenSeleccionada && (
                  <div className="rp-result-actions" style={{ marginBottom: 12 }}>
                    <span className="rp-row-count">Detalle de {ordenSeleccionada}</span>
                    <button className="rp-export" type="button" onClick={() => setOrdenSeleccionada('')}>
                      Ver todas
                    </button>
                  </div>
                )}
                <Tabla
                  columnas={COLUMNAS_DETALLE}
                  filas={detalleVisible}
                  rowKey={(row, index) => `${row.numero_orden}-${row.producto}-${index}`}
                />
              </div>

              <div className={`rp-tab-panel${tab === 'indicadores' ? ' rp-active' : ''}`}>
                {kpis && (
                  <div className="rp-kpi-grid">
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Importe</div>
                      <div className="rp-kpi-caption">Importe del rango</div>
                      <div className="rp-kpi-value">{formatoDinero(kpis.venta)}</div>
                      <div className="rp-kpi-sub">Cantidad {formatoCantidad(kpis.cantidad)}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Órdenes</div>
                      <div className="rp-kpi-caption">Órdenes en el rango</div>
                      <div className="rp-kpi-value">{kpis.ordenes.toLocaleString('es-MX')}</div>
                      <div className="rp-kpi-sub">Ticket promedio {formatoDinero(kpis.ticket)}</div>
                    </div>
                  </div>
                )}
                <div className="rp-charts">
                  <div className="rp-chart-card">
                    <h3>Importe por día</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartRef} /></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <p className="rp-footer-note">Supabase · Polaria Mateo</p>
      </div>
    </div>
  );
}

function CampoFecha({ id, label, texto, iso, onTexto, onIso }) {
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
            const value = e.target.value;
            onTexto(value);
            const siguiente = dmyToIso(value);
            if (siguiente) onIso(siguiente);
          }}
          onBlur={() => {
            const siguiente = dmyToIso(texto);
            if (siguiente) onIso(siguiente);
          }}
        />
        <input
          lang="es-MX"
          className="rp-date-native"
          type="date"
          tabIndex={-1}
          aria-label={label}
          value={iso}
          onChange={(e) => onIso(e.target.value)}
        />
      </div>
    </div>
  );
}

function Tabla({ columnas, filas, rowKey, onFila }) {
  return (
    <div className="rp-table-container">
      <table>
        <thead>
          <tr>
            {columnas.map(([key, label]) => (
              <th key={key} className={DINERO[key] || key === 'cantidad' ? 'rp-num' : ''}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="rp-empty">Ningún registro en este rango.</td>
            </tr>
          ) : (
            filas.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onFila ? () => onFila(row) : undefined}
                style={onFila ? { cursor: 'pointer' } : undefined}
              >
                {columnas.map(([key]) => (
                  <td key={key} className={DINERO[key] || key === 'cantidad' ? 'rp-num' : ''}>
                    {formatoCelda(row[key], key)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
