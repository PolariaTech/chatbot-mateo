// Nodo n8n: Code (JavaScript). Pegar este archivo completo en "Sugerir pedido".
// Lee supabaseUrl, supabaseKey, schema y codigoCuenta del nodo Config.
// Hace lo mismo que sql/sugerir_productos_n8n.sql, vía REST de Supabase.

const PARADA = new Set([
  'de', 'a', 'y', 'con', 'para', 'por', 'del', 'la', 'el', 'los', 'las', 'en', 'al',
  'gr', 'g', 'kg', 'kilo', 'kilos', 'cm', 'mm', 'pza', 'pz', 'und', 'd',
  'fresco', 'fresca', 'maduro', 'madura'
]);

const COLORES = new Set([
  'rojo', 'roja', 'amarillo', 'amarilla', 'verde', 'blanco', 'blanca',
  'negro', 'negra', 'morado', 'morada', 'rosa', 'azul'
]);

const MUESTRA = [
  '%TOMATE CHERRY%',
  '%TOMATE VERDE%',
  '%PI%A MIEL%',
  '%GRAND SMITH%',
  '%GRANNY SMITH%',
  'NOPALES KILO',
  'PAPA BLANCA',
  'PEPINO VERDE',
  '%CEBOLLETA%',
  'CEBOLLA CAMBRAY',
  'LECHUGA LARGA',
  'LIMON SIN SEMILLA%',
  'LIMON VERDE',
  'LIMON',
  'LIMON AMARILLO%',
  '%PIMIENTO MORRON%',
  'PEPINO%',
  '%CALABACITA%',
  '%SALADET%',
  'TORONJA%',
  'KIWI',
  '%MORA AZUL%',
  'AGUACATE HASS',
  '%AGUACATE HASS GRANDE%',
  '%1ERA%',
  '%HABANERO%',
  '%GUAJILLO%',
  '%PAPAYA%'
];

function detalle(body) {
  if (body == null) return '';
  return typeof body === 'string' ? body : JSON.stringify(body);
}

function traducir(s) {
  return String(s || '').toLowerCase().replace(/[áéíóúüñ¥脩]/g, function (ch) {
    return {
      á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', '¥': 'n', '脩': 'n'
    }[ch];
  });
}

function normProd(t) {
  return traducir(t).replace(/[^a-z0-9]+/g, ' ').trim();
}

function foldTok(tok) {
  let t = traducir(tok).replace(/[^a-z0-9]+/g, '');
  if (!t || /^[0-9]+g?$/.test(t) || PARADA.has(t)) return null;
  if (/ies$/.test(t) && t.length > 4) t = t.replace(/ies$/, 'y');
  else if (t === 'nopales') t = 'nopal';
  else if (t.length > 3 && t.charAt(t.length - 1) === 's') t = t.slice(0, -1);
  if (t === 'pia') t = 'pina';
  if (/^amar+illo$/.test(t)) t = 'amarillo';
  return t;
}

function tokensDe(t) {
  const partes = normProd(t).split(' ');
  const out = [];
  for (let i = 0; i < partes.length; i++) {
    const f = foldTok(partes[i]);
    if (f) out.push(f);
  }
  return out;
}

