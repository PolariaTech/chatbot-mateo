'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import {
  ESTADOS_KPI,
  ETAPAS_CICLO,
  ETAPAS_GRAFICO,
  SERIES_ABIERTAS,
  SERIES_TENDENCIA,
  filasPorEstado,
  puntoTendencia,
} from '../lib/ordenesventa-estados';
import { ListadoOperacion, ListadoOrdenesPeriodo } from './ListadoOperacion';
import {
  RANGOS_PRESET,
  dmyToIso,
  esFechaIso,
  fechasDePreset,
  isoToDmy,
} from '../lib/rango-operacion';
import { TIPOS_FECHA_OPERACION } from '../lib/tipo-fecha-operacion';

const COLUMNAS_ESTADO = [
  ['etiqueta', 'Estado'],
  ['ordenes', 'Órdenes'],
  ['cantidad', 'Cantidad'],
  ['importe', 'Importe'],
];

const COLUMNAS_PRODUCTO = [
  ['etiqueta', 'Producto'],
  ['clave', 'SKU'],
  ['ordenes', 'Órdenes'],
  ['cantidad', 'Cantidad'],
  ['importe', 'Importe'],
];

const COLUMNAS_CENTRO = [
  ['etiqueta', 'Centro de consumo'],
  ['ordenes', 'Órdenes'],
  ['cantidad', 'Cantidad'],
  ['importe', 'Importe'],
];

const COLUMNAS_COMPRADOR = [
  ['etiqueta', 'Comprador'],
  ['ordenes', 'Órdenes'],
  ['cantidad', 'Cantidad'],
  ['importe', 'Importe'],
];

const COLUMNAS_EDAD = [
  ['etiqueta', 'Tiempo en el estado actual'],
  ['ordenes', 'Órdenes abiertas'],
  ['importe', 'Importe'],
];

const COLUMNAS_EVENTO = [
  ['etiqueta', 'Movimiento'],
  ['ordenes', 'Órdenes'],
  ['cantidad', 'Veces'],
];

const COLUMNAS_HORA = [
  ['etiqueta', 'Hora'],
  ['ordenes', 'Órdenes'],
  ['cantidad', 'Movimientos'],
];

const COLUMNAS_CONFIRMACION = [
  ['etiqueta', 'Desde que entró hasta quedar confirmada'],
  ['ordenes', 'Órdenes'],
];

// Mismo 1 que el bloque "etapa" de sql/get_operacion_ordenes.sql.
// Hasta 1 día entre la fecha de pedido y hoy: en tiempo. Más de 1 día: atrasada.
// Luego este valor sale de una tabla de parámetros.
const SLA_DIAS = 1;

const CUBETAS_CICLO = [
  ['015', '15m', 15],
  ['030', '30m', 30],
  ['045', '45m', 45],
  ['060', '1h', 60],
  ['120', '2h', 120],
  ['240', '4h', 240],
  ['480', '8h', 480],
  ['720', '12h', 720],
  ['721', '+', 721],
];

