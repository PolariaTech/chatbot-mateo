'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const MAX_PRODUCTOS = 6;
const PALETA = ['#2ee6a8', '#5b9cff', '#ffd166', '#f07167', '#c77dff', '#80ed99'];
const RANGOS = [
  { id: '1s', label: '1S', semanas: 1 },
  { id: '2s', label: '2S', semanas: 2 },
  { id: '3s', label: '3S', semanas: 3 },
  { id: '4s', label: '4S', semanas: 4 },
  { id: '1m', label: '1M', meses: 1 },
  { id: '3m', label: '3M', meses: 3 },
  { id: '6m', label: '6M', meses: 6 },
];

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

function fechasSemanasHastaHoy(cantidadSemanas) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (cantidadSemanas * 7 - 1));
  return {
    inicio: isoDesdeFechaLocal(inicio),
    fin: isoDesdeFechaLocal(hoy),
  };
}

function fechasMesesHastaHoy(cantidadMeses) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidadMeses - 1), 1);
  return {
    inicio: isoDesdeFechaLocal(inicio),
    fin: isoDesdeFechaLocal(hoy),
  };
}

function etiquetaEje(iso, { incluirAnio, incluirDiaSemana } = {}) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-MX', {
    weekday: incluirDiaSemana ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...(incluirAnio ? { year: '2-digit' } : {}),
  });
}

function cruzaAnio(dias) {
  return new Set((dias || []).map((iso) => String(iso).slice(0, 4))).size > 1;
}

function etiquetaTooltip(inicio, fin) {
  if (!inicio) return '';
  if (!fin || fin === inicio) return etiquetaEje(inicio, { incluirAnio: true });
  if (inicio.slice(0, 7) === fin.slice(0, 7)) {
    const [y, m, d1] = inicio.split('-').map(Number);
    const d2 = Number(fin.slice(8, 10));
    const mes = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-MX', {
      month: 'short',
      timeZone: 'UTC',
    });
    const anio = String(y).slice(2);
    return `${d1}–${d2} ${mes} ${anio}`;
  }
  return `${etiquetaEje(inicio, { incluirAnio: true })} – ${etiquetaEje(fin, { incluirAnio: true })}`;
}