function aliasTokens(src) {
  if (!src) return [];
  const base = [];
  let hasLimon = false;
  let hasAguacate = false;
  let hasLechuga = false;
  let hasJitomate = false;
  let hasTomate = false;
  let hasCherry = false;
  let hasMora = false;
  let hasAzul = false;
  let hasVerde = false;
  let hasAmarillo = false;
  let hasLarga = false;
  let hasGuajillo = false;
  let hasGrande = false;
  let hasHabanero = false;
  let hasChile = false;
  let hasMorron = false;
  let hasColor = false;
  let hasSmith = false;

  for (let i = 0; i < src.length; i++) {
    let t = src[i];
    if (t === 'pimiento') t = 'chile';
    if (t === 'calabacita') t = 'calabaza';
    if (t === 'saladette' || t === 'saladet') t = 'guaje';
    if (t === 'alechosa') t = 'maradol';
    if (t === 'cantaloupe' || t === 'cantaloup') t = 'chino';
    if (t === 'tayota') t = 'chayote';
    if (t === '1era' || t === '1ra') t = 'primera';
    if (t === 'cebolleta') t = 'cebolla';
    if (t === 'cherry' || t === 'cherri') t = 'cherry';
    if (/blu/.test(t) && /berr/.test(t) && t.length >= 6) t = 'blueberry';

    if (t === 'limon') hasLimon = true;
    if (t === 'aguacate') hasAguacate = true;
    if (t === 'lechuga') hasLechuga = true;
    if (t === 'jitomate') hasJitomate = true;
    if (t === 'tomate') hasTomate = true;
    if (t === 'cherry') hasCherry = true;
    if (t === 'mora') hasMora = true;
    if (t === 'azul') hasAzul = true;
    if (t === 'verde') hasVerde = true;
    if (t === 'amarillo' || t === 'amarilla') hasAmarillo = true;
    if (t === 'larga') hasLarga = true;
    if (t === 'guajillo') hasGuajillo = true;
    if (t === 'grande') hasGrande = true;
    if (t === 'habanero') hasHabanero = true;
    if (t === 'chile') hasChile = true;
    if (t === 'morron') hasMorron = true;
    if (t === 'smith') hasSmith = true;
    if (t === 'rojo' || t === 'roja' || t === 'verde' || t === 'amarillo' || t === 'amarilla') hasColor = true;
    base.push(t);
  }

  const out = [];
  for (let i = 0; i < base.length; i++) {
    let t = base[i];
    if (hasLechuga && hasLarga && t === 'larga') {
      t = 'orejona';
    } else if (hasLimon && hasVerde && !hasAmarillo && t === 'verde') {
      continue;
    } else if (hasLimon && hasAmarillo && (t === 'amarillo' || t === 'amarilla')) {
      t = 'eureka';
    } else if ((hasJitomate || (hasTomate && !hasVerde && !hasCherry)) && hasGuajillo && t === 'guajillo') {
      t = 'guaje';
    } else if (hasTomate && !hasVerde && !hasCherry && t === 'tomate') {
      t = 'jitomate';
    } else if (hasTomate && hasVerde && (t === 'limpio' || t === 'limpia' || t === 'cascara')) {
      continue;
    } else if (hasAguacate && hasGrande && t === 'grande') {
      t = 'extra';
    } else if (hasMora && hasAzul && (t === 'mora' || t === 'azul')) {
      continue;
    } else if (hasSmith && t === 'grand') {
      t = 'granny';
    }
    out.push(t);
  }

  if (hasMora && hasAzul && out.indexOf('blueberry') === -1) out.push('blueberry');
  if (hasHabanero && !hasChile) out.push('chile');
  if (hasChile && hasColor && !hasMorron && !hasHabanero) out.push('morron');
  return out;
}

function levenshtein(a, b) {
  a = a || '';
  b = b || '';
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ca = a.charAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const costo = ca === b.charAt(j - 1) ? 0 : 1;
      const ins = curr[j - 1] + 1;
      const del = prev[j] + 1;
      const sub = prev[j - 1] + costo;
      curr[j] = ins < del ? (ins < sub ? ins : sub) : (del < sub ? del : sub);
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[n];
}