const COLORES = ['#2ee6a8', '#19e3c8', '#7ee9da', '#e6c84a', '#f3b3ad', '#8aa89c', '#4cc38a', '#c9d4d4'];

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatoDinero(valor) {
  const n = aNumero(valor) || 0;
  return `$ ${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatoCantidad(valor) {
  const n = aNumero(valor) || 0;
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function Kpi({ tono, etiqueta, valor, ancho = false }) {
  return (
    <div className={`rp-kpi rp-dot-${tono}${ancho ? ' rp-kpi-ancho' : ''}`}>
      <div className="rp-kpi-label">{etiqueta}</div>
      <div className="rp-kpi-value">{valor}</div>
    </div>
  );
}

export default function ReporteOperacionTablero({ accessToken, onSessionInvalid }) {
  const inicial = fechasDePreset('1s');
  const [fechaInicio, setFechaInicio] = useState(inicial.inicio);
  const [fechaFin, setFechaFin] = useState(inicial.fin);
  const [fechaInicioTexto, setFechaInicioTexto] = useState(() => isoToDmy(inicial.inicio));
  const [fechaFinTexto, setFechaFinTexto] = useState(() => isoToDmy(inicial.fin));
  const [rangoPreset, setRangoPreset] = useState('1s');
  const [tipoFecha, setTipoFecha] = useState('entrega');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [filas, setFilas] = useState(null);
  const cargaIdRef = useRef(0);

  const cortes = useMemo(() => {
    const lista = filas || [];
    const de = (seccion, campo = 'importe') => lista
      .filter((row) => row.seccion === seccion)
      .sort((a, b) => (aNumero(b[campo]) || 0) - (aNumero(a[campo]) || 0));
    return {
      resumen: lista.find((row) => row.seccion === 'resumen') || null,
      estado: filasPorEstado(lista.filter((row) => row.seccion === 'estado')),
      centro: de('centro'),
      producto: de('producto', 'cantidad'),
      comprador: de('comprador', 'ordenes'),
      coincidencia: de('coincidencia', 'cantidad'),
      edad: lista
        .filter((row) => row.seccion === 'edad')
        .sort((a, b) => String(a.clave).localeCompare(String(b.clave))),
      evento: de('evento', 'cantidad'),
      hora: lista
        .filter((row) => row.seccion === 'hora')
        .sort((a, b) => String(a.clave).localeCompare(String(b.clave))),
      confirmacion: lista
        .filter((row) => row.seccion === 'confirmacion')
        .sort((a, b) => String(a.clave).localeCompare(String(b.clave))),
      etapa: lista.filter((row) => row.seccion === 'etapa'),
      ciclo: lista.filter((row) => row.seccion === 'ciclo'),
      actor: de('actor', 'ordenes'),
      correccion: lista
        .filter((row) => row.seccion === 'correccion')
        .sort((a, b) => String(a.clave).localeCompare(String(b.clave))),
      atrasoHora: lista
        .filter((row) => row.seccion === 'atraso_hora')
        .sort((a, b) => String(a.clave).localeCompare(String(b.clave))),
      tendencia: lista.filter((row) => row.seccion === 'tendencia'),
      reloj: lista.filter((row) => row.seccion === 'reloj'),
      rojoHora: lista.filter((row) => row.seccion === 'rojo_hora'),
      dia: lista
        .filter((row) => row.seccion === 'dia')
        .sort((a, b) => String(a.clave).localeCompare(String(b.clave))),
    };
  }, [filas]);

  async function cargarTablero(rangoFechas) {
    const inicio = rangoFechas?.inicio || fechaInicio;
    const fin = rangoFechas?.fin || fechaFin;
    const tipo = rangoFechas?.tipo || tipoFecha;
    const cargaId = cargaIdRef.current + 1;
    cargaIdRef.current = cargaId;
    setErrorMessage('');

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
      const response = await fetch('/api/ordenesventa/tablero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fecha_inicio: inicio, fecha_fin: fin, tipo_fecha: tipo }),
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
      setFilas(data.filas || []);
    } catch (error) {
      if (cargaId !== cargaIdRef.current) return;
      setFilas(null);
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
    const rango = fechasDePreset('1s');
    const t = setTimeout(() => cargarTablero({ ...rango, tipo: 'entrega' }), 50);
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
    cargarTablero({ ...rango, tipo: tipoFecha });
  }

  function elegirTipo(tipo) {
    if (tipo === tipoFecha) return;
    setTipoFecha(tipo);
    cargarTablero({ inicio: fechaInicio, fin: fechaFin, tipo });
  }

  const hayDatos = aNumero(cortes.resumen?.ordenes) > 0;
  const ordenesEstado = (clave) => {
    const fila = cortes.estado.find((row) => row.clave === clave);
    return aNumero(fila?.ordenes) || 0;
  };
  const enCurso = ['por_confirmar', 'confirmada', 'alistamiento'].reduce(
    (suma, clave) => suma + ordenesEstado(clave),
    0,
  );
  const totalPeriodo = aNumero(cortes.resumen?.ordenes) || 0;
  const pctAlistadas = totalPeriodo ? (ordenesEstado('alistada') / totalPeriodo) * 100 : 0;

  return (
    <div className="reportes-root" lang="es-MX">
      <div className="rp-page">
        <div className="rp-container">
          <div className="rp-filtros">
            <fieldset className="rp-rango-presets">
              <legend>Tipo de fecha</legend>
              <div className="rp-rango-presets-list" role="radiogroup" aria-label="Tipo de fecha">
                {TIPOS_FECHA_OPERACION.map((item) => (
                  <label
                    key={item.id}
                    className={`rp-rango-chip${tipoFecha === item.id ? ' rp-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="tipo-fecha-operacion"
                      value={item.id}
                      checked={tipoFecha === item.id}
                      disabled={loading}
                      onChange={() => elegirTipo(item.id)}
                    />
                    {item.etiqueta}
                  </label>
                ))}
              </div>
            </fieldset>
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
                      name="rango-operacion"
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
              id="fechaInicioOperacion"
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
              id="fechaFinOperacion"
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
          {loading && !filas && !errorMessage && <div className="rp-empty">Cargando órdenes…</div>}

          {filas && !hayDatos && !errorMessage && (
            <div className="rp-empty">No hay órdenes de venta en ese rango.</div>
          )}

          {filas && hayDatos && (
            <>
              <section className="rp-donde">
                <h2>Dónde estamos</h2>
                <div className="rp-donde-grid">
                  <Kpi tono="verde" etiqueta="OVs del periodo" valor={formatoCantidad(totalPeriodo)} />
                  <Kpi tono="cian" etiqueta="En curso" valor={formatoCantidad(enCurso)} />
                  <Kpi
                    tono="amarillo"
                    etiqueta="% alistadas"
                    valor={`${pctAlistadas.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`}
                  />
                  <Kpi tono="oro" etiqueta="Importe" valor={formatoDinero(cortes.resumen.importe)} ancho />
                  {ESTADOS_KPI.map(([clave, etiqueta, tono]) => (
                    <Kpi key={clave} tono={tono} etiqueta={etiqueta} valor={formatoCantidad(ordenesEstado(clave))} />
                  ))}
                </div>
              </section>
              <GraficoEtapas filas={cortes.etapa} />
              <CicloEtapas filas={cortes.ciclo} />
              <TendenciaMediana filas={cortes.tendencia} />
              <div className="rp-siguientes-grid">
                <EnvejecimientoAbiertas filas={cortes.reloj} />
                <RojoPorHora filas={cortes.rojoHora} />
              </div>
              <div className="rp-charts">
                <Grafico
                  titulo="Importe por día de pedido"
                  labels={cortes.dia.map((row) => isoToDmy(row.clave))}
                  datos={cortes.dia.map((row) => aNumero(row.importe) || 0)}
                  wide
                />
                <Grafico
                  titulo="Órdenes por estado"
                  labels={cortes.estado.map((row) => row.etiqueta)}
                  datos={cortes.estado.map((row) => aNumero(row.ordenes) || 0)}
                />
                <Grafico
                  titulo="Productos más pedidos"
                  labels={cortes.producto.map((row) => row.etiqueta)}
                  datos={cortes.producto.map((row) => aNumero(row.cantidad) || 0)}
                  horizontal
                />
                <Grafico
                  titulo="Órdenes por comprador"
                  labels={cortes.comprador.map((row) => row.etiqueta)}
                  datos={cortes.comprador.map((row) => aNumero(row.ordenes) || 0)}
                  horizontal
                />
                <Grafico
                  titulo="Lo que Mateo sugirió"
                  tipo="doughnut"
                  labels={cortes.coincidencia.map((row) => row.etiqueta)}
                  datos={cortes.coincidencia.map((row) => aNumero(row.cantidad) || 0)}
                />
                <Grafico
                  titulo="Órdenes abiertas según su estado actual"
                  labels={cortes.edad.map((row) => row.etiqueta)}
                  datos={cortes.edad.map((row) => aNumero(row.ordenes) || 0)}
                />
                <Grafico
                  titulo="Movimientos en la bitácora"
                  labels={cortes.evento.map((row) => row.etiqueta)}
                  datos={cortes.evento.map((row) => aNumero(row.cantidad) || 0)}
                  horizontal
                />
                <Grafico
                  titulo="Hora del movimiento (Cancún)"
                  labels={cortes.hora.map((row) => row.etiqueta)}
                  datos={cortes.hora.map((row) => aNumero(row.cantidad) || 0)}
                  wide
                />
                <Grafico
                  titulo="Tiempo hasta quedar confirmada"
                  labels={cortes.confirmacion.map((row) => row.etiqueta)}
                  datos={cortes.confirmacion.map((row) => aNumero(row.ordenes) || 0)}
                />
                <Grafico
                  titulo="Necesitó persona"
                  tipo="doughnut"
                  labels={cortes.actor.map((row) => row.etiqueta)}
                  datos={cortes.actor.map((row) => aNumero(row.ordenes) || 0)}
                />
                <Grafico
                  titulo="Correcciones por día"
                  labels={cortes.correccion.map((row) => isoToDmy(row.clave))}
                  datos={cortes.correccion.map((row) => aNumero(row.ordenes) || 0)}
                  wide
                />
                <Grafico
                  titulo="Atrasos por hora"
                  labels={cortes.atrasoHora.map((row) => row.etiqueta)}
                  datos={cortes.atrasoHora.map((row) => aNumero(row.ordenes) || 0)}
                  wide
                />
              </div>
              <ListadoOperacion titulo="Por estado" columnas={COLUMNAS_ESTADO} filas={cortes.estado} nombre={`operacion_estado_${fechaInicio}_${fechaFin}.xlsx`} />
              <ListadoOperacion titulo="Productos más pedidos" columnas={COLUMNAS_PRODUCTO} filas={cortes.producto} nombre={`operacion_productos_${fechaInicio}_${fechaFin}.xlsx`} />
              <ListadoOperacion titulo="Por comprador" columnas={COLUMNAS_COMPRADOR} filas={cortes.comprador} nombre={`operacion_comprador_${fechaInicio}_${fechaFin}.xlsx`} />
              <ListadoOperacion titulo="Por centro de consumo" columnas={COLUMNAS_CENTRO} filas={cortes.centro} nombre={`operacion_centro_${fechaInicio}_${fechaFin}.xlsx`} />
              <ListadoOrdenesPeriodo accessToken={accessToken} fechaInicio={fechaInicio} fechaFin={fechaFin} tipoFecha={tipoFecha} onSessionInvalid={onSessionInvalid} />
              <ListadoOperacion titulo="Tiempo en el estado actual" columnas={COLUMNAS_EDAD} filas={cortes.edad} nombre={`operacion_edad_${fechaInicio}_${fechaFin}.xlsx`} />
              <ListadoOperacion titulo="Bitácora de la orden" columnas={COLUMNAS_EVENTO} filas={cortes.evento} nombre={`operacion_bitacora_${fechaInicio}_${fechaFin}.xlsx`} />
              <ListadoOperacion titulo="Hora del movimiento" columnas={COLUMNAS_HORA} filas={cortes.hora} nombre={`operacion_hora_${fechaInicio}_${fechaFin}.xlsx`} />
              <ListadoOperacion titulo="Tiempo hasta confirmar" columnas={COLUMNAS_CONFIRMACION} filas={cortes.confirmacion} nombre={`operacion_confirmacion_${fechaInicio}_${fechaFin}.xlsx`} />
            </>
          )}
        </div>
        <p className="rp-footer-note">Supabase · Polaria Mateo</p>
      </div>
    </div>
  );
}

