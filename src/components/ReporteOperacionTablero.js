'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const DINERO = { importe: true };

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

const COLUMNAS_COINCIDENCIA = [
  ['etiqueta', 'Resultado'],
  ['ordenes', 'Órdenes'],
  ['cantidad', 'Líneas'],
];

const COLUMNAS_SUSTITUCION = [
  ['etiqueta', 'Mateo sugirió → quedó'],
  ['ordenes', 'Veces'],
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

const ESTADOS_KPI = [
  ['por_confirmar', 'Por confirmar', 'verde'],
  ['confirmada', 'Confirmadas', 'cian'],
  ['alistamiento', 'En alistamiento', 'rosa'],
  ['alistada', 'Alistadas', 'gris'],
];

// Mismo 1 que el bloque "etapa" de sql/get_operacion_ordenes.sql.
// Hasta 1 día entre la fecha de pedido y hoy: en tiempo. Más de 1 día: atrasada.
// Luego este valor sale de una tabla de parámetros.
const SLA_DIAS = 1;

// Mismos minutos que el bloque "ciclo" de sql/get_operacion_ordenes.sql.
// Luego estos tres límites salen de una tabla de parámetros.
const LIMITES_CICLO = [
  { clave: '0', titulo: 'Tiempo en Por confirmar', limite: 60, limiteTexto: '60 min' },
  { clave: '1', titulo: 'Tiempo en Confirmada', limite: 60, limiteTexto: '60 min' },
  { clave: '2', titulo: 'Tiempo en Alistamiento', limite: 120, limiteTexto: '2 h' },
];

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

const ETAPAS_GRAFICO = [
  ['0', 'Por confirmar', false],
  ['1', 'Confirmada', false],
  ['2', 'Alistamiento', false],
  ['3', 'Alistada', true],
];

const COLORES = ['#2ee6a8', '#19e3c8', '#7ee9da', '#e6c84a', '#f3b3ad', '#8aa89c', '#4cc38a', '#c9d4d4'];

const RANGOS_PRESET = [
  { id: '1s', label: 'Última semana', semanas: 1 },
  { id: '2s', label: 'Últimas 2 semanas', semanas: 2 },
  { id: '3s', label: 'Últimas 3 semanas', semanas: 3 },
  { id: '4s', label: 'Últimas 4 semanas', semanas: 4 },
  { id: '1m', label: 'Último mes', meses: 1 },
  { id: '3m', label: 'Últimos 3 meses', meses: 3 },
  { id: '6m', label: 'Últimos 6 meses', meses: 6 },
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
  return { inicio: isoDesdeFechaLocal(inicio), fin: isoDesdeFechaLocal(hoy) };
}

function fechasMesesHastaHoy(cantidadMeses) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidadMeses - 1), 1);
  return { inicio: isoDesdeFechaLocal(inicio), fin: isoDesdeFechaLocal(hoy) };
}

function fechasDePreset(presetId) {
  const preset = RANGOS_PRESET.find((item) => item.id === presetId);
  if (!preset) return null;
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
  const match = String(value || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
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
  if (DINERO[columna]) return formatoDinero(valor);
  if (columna === 'cantidad' || columna === 'ordenes') return formatoCantidad(valor);
  return String(valor);
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
      estado: de('estado', 'ordenes'),
      centro: de('centro'),
      producto: de('producto', 'cantidad'),
      comprador: de('comprador', 'ordenes'),
      coincidencia: de('coincidencia', 'cantidad'),
      sustitucion: de('sustitucion', 'ordenes').slice(0, 15),
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
      dia: lista
        .filter((row) => row.seccion === 'dia')
        .sort((a, b) => String(a.clave).localeCompare(String(b.clave))),
    };
  }, [filas]);

  async function cargarTablero(rangoFechas) {
    const inicio = rangoFechas?.inicio || fechaInicio;
    const fin = rangoFechas?.fin || fechaFin;
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
              <div className="rp-result-header"><h2>Por estado</h2></div>
              <Tabla columnas={COLUMNAS_ESTADO} filas={cortes.estado} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Productos más pedidos</h2></div>
              <Tabla columnas={COLUMNAS_PRODUCTO} filas={cortes.producto} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Por comprador</h2></div>
              <Tabla columnas={COLUMNAS_COMPRADOR} filas={cortes.comprador} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Por centro de consumo</h2></div>
              <Tabla columnas={COLUMNAS_CENTRO} filas={cortes.centro} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Coincidencia del producto</h2></div>
              <Tabla columnas={COLUMNAS_COINCIDENCIA} filas={cortes.coincidencia} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Sustituciones</h2></div>
              <Tabla columnas={COLUMNAS_SUSTITUCION} filas={cortes.sustitucion} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Tiempo en el estado actual</h2></div>
              <Tabla columnas={COLUMNAS_EDAD} filas={cortes.edad} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Bitácora de la orden</h2></div>
              <Tabla columnas={COLUMNAS_EVENTO} filas={cortes.evento} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Hora del movimiento</h2></div>
              <Tabla columnas={COLUMNAS_HORA} filas={cortes.hora} rowKey={(row) => row.clave} />
              <div className="rp-result-header"><h2>Tiempo hasta confirmar</h2></div>
              <Tabla columnas={COLUMNAS_CONFIRMACION} filas={cortes.confirmacion} rowKey={(row) => row.clave} />
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
  if (tope > limite) return 'rp-seg-atrasada';
  if (tope > limite * 0.75) return 'rp-seg-riesgo';
  return 'rp-seg-tiempo';
}

function CicloEtapas({ filas }) {
  return (
    <section className="rp-ciclo">
      <h2>Dónde nos estamos quedando</h2>
      <p className="rp-etapas-regla">Límites fijos: 60 min, 60 min y 2 h. Cada barra es el tiempo hasta salir de la etapa.</p>
      <div className="rp-ciclo-grid">
        {LIMITES_CICLO.map((etapa) => {
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
                    <div className="rp-histo-limite" style={{ left: `${((corte + 1) / CUBETAS_CICLO.length) * 100}%` }}>
                      <span>{`Límite ${etapa.limiteTexto}`}</span>
                    </div>
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
                    {`Mediana ${formatoMinutos(mediana?.cantidad)} · P90 ${formatoMinutos(mediana?.importe)} · Cumple ${pct} %`}
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

function Tabla({ columnas, filas, rowKey }) {
  return (
    <div className="rp-table-container">
      <table>
        <thead>
          <tr>
            {columnas.map(([key, label]) => (
              <th key={key} className={DINERO[key] || key === 'cantidad' || key === 'ordenes' ? 'rp-num' : ''}>{label}</th>
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
              <tr key={rowKey(row, index)}>
                {columnas.map(([key]) => (
                  <td key={key} className={DINERO[key] || key === 'cantidad' || key === 'ordenes' ? 'rp-num' : ''}>
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