function rangoDe(norm) {
  const m = String(norm || '').match(/([0-9]+)[^0-9]+([0-9]+)/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (a <= b) return [a, b];
  return null;
}

function prepararPedido(texto) {
  const ped = aliasTokens(tokensDe(texto));
  const n = ped.length;
  if (n === 0) return null;
  const uni = [];
  for (let i = 0; i < n; i++) {
    if (i < n - 1) uni.push(ped[i] + ped[i + 1]);
    if (i + 1 < n - 1) uni.push(ped[i] + ped[i + 1] + ped[i + 2]);
  }
  const base = ped.concat(uni);
  const exacto = new Set(base);
  return { ped: ped, pr: rangoDe(normProd(texto)), nEmail: n, base: base, exacto: exacto };
}

function parseCatalogo(descripcion) {
  const texto = String(descripcion || '').trim();
  const opc = new Set();
  const reParen = /\(([^)]*)\)/g;
  let m;
  while ((m = reParen.exec(texto))) {
    const partes = m[1].split(' ');
    for (let i = 0; i < partes.length; i++) {
      const tok = foldTok(partes[i]);
      if (tok && tok !== 'domo' && tok.indexOf('congelad') !== 0) opc.add(tok);
    }
  }

  const mand = [];
  const grupos = [];
  const piezas = texto ? texto.split(/\s+/) : [];
  for (let i = 0; i < piezas.length; i++) {
    const pieza = piezas[i];
    if (pieza.indexOf('/') !== -1) {
      const grupo = [];
      const lados = pieza.split('/');
      for (let k = 0; k < lados.length; k++) {
        const tok = foldTok(lados[k]);
        if (tok) grupo.push(tok);
      }
      if (grupo.length) grupos.push(grupo);
    } else {
      const tok = foldTok(pieza);
      if (tok) mand.push(tok);
    }
  }

  if (!mand.length && !grupos.length) return null;
  const catWords = mand.slice();
  for (let g = 0; g < grupos.length; g++) {
    for (let k = 0; k < grupos[g].length; k++) catWords.push(grupos[g][k]);
  }
  return {
    mand: mand,
    grupos: grupos,
    opc: opc,
    catWords: catWords,
    cr: rangoDe(normProd(texto)),
    descripcion: texto,
    largo: texto.length
  };
}

function tokenCubre(prep, palabra) {
  if (!palabra) return false;
  if (prep.exacto.has(palabra)) return true;
  const lp = palabra.length;
  const base = prep.base;
  for (let i = 0; i < base.length; i++) {
    const u = base[i];
    const lu = u.length;
    const menor = lp < lu ? lp : lu;
    const diff = lp > lu ? lp - lu : lu - lp;
    if (menor >= 6 && diff <= 2 && levenshtein(palabra, u) <= 1) return true;
  }
  return false;
}

function evaluar(prep, cat) {
  let cubM = 0;
  let mandOk = true;
  const nEmail = prep.nEmail;
  for (let i = 0; i < cat.mand.length; i++) {
    const tok = cat.mand[i];
    const esOpc = cat.opc.has(tok)
      || tok === 'persa' || tok === 'local' || tok === 'maradol'
      || (nEmail === 1 && (tok === 'verde' || tok === 'blanco' || tok === 'blanca'));
    if (tokenCubre(prep, tok)) cubM += 1;
    else if (!esOpc) mandOk = false;
  }

  let cubS = 0;
  let sinOk = true;
  for (let g = 0; g < cat.grupos.length; g++) {
    let hits = 0;
    const grupo = cat.grupos[g];
    for (let k = 0; k < grupo.length; k++) {
      if (tokenCubre(prep, grupo[k])) hits += 1;
    }
    if (hits === 0) sinOk = false;
    cubS += hits;
  }

  let colorOk = true;
  let pedTieneColor = false;
  let catTieneColor = false;
  let compartenColor = false;
  for (let i = 0; i < prep.ped.length; i++) {
    if (COLORES.has(prep.ped[i])) pedTieneColor = true;
  }
  for (let i = 0; i < cat.catWords.length; i++) {
    if (COLORES.has(cat.catWords[i])) catTieneColor = true;
  }
  if (pedTieneColor && catTieneColor) {
    const setCat = new Set(cat.catWords);
    for (let i = 0; i < prep.ped.length; i++) {
      if (COLORES.has(prep.ped[i]) && setCat.has(prep.ped[i])) compartenColor = true;
    }
    if (!compartenColor) colorOk = false;
  }

  let shared = 0;
  const setWords = new Set(cat.catWords);
  for (let i = 0; i < prep.ped.length; i++) {
    if (prep.ped[i].length >= 4 && setWords.has(prep.ped[i])) shared += 1;
  }

  const pr = prep.pr;
  const cr = cat.cr;
  const rangoSi = !!(pr && cr && pr[0] >= cr[0] && pr[1] <= cr[1] && shared > 0);
  const palabra = mandOk && sinOk && colorOk
    && (cat.mand.length > 0 || cat.grupos.length > 0)
    && (cubM + cubS) > 0;

  if (palabra || rangoSi) {
    return {
      cubiertas: palabra ? cubM + cubS : shared,
      rango_ok: rangoSi ? 1 : 0,
      ancho: rangoSi ? cr[1] - cr[0] : 1000000,
      puntaje: 1
    };
  }

  const izq = prep.ped.join(' ');
  const der = cat.catWords.join(' ');
  if (izq && der) {
    const dist = levenshtein(izq, der);
    const mayor = izq.length > der.length ? izq.length : der.length;
    if (dist * 20 <= mayor) {
      return { cubiertas: 0, rango_ok: 0, ancho: 1000000, puntaje: 1 - dist / mayor };
    }
  }
  return null;
}