function formatoMinutos(minutos) {
  const total = Math.round(aNumero(minutos) || 0);
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

function tonoCubeta(tope, limite) {
  if (limite == null) return 'rp-seg-cerrada';
  if (tope > limite) return 'rp-seg-atrasada';
  if (tope > limite * 0.75) return 'rp-seg-riesgo';
  return 'rp-seg-tiempo';
}

const CUBETAS_RELOJ = [
  ['015', '0-15', 15],
  ['030', '15-30', 30],
  ['045', '30-45', 45],
  ['060', '45-60', 60],
  ['090', '60-90', 90],
  ['120', '90-120', 120],
  ['121', '>2 h', 121],
];

function TendenciaMediana({ filas }) {
  const ref = useRef(null);
  const graficoRef = useRef(null);
  const dias = [...new Set(filas.map((row) => row.etiqueta))].sort();
  const firma = filas.map((row) => `${row.clave}|${row.etiqueta}|${row.cantidad}`).join(';');

  useEffect(() => {
    graficoRef.current?.destroy();
    graficoRef.current = null;
    if (!ref.current || !dias.length) return undefined;
    graficoRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: dias.map((dia) => isoToDmy(dia)),
        datasets: [
          ...SERIES_TENDENCIA.map(([clave, nombre, color, limite]) => ({
            label: nombre,
            yAxisID: limite == null ? 'minutos' : 'y',
            data: dias.map((dia) => puntoTendencia(
              aNumero(filas.find((item) => item.clave === clave && item.etiqueta === dia)?.cantidad),
              limite,
            )),
            borderColor: color,
            backgroundColor: color,
            spanGaps: true,
            tension: 0.25,
            pointRadius: 2,
            borderWidth: 2,
          })),
          {
            label: '100% del límite',
            data: dias.map(() => 100),
            borderColor: '#f3b3ad',
            borderDash: [4, 4],
            pointRadius: 0,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#c9d4d4' } } },
        scales: {
          x: { ticks: { color: '#8aa89c', maxRotation: 0 }, grid: { color: 'rgba(90, 200, 160, 0.12)' } },
          y: {
            beginAtZero: true,
            ticks: { color: '#8aa89c', callback: (valor) => `${valor} %` },
            grid: { color: 'rgba(90, 200, 160, 0.12)' },
          },
          minutos: {
            position: 'right',
            beginAtZero: true,
            ticks: { color: '#8aa89c', callback: (valor) => `${valor} min` },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
    return () => {
      graficoRef.current?.destroy();
      graficoRef.current = null;
    };
  }, [firma]);

  return (
    <div className="rp-chart-card rp-chart-card-wide rp-ciclo-card">
      <h3>Tendencia · mediana por etapa</h3>
      {dias.length
        ? <div className="rp-chart-wrap"><canvas ref={ref} /></div>
        : <p className="rp-ciclo-vacio">Sin horas de salida por día.</p>}
    </div>
  );
}

function EnvejecimientoAbiertas({ filas }) {
  const cubetas = CUBETAS_RELOJ.map(([id, nombre, tope]) => {
    const partes = SERIES_ABIERTAS.map(([clave, , , limite]) => ({
      clave,
      ordenes: aNumero(filas.find((row) => row.clave === clave && row.etiqueta === id)?.ordenes) || 0,
      tono: tope > limite ? 'rp-seg-atrasada' : tope > limite * 0.75 ? 'rp-seg-riesgo' : 'rp-seg-tiempo',
    }));
    return { id, nombre, ordenes: partes.reduce((suma, parte) => suma + parte.ordenes, 0), partes };
  });
  const maximo = Math.max(...cubetas.map((cubeta) => cubeta.ordenes), 0);

  return (
    <div className="rp-chart-card rp-ciclo-card">
      <h3>Envejecimiento de OVs abiertas</h3>
      <div className="rp-histo">
        {cubetas.map((cubeta) => (
          <div className="rp-histo-col" key={cubeta.id}>
            <div className="rp-histo-track">
              <div className="rp-histo-pila" style={{ height: maximo ? `${(cubeta.ordenes / maximo) * 100}%` : 0 }}>
                {cubeta.partes.filter((parte) => parte.ordenes > 0).map((parte) => (
                  <div key={parte.clave} className={parte.tono} style={{ flex: parte.ordenes }} />
                ))}
              </div>
            </div>
            <span>{cubeta.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RojoPorHora({ filas }) {
  const horas = Array.from({ length: 24 }, (_, hora) => String(hora).padStart(2, '0'));
  return (
    <div className="rp-chart-card rp-ciclo-card">
      <h3>Atrasos por hora del día</h3>
      <div className="rp-rojo">
        {SERIES_TENDENCIA.map(([clave, nombre]) => (
          <div className="rp-rojo-fila" key={clave}>
            <div className="rp-rojo-nombre">{nombre}</div>
            <div className="rp-rojo-horas">
              {horas.map((hora) => {
                const ordenes = aNumero(filas.find((row) => row.clave === clave && row.etiqueta === hora)?.ordenes) || 0;
                return (
                  <div className={ordenes ? 'rp-rojo-celda rp-rojo-llena' : 'rp-rojo-celda'} key={hora}>
                    {ordenes || ''}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="rp-rojo-fila">
          <div className="rp-rojo-nombre" />
          <div className="rp-rojo-eje">
            {horas.map((hora) => (
              <span key={hora}>{Number(hora) % 3 === 0 ? String(Number(hora)) : ''}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CicloPromedio({ filas }) {
  const tramos = ETAPAS_CICLO.map((tramo) => {
    const mediana = filas.find((row) => row.clave === tramo.clave && row.etiqueta === 'mediana');
    const cumple = filas.find((row) => row.clave === tramo.clave && row.etiqueta === 'cumple');
    const ordenes = aNumero(mediana?.ordenes) || 0;
    const promedio = ordenes ? aNumero(cumple?.cantidad) : null;
    return { ...tramo, ordenes, promedio };
  });

  return (
    <div className="rp-chart-card rp-ciclo-vida">
      <h3>Ciclo de vida promedio de una OV</h3>
      <div className="rp-vida">
        {tramos.map((tramo) => {
          const razon = tramo.promedio == null ? 0 : (tramo.limite ? Math.min(tramo.promedio / tramo.limite, 1) : 1);
          const paso = tramo.limite != null && tramo.promedio > tramo.limite;
          return (
            <div className="rp-vida-tramo" key={tramo.clave}>
              <div className="rp-vida-nombre">{`${tramo.nombre} · ${tramo.modo}`}</div>
              <div className={`rp-vida-pista${tramo.promedio == null ? ' rp-vida-vacia' : ''}`}>
                {tramo.promedio != null && (
                  <div
                    className={paso ? 'rp-seg-atrasada' : 'rp-seg-tiempo'}
                    style={{ width: `${razon * 100}%` }}
                  />
                )}
              </div>
              <div className="rp-vida-pie">
                {tramo.promedio == null ? 'Sin hora de salida' : `Promedio ${formatoMinutos(tramo.promedio)}`}
              </div>
              {tramo.presupuesto ? <div className="rp-vida-presupuesto">{`Presupuesto ${tramo.presupuesto}`}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CicloEtapas({ filas }) {
  return (
    <section className="rp-ciclo">
      <h2>Dónde nos estamos quedando</h2>
      <CicloPromedio filas={filas} />
      <p className="rp-etapas-regla">Límites fijos: 60 min, 60 min y 2 h. Revisada, Despachada y Facturada van en minutos, desde la marca anterior.</p>
      <div className="rp-ciclo-grid">
        {ETAPAS_CICLO.map((etapa) => {
          const deLaEtapa = filas.filter((row) => row.clave === etapa.clave);
          const mediana = deLaEtapa.find((row) => row.etiqueta === 'mediana');
          const cumple = deLaEtapa.find((row) => row.etiqueta === 'cumple');
          const total = aNumero(mediana?.ordenes) || 0;
          const dentro = aNumero(cumple?.ordenes) || 0;
          const pct = total ? Math.round((dentro / total) * 100) : 0;
          const cubetas = CUBETAS_CICLO.map(([id, nombre, tope]) => ({
            id,
            nombre,
            tope,
            ordenes: aNumero(deLaEtapa.find((row) => row.etiqueta === id)?.ordenes) || 0,
          }));
          const maximo = Math.max(...cubetas.map((cubeta) => cubeta.ordenes), 0);
          const corte = CUBETAS_CICLO.findIndex((cubeta) => cubeta[2] >= etapa.limite);
          return (
            <div className="rp-chart-card rp-ciclo-card" key={etapa.clave}>
              <h3>{etapa.titulo}</h3>
              {total ? (
                <>
                  <div className="rp-histo">
                    {etapa.limite != null && (
                      <div className="rp-histo-limite" style={{ left: `${((corte + 1) / CUBETAS_CICLO.length) * 100}%` }}>
                        <span>{`Límite ${etapa.limiteTexto}`}</span>
                      </div>
                    )}
                    {cubetas.map((cubeta) => (
                      <div className="rp-histo-col" key={cubeta.id}>
                        <div className="rp-histo-track">
                          <div
                            className={tonoCubeta(cubeta.tope, etapa.limite)}
                            style={{ height: maximo ? `${(cubeta.ordenes / maximo) * 100}%` : 0 }}
                          />
                        </div>
                        <span>{cubeta.nombre}</span>
                      </div>
                    ))}
                  </div>
                  <p className="rp-ciclo-pie">
                    {`Mediana ${formatoMinutos(mediana?.cantidad)} · P90 ${formatoMinutos(mediana?.importe)}${etapa.limite == null ? '' : ` · Cumple ${pct} %`}`}
                  </p>
                </>
              ) : (
                <p className="rp-ciclo-vacio">Sin marcas de cuándo salió de la etapa.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GraficoEtapas({ filas }) {
  const etapas = ETAPAS_GRAFICO.map(([clave, nombre, cerrada]) => {
    const cuenta = (marca) => aNumero(filas.find((row) => row.clave === clave && row.etiqueta === marca)?.ordenes) || 0;
    const enTiempo = cuenta('en_tiempo');
    const atrasada = cuenta('atrasada');
    const cerradas = cuenta('cerrada');
    const total = enTiempo + atrasada + cerradas;
    const abiertas = enTiempo + atrasada;
    const cumple = abiertas ? Math.round((enTiempo / abiertas) * 100) : 0;
    return { clave, nombre, cerrada, enTiempo, atrasada, cerradas, total, abiertas, cumple };
  });
  const maximo = Math.max(...etapas.map((etapa) => etapa.total), 0);
  if (!maximo) return null;

  return (
    <div className="rp-chart-card rp-chart-card-wide rp-etapas">
      <div className="rp-etapas-head">
        <h3>OVs por etapa</h3>
        <div className="rp-etapas-leyenda">
          <span><i className="rp-seg-tiempo" /> En tiempo</span>
          <span><i className="rp-seg-atrasada" /> Atrasada</span>
          <span><i className="rp-seg-cerrada" /> Cerrada</span>
        </div>
      </div>
      <p className="rp-etapas-regla">
        {`En tiempo hasta ${SLA_DIAS} día de diferencia con la fecha de pedido. Si pasa de eso, atrasada.`}
      </p>
      {etapas.map((etapa) => (
        <div className="rp-etapa-fila" key={etapa.clave}>
          <div className="rp-etapa-nombre">{etapa.nombre}</div>
          <div className="rp-etapa-barra">
            {etapa.cerrada ? (
              <span className="rp-seg-cerrada" style={{ width: `${(etapa.cerradas / maximo) * 100}%` }}>
                {(etapa.cerradas / maximo) >= 0.08 ? formatoCantidad(etapa.cerradas) : ''}
              </span>
            ) : (
              <>
                {etapa.enTiempo > 0 && (
                  <span className="rp-seg-tiempo" style={{ width: `${(etapa.enTiempo / maximo) * 100}%` }}>
                    {(etapa.enTiempo / maximo) >= 0.08 ? formatoCantidad(etapa.enTiempo) : ''}
                  </span>
                )}
                {etapa.atrasada > 0 && (
                  <span className="rp-seg-atrasada" style={{ width: `${(etapa.atrasada / maximo) * 100}%` }}>
                    {(etapa.atrasada / maximo) >= 0.08 ? formatoCantidad(etapa.atrasada) : ''}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="rp-etapa-resumen">
            {etapa.cerrada
              ? `${formatoCantidad(etapa.total)} cerradas`
              : `${formatoCantidad(etapa.abiertas)} en curso · ${etapa.cumple}%`}
          </div>
        </div>
      ))}
    </div>
  );
}

function Grafico({ titulo, labels, datos, tipo = 'bar', wide = false, horizontal = false }) {
  const ref = useRef(null);
  const graficoRef = useRef(null);
  const firma = `${tipo}|${horizontal}|${labels.join('\u0001')}|${datos.join('\u0001')}`;

  useEffect(() => {
    graficoRef.current?.destroy();
    graficoRef.current = null;
    if (!ref.current || !labels.length) return undefined;
    const colores = labels.map((_, index) => COLORES[index % COLORES.length]);
    graficoRef.current = new Chart(ref.current, {
      type: tipo,
      data: {
        labels,
        datasets: [{
          data: datos,
          backgroundColor: tipo === 'bar' ? 'rgba(46, 230, 168, 0.75)' : colores,
          borderWidth: 0,
        }],
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: tipo === 'doughnut', labels: { color: '#c9d4d4' } } },
        scales: tipo === 'doughnut' ? {} : {
          x: { ticks: { color: '#8aa89c', maxRotation: horizontal ? 0 : 40 }, grid: { color: 'rgba(90, 200, 160, 0.12)' } },
          y: { ticks: { color: '#8aa89c' }, grid: { color: 'rgba(90, 200, 160, 0.12)' }, beginAtZero: true },
        },
      },
    });
    return () => {
      graficoRef.current?.destroy();
      graficoRef.current = null;
    };
  }, [firma]);

  if (!labels.length) return null;
  return (
    <div className={`rp-chart-card${wide ? ' rp-chart-card-wide' : ''}`}>
      <h3>{titulo}</h3>
      <div className="rp-chart-wrap"><canvas ref={ref} /></div>
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
