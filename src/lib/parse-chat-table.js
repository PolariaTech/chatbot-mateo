function splitPipeRow(line) {
  const trimmed = line.trim();
  const inner = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutEnd = inner.endsWith('|') ? inner.slice(0, -1) : inner;
  return withoutEnd.split('|').map((cell) => cell.trim());
}

function isPipeDataRow(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return splitPipeRow(trimmed).length >= 2;
}

function isPipeSepRow(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('-') || !trimmed.includes('|')) return false;
  const cells = splitPipeRow(trimmed);
  if (cells.length < 2) return false;
  return cells.every((cell) => cell === '' || /^:?-{1,}:?$/.test(cell));
}

function normalizeRow(cells, width) {
  const next = cells.slice(0, width);
  while (next.length < width) next.push('');
  return next;
}

function tryConsumeTable(lines, start) {
  if (!isPipeDataRow(lines[start]) || isPipeSepRow(lines[start])) return null;

  const headers = splitPipeRow(lines[start]);
  if (headers.length < 2) return null;

  let i = start + 1;
  const rows = [];

  if (i < lines.length && isPipeSepRow(lines[i])) {
    i += 1;
  }

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) break;
    if (isPipeSepRow(trimmed)) {
      i += 1;
      continue;
    }
    if (!isPipeDataRow(trimmed)) break;

    const cells = splitPipeRow(trimmed);
    if (Math.abs(cells.length - headers.length) > 2) break;
    rows.push(normalizeRow(cells, headers.length));
    i += 1;
  }

  if (rows.length === 0) return null;
  return { block: { type: 'table', headers, rows }, next: i };
}

const RANK_RE = /^(\d{1,3})[.)]\s+(.+)$/;
const HAS_LINK_RE = /https?:\/\//i;
const MONEY_TAIL_RE = /^(.*?)\s+[-–—]\s+(\$[\d,]+(?:\.\d{2})?.*)$/;
const MONEY_SPACE_RE = /^(.*?)\s+(\$[\d,]+(?:\.\d{2})?)\s*$/;

function splitRankBody(body) {
  const dashed = body.match(MONEY_TAIL_RE);
  if (dashed) return { label: dashed[1].trim(), value: dashed[2].trim() };
  const spaced = body.match(MONEY_SPACE_RE);
  if (spaced) return { label: spaced[1].trim(), value: spaced[2].trim() };
  return { label: body.trim(), value: '' };
}

function tryConsumeRanking(lines, start) {
  const first = RANK_RE.exec(lines[start].trim());
  if (!first) return null;

  const items = [];
  let i = start;
  let expected = Number(first[1]);

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const match = RANK_RE.exec(trimmed);
    if (!match || Number(match[1]) !== expected) break;

    let body = match[2];
    i += 1;

    if (HAS_LINK_RE.test(body) || /\[[^\]]*\]\(/.test(body)) return null;

    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) break;
      if (RANK_RE.test(next) || isPipeDataRow(next) || isPipeSepRow(next)) break;
      if (HAS_LINK_RE.test(next) || /\[[^\]]*\]\(/.test(next)) break;
      if (!/^\$?[\d,]/.test(next) && !/MXN|USD|EUR/i.test(next)) break;
      body += ` ${next}`;
      i += 1;
    }

    items.push({ rank: expected, ...splitRankBody(body) });
    expected += 1;
  }

  if (items.length < 2) return null;
  return { block: { type: 'ranking', items, valueHeader: 'Importe' }, next: i };
}

const BULLET_PREFIX_RE = /^(?:(?:\*(?!\*)|[-•])\s+)/;
const QTY_TAIL_RE = /^(.*?)\s+(-?[\d]{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+\.\d+)\s*$/;
const QTY_COLON_RE = /^(.*?)\s*[:：]\s*(-?[\d]{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+\.\d+)\s*$/;

function looksLikeName(label) {
  const text = String(label || '').trim();
  if (text.length < 2 || text.length > 120) return false;
  if (/^https?:\/\//i.test(text)) return false;
  return /[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]/.test(text);
}

function parseQuantityLine(rawLine) {
  const trimmed = String(rawLine || '').trim();
  if (
    !trimmed ||
    HAS_LINK_RE.test(trimmed) ||
    RANK_RE.test(trimmed) ||
    isPipeDataRow(trimmed) ||
    isPipeSepRow(trimmed)
  ) {
    return null;
  }

  const body = trimmed.replace(BULLET_PREFIX_RE, '').replace(/\*+/g, '').trim();
  const colon = QTY_COLON_RE.exec(body);
  if (colon && looksLikeName(colon[1])) {
    return { label: colon[1].trim(), value: colon[2] };
  }

  const spaced = QTY_TAIL_RE.exec(body);
  if (spaced && looksLikeName(spaced[1])) {
    return { label: spaced[1].trim(), value: spaced[2] };
  }

  return null;
}

function tryConsumeKeyValueList(lines, start) {
  const items = [];
  let i = start;

  while (i < lines.length) {
    const parsed = parseQuantityLine(lines[i]);
    if (!parsed) break;
    items.push(parsed);
    i += 1;
  }

  if (items.length < 2) return null;

  return {
    block: {
      type: 'ranking',
      valueHeader: 'Cantidad',
      items: items.map((item, index) => ({
        rank: index + 1,
        label: item.label,
        value: item.value,
      })),
    },
    next: i,
  };
}

export function parseChatBlocks(raw) {
  const normalized = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const blocks = [];
  let i = 0;
  let paragraphBuf = [];

  const flushParagraph = () => {
    if (paragraphBuf.length === 0) return;
    const text = paragraphBuf.join('\n').trim();
    paragraphBuf = [];
    if (text) blocks.push({ type: 'paragraph', text });
  };

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      const pending = paragraphBuf.join('\n');
      if (/\[[^\]]*\]\([^)]*$/.test(pending)) {
        i += 1;
        continue;
      }
      flushParagraph();
      i += 1;
      continue;
    }

    const table = tryConsumeTable(lines, i);
    if (table) {
      flushParagraph();
      blocks.push(table.block);
      i = table.next;
      continue;
    }

    const ranking = tryConsumeRanking(lines, i);
    if (ranking) {
      flushParagraph();
      blocks.push(ranking.block);
      i = ranking.next;
      continue;
    }

    const kvList = tryConsumeKeyValueList(lines, i);
    if (kvList) {
      flushParagraph();
      blocks.push(kvList.block);
      i = kvList.next;
      continue;
    }

    paragraphBuf.push(trimmed);
    i += 1;
  }

  flushParagraph();
  return blocks;
}

export function hasChatTable(raw) {
  return parseChatBlocks(raw).some((block) => block.type === 'table');
}