function esMejor(nuevo, actual) {
  if (nuevo.cubiertas !== actual.cubiertas) return nuevo.cubiertas > actual.cubiertas;
  if (nuevo.rango_ok !== actual.rango_ok) return nuevo.rango_ok > actual.rango_ok;
  if (nuevo.ancho !== actual.ancho) return nuevo.ancho < actual.ancho;
  if (nuevo.puntaje !== actual.puntaje) return nuevo.puntaje > actual.puntaje;
  return nuevo.largo > actual.largo;
}

function mejorDe(producto, catalogo) {
  const prep = prepararPedido(producto);
  if (!prep) return null;
  let mejor = null;
  for (let i = 0; i < catalogo.length; i++) {
    const ev = evaluar(prep, catalogo[i]);
    if (!ev) continue;
    const candidato = {
      id_producto: catalogo[i].id_producto,
      sku: catalogo[i].sku,
      descripcion: catalogo[i].descripcion,
      largo: catalogo[i].largo,
      cubiertas: ev.cubiertas,
      rango_ok: ev.rango_ok,
      ancho: ev.ancho,
      puntaje: ev.puntaje
    };
    if (!mejor || esMejor(candidato, mejor)) mejor = candidato;
  }
  return mejor;
}

function ilike(valor, patron) {
  const rx = '^' + String(patron)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.') + '$';
  return new RegExp(rx, 'i').test(String(valor));
}

function eqFiltro(col, valor) {
  const quoted = '"' + String(valor).replace(/"/g, '""') + '"';
  return col + '=eq.' + encodeURIComponent(quoted);
}

function mismo(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

async function pedirOk(pedir, opts, etiqueta) {
  let res;
  try {
    res = await pedir(Object.assign({
      json: true,
      returnFullResponse: true,
      ignoreHttpStatusErrors: true
    }, opts));
  } catch (e) {
    const data = (e && e.response && (e.response.data || e.response.body)) || (e && e.message);
    throw new Error(etiqueta + ': ' + detalle(data));
  }
  const status = res && res.statusCode ? res.statusCode : 200;
  const body = res && res.statusCode ? res.body : res;
  if (status === 416) return [];
  if (status < 200 || status >= 300) {
    throw new Error(etiqueta + ' ' + status + ': ' + detalle(body));
  }
  return Array.isArray(body) ? body : [];
}

async function traerTodo(pedir, headers, url, etiqueta) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const pagina = await pedirOk(pedir, {
      method: 'GET',
      url: url,
      headers: Object.assign({}, headers, {
        Range: from + '-' + (from + pageSize - 1),
        Prefer: 'count=none'
      })
    }, etiqueta);
    for (let i = 0; i < pagina.length; i++) rows.push(pagina[i]);
    if (pagina.length < pageSize) break;
  }
  return rows;
}