function formatoImporte(n) {
  return `$ ${Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
}

function formatoCantidad(n) {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 1 });
}

function formatoValor(n, metrica) {
  return metrica === 'cantidad' ? formatoCantidad(n) : formatoImporte(n);
}

function fechasDeRango(filtroInicio, filtroFin, rangoId) {
  const def = RANGOS.find((r) => r.id === rangoId);
  if (def?.semanas) return fechasSemanasHastaHoy(def.semanas);
  if (def?.meses) return fechasMesesHastaHoy(def.meses);
  return { inicio: filtroInicio, fin: filtroFin };
}

function ventanaVacia(serie) {
  return {
    dias: [],
    diasFin: [],
    totalImporte: [],
    totalCantidad: [],
    productos: [],
    granularidad: serie?.granularidad || 'dia',
  };
}

function recortarVentana(serie, rangoId) {
  if (!serie?.dias?.length) return ventanaVacia(serie);
  const { inicio, fin } = fechasDeRango(serie.inicio, serie.fin, rangoId);
  const start = serie.dias.findIndex((dia) => dia >= inicio);
  if (start < 0) return ventanaVacia(serie);
  let end = serie.dias.length;
  while (end > start && serie.dias[end - 1] > fin) end -= 1;
  if (end <= start) return ventanaVacia(serie);
  const slice = (arr) => (arr || []).slice(start, end);
  const diasFinSrc = Array.isArray(serie.diasFin) && serie.diasFin.length === serie.dias.length
    ? serie.diasFin
    : serie.dias;
  return {
    dias: slice(serie.dias),
    diasFin: slice(diasFinSrc),
    totalImporte: slice(serie.total?.importe),
    totalCantidad: slice(serie.total?.cantidad),
    granularidad: serie.granularidad || 'dia',
    productos: (serie.productos || []).map((prod) => ({
      ...prod,
      importe: slice(prod.importe),
      cantidad: slice(prod.cantidad),
    })),
  };
}

function ventanaEsDiaria(ventana) {
  return Boolean(ventana?.dias?.length) && ventana.dias.every((dia, i) => (ventana.diasFin?.[i] || dia) === dia);
}

export default function IndicadorVolumenVentas({
  serie: serieMax,
  loading: loadingMax,
  error: errorMax,
  fechaInicio,
  fechaFin,
  accessToken,
  onSessionInvalid,
  activo = false,
  tableroCargando = false,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const panelRef = useRef(null);
  const cacheRef = useRef(new Map());
  const [rango, setRango] = useState('1s');
  const [metrica, setMetrica] = useState('importe');
  const [seleccion, setSeleccion] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [serieZoom, setSerieZoom] = useState(null);
  const [loadingZoom, setLoadingZoom] = useState(false);
  const [errorZoom, setErrorZoom] = useState('');

  useEffect(() => {
    if (!loadingMax) return undefined;
    cacheRef.current.clear();
    setRango('1s');
    setSeleccion([]);
    setBusqueda('');
    setPanelAbierto(false);
    setSerieZoom(null);
    setErrorZoom('');
    setLoadingZoom(false);
    return undefined;
  }, [loadingMax]);

  useEffect(() => {
    cacheRef.current.clear();
    setSerieZoom(null);
    setErrorZoom('');
    setLoadingZoom(false);
  }, [serieMax?.inicio, serieMax?.fin]);

  useEffect(() => {
    if (!activo || !accessToken || tableroCargando || loadingMax) {
      setLoadingZoom(false);
      return undefined;
    }
    const { inicio, fin } = fechasDeRango(fechaInicio, fechaFin, rango);
    const preview = recortarVentana(serieMax, rango);
    const cubre = serieMax?.inicio <= inicio && serieMax?.fin >= fin;
    if (cubre && ventanaEsDiaria(preview) && preview.dias.length) {
      setSerieZoom(null);
      setErrorZoom('');
      setLoadingZoom(false);
      return undefined;
    }
    const clave = `${inicio}|${fin}`;
    const cached = cacheRef.current.get(clave);
    if (cached) {
      setSerieZoom(cached);
      setErrorZoom('');
      setLoadingZoom(false);
      return undefined;
    }

    let cancelado = false;
    const ac = new AbortController();
    setLoadingZoom(true);
    setErrorZoom('');
    (async () => {
      try {
        const response = await fetch('/api/reportegerencia/serie', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ fecha_inicio: inicio, fecha_fin: fin }),
          signal: ac.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (cancelado) return;
        if (response.status === 401) {
          onSessionInvalid?.();
          throw new Error(data.error || 'Sesión inválida.');
        }
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'No se pudo armar la serie de ventas');
        }
        cacheRef.current.set(clave, data.serie);
        setSerieZoom(data.serie || null);
      } catch (err) {
        if (cancelado || err?.name === 'AbortError') return;
        setSerieZoom(null);
        setErrorZoom(err.message || 'No se pudo armar la serie de ventas');
      } finally {
        if (!cancelado) setLoadingZoom(false);
      }
    })();

    return () => {
      cancelado = true;
      ac.abort();
    };
  }, [
    activo,
    tableroCargando,
    rango,
    accessToken,
    fechaInicio,
    fechaFin,
    serieMax,
    loadingMax,
    onSessionInvalid,
  ]);

  const serie = serieZoom || serieMax;
  const loading = loadingZoom;
  const error = errorZoom || errorMax;
  const ventana = useMemo(
    () => recortarVentana(serie, serieZoom ? null : rango),
    [serie, serieZoom, rango],
  );

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = ventana.productos || [];
    if (!q) return lista;
    return lista.filter((prod) => prod.nombre.toLowerCase().includes(q));
  }, [ventana, busqueda]);

  const lineas = useMemo(() => {
    const campo = metrica === 'cantidad' ? 'cantidad' : 'importe';
    if (!seleccion.length) {
      return [{
        id: '__total',
        nombre: 'Todas las ventas',
        valores: campo === 'cantidad' ? ventana.totalCantidad || [] : ventana.totalImporte || [],
        color: PALETA[0],
      }];
    }
    return seleccion.map((id, i) => {
      const prod = (ventana.productos || []).find((p) => p.id === id);
      return {
        id,
        nombre: prod?.nombre || id,
        valores: prod?.[campo] || [],
        color: PALETA[i % PALETA.length],
      };
    });
  }, [ventana, metrica, seleccion]);

  useEffect(() => {
    if (!activo || !canvasRef.current || !ventana.dias?.length) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return undefined;
    }

    const ticks = { color: '#8aa89c' };
    const grid = 'rgba(90, 200, 160, 0.12)';
    const una = lineas.length === 1;
    const conAnio = cruzaAnio(ventana.dias);
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: ventana.dias.map((dia) => etiquetaEje(dia, {
          incluirAnio: conAnio,
          incluirDiaSemana: ventana.dias.length <= 16,
        })),
        datasets: lineas.map((linea) => ({
          label: linea.nombre,
          data: linea.valores,
          borderColor: linea.color,
          backgroundColor: una ? 'rgba(46, 230, 168, 0.16)' : 'transparent',
          fill: una,
          tension: 0.28,
          pointRadius: ventana.dias.length <= 12 ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: linea.color,
          borderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: !una,
            labels: { color: '#8aa89c', boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const i = items[0]?.dataIndex;
                if (i == null) return '';
                return etiquetaTooltip(ventana.dias[i], ventana.diasFin?.[i] || ventana.dias[i]);
              },
              label: (item) => ` ${item.dataset.label}: ${formatoValor(item.parsed.y, metrica)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              ...ticks,
              maxRotation: 0,
              autoSkip: ventana.dias.length > 12,
              maxTicksLimit: ventana.dias.length > 45 ? 12 : 10,
              font: { size: 10 },
            },
            grid: { display: false },
          },
          y: {
            ticks: {
              ...ticks,
              callback: (value) => formatoValor(value, metrica),
            },
            grid: { color: grid },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [ventana, lineas, metrica, activo]);

  useEffect(() => {
    if (!panelAbierto) return undefined;
    function onDoc(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setPanelAbierto(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [panelAbierto]);

  function toggleProducto(id) {
    setSeleccion((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PRODUCTOS) return prev;
      return [...prev, id];
    });
  }

  const seleccionNombres = seleccion
    .map((id) => (serie?.productos || []).find((p) => p.id === id)?.nombre)
    .filter(Boolean);

  return (
    <div className="rp-chart-card rp-chart-card-wide rp-serie">
      <div className="rp-serie-head">
        <div className="rp-serie-tools">
          <div className="rp-chart-toggle" role="group" aria-label="Métrica">
            <button
              type="button"
              className={metrica === 'importe' ? 'rp-active' : ''}
              onClick={() => setMetrica('importe')}
            >
              Ventas
            </button>
            <button
              type="button"
              className={metrica === 'cantidad' ? 'rp-active' : ''}
              onClick={() => setMetrica('cantidad')}
            >
              Cantidad
            </button>
          </div>
          <div className="rp-serie-productos" ref={panelRef}>
            <button
              type="button"
              className={`rp-serie-productos-btn${panelAbierto ? ' rp-open' : ''}`}
              onClick={() => setPanelAbierto((v) => !v)}
            >
              {seleccion.length ? `${seleccion.length} producto${seleccion.length === 1 ? '' : 's'}` : 'Todos los productos'}
            </button>
            {panelAbierto && (
              <div className="rp-serie-productos-panel" role="dialog" aria-label="Elegir productos">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto"
                />
                <label className="rp-serie-check">
                  <input
                    type="checkbox"
                    checked={seleccion.length === 0}
                    onChange={() => setSeleccion([])}
                  />
                  Todas las ventas
                </label>
                <div className="rp-serie-productos-list">
                  {productosFiltrados.length === 0 ? (
                    <div className="rp-empty">Sin coincidencias</div>
                  ) : (
                    productosFiltrados.map((prod) => (
                      <label key={prod.id} className="rp-serie-check">
                        <input
                          type="checkbox"
                          checked={seleccion.includes(prod.id)}
                          onChange={() => toggleProducto(prod.id)}
                        />
                        <span title={prod.nombre}>{prod.nombre}</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="rp-serie-productos-hint">Hasta {MAX_PRODUCTOS} productos a la vez</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {seleccionNombres.length > 0 && (
        <div className="rp-serie-chips">
          {seleccionNombres.map((nombre) => (
            <span key={nombre}>{nombre}</span>
          ))}
        </div>
      )}

      <div className="rp-serie-rangos" role="tablist" aria-label="Rango de tiempo">
        {RANGOS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={rango === item.id}
            className={rango === item.id ? 'rp-active' : ''}
            onClick={() => setRango(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rp-empty">Cargando volumen de ventas…</div>
      ) : error ? (
        <div className="rp-empty">{error}</div>
      ) : serie?.dias?.length ? (
        <div className="rp-serie-chart"><canvas ref={canvasRef} /></div>
      ) : (
        <div className="rp-empty">No hay ventas en este rango.</div>
      )}
    </div>
  );
}