async function ejecutar(pedir, cfg) {
  const base = String(cfg.supabaseUrl || '').replace(/\/+$/, '');
  const key = cfg.supabaseKey || '';
  const schema = cfg.schema || '';
  const codigo = cfg.codigoCuenta || '49M04';

  if (!base || !key || !schema) {
    throw new Error('Falta supabaseUrl, supabaseKey o schema en el nodo Config.');
  }

  const headers = {
    apikey: key,
    Authorization: 'Bearer ' + key,
    Accept: 'application/json',
    'Accept-Profile': schema,
    'Content-Profile': schema
  };

  const filasProducto = await traerTodo(
    pedir,
    headers,
    base + '/rest/v1/producto?select=id_producto,sku,descripcion&'
      + eqFiltro('codigo_cuenta', codigo)
      + '&esta_activo=eq.true&order=id_producto.asc',
    'GET producto'
  );

  const catalogo = [];
  for (let i = 0; i < filasProducto.length; i++) {
    const descripcion = filasProducto[i].descripcion == null ? '' : String(filasProducto[i].descripcion).trim();
    if (!descripcion) continue;
    const parsed = parseCatalogo(descripcion);
    if (!parsed) continue;
    parsed.id_producto = filasProducto[i].id_producto;
    parsed.sku = filasProducto[i].sku;
    catalogo.push(parsed);
  }

  const filasPedido = await traerTodo(
    pedir,
    headers,
    base + '/rest/v1/pedido?select=producto,id_producto_sugerido,sku_sugerido,nombre_sugerido&order=id_pedido.asc',
    'GET pedido'
  );

  const grupos = new Map();
  for (let i = 0; i < filasPedido.length; i++) {
    const producto = filasPedido[i].producto;
    if (producto == null || String(producto).trim() === '') continue;
    const keyProd = String(producto);
    if (!grupos.has(keyProd)) grupos.set(keyProd, []);
    grupos.get(keyProd).push(filasPedido[i]);
  }

  const trabajos = [];
  grupos.forEach(function (rows, producto) {
    const sugerido = mejorDe(producto, catalogo);
    const idNuevo = sugerido ? sugerido.id_producto : null;
    const skuNuevo = sugerido ? sugerido.sku : null;
    const nombreNuevo = sugerido ? sugerido.descripcion : 'No encontrado';
    let cambia = false;
    for (let i = 0; i < rows.length; i++) {
      if (!mismo(rows[i].id_producto_sugerido, idNuevo)
        || !mismo(rows[i].sku_sugerido, skuNuevo)
        || !mismo(rows[i].nombre_sugerido, nombreNuevo)) {
        cambia = true;
        break;
      }
    }
    trabajos.push({
      producto: producto,
      filas: rows.length,
      idNuevo: idNuevo,
      skuNuevo: skuNuevo,
      nombreNuevo: nombreNuevo,
      cambia: cambia
    });
  });

  const pendientes = [];
  for (let i = 0; i < trabajos.length; i++) {
    if (trabajos[i].cambia) pendientes.push(trabajos[i]);
  }

  const lote = 8;
  for (let i = 0; i < pendientes.length; i += lote) {
    const parte = pendientes.slice(i, i + lote);
    await Promise.all(parte.map(function (job) {
      return pedirOk(pedir, {
        method: 'PATCH',
        url: base + '/rest/v1/pedido?' + eqFiltro('producto', job.producto),
        headers: Object.assign({}, headers, {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        }),
        body: {
          id_producto_sugerido: job.idNuevo,
          sku_sugerido: job.skuNuevo,
          nombre_sugerido: job.nombreNuevo
        }
      }, 'PATCH pedido ' + job.producto);
    }));
  }

  const muestra = [];
  for (let i = 0; i < trabajos.length; i++) {
    const job = trabajos[i];
    let entra = false;
    for (let p = 0; p < MUESTRA.length; p++) {
      if (ilike(job.producto, MUESTRA[p])) {
        entra = true;
        break;
      }
    }
    if (!entra) continue;
    muestra.push({
      producto: job.producto,
      nombre_sugerido: job.nombreNuevo,
      sku_sugerido: job.skuNuevo,
      filas: job.filas
    });
  }
  muestra.sort(function (a, b) {
    if (a.producto < b.producto) return -1;
    if (a.producto > b.producto) return 1;
    return 0;
  });

  if (!muestra.length) {
    return [{
      json: {
        ok: true,
        productos: trabajos.length,
        actualizados: pendientes.length,
        muestra: 0
      }
    }];
  }

  return muestra.map(function (row) {
    return { json: row };
  });
}

if (typeof $ !== 'undefined') {
  const cfg = $('Config').first().json || {};
  const pedir = (opts) => this.helpers.httpRequest(opts);
  return ejecutar(pedir, cfg);
}
