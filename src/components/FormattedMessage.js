import React from 'react';

const BULLET_RE = /^(\*(?!\*)|[\-•])\s*(.+)$/;
const EMOJI_HEADER_RE = /^(\p{Extended_Pictographic})\s*(.+)$/u;
const TITLE_HINT_RE = /reporte|resumen|maestro|informe|dashboard/i;
const CURRENCY_RE = /(\$[\d,]+(?:\.\d{2})?)(\s*(?:MXN|USD|EUR))?/gi;
const BOLD_SPLIT_RE = /(\*\*.+?\*\*)/g;

function stripStrayBoldMarkers(text) {
  return text.replace(/\*\*/g, '');
}

function renderCurrencySpans(text, keyPrefix = '') {
  const parts = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(CURRENCY_RE)) {
    const [full, amount, currency = ''] = match;
    const start = match.index ?? 0;

    if (start > lastIndex) {
      parts.push(stripStrayBoldMarkers(text.slice(lastIndex, start)));
    }

    parts.push(
      <span key={`${keyPrefix}c${key++}`} className="report-metric__amount">
        {amount}
        {currency && <span className="report-metric__currency">{currency}</span>}
      </span>
    );

    lastIndex = start + full.length;
  }

  if (parts.length === 0) {
    return <span className="report-metric__amount">{stripStrayBoldMarkers(text)}</span>;
  }

  if (lastIndex < text.length) {
    parts.push(stripStrayBoldMarkers(text.slice(lastIndex)));
  }

  return parts;
}

function renderFormattedText(text, { highlightCurrency = false } = {}) {
  if (!text) return null;

  const pieces = text.split(BOLD_SPLIT_RE).filter((piece) => piece.length > 0);
  if (pieces.length === 0) return stripStrayBoldMarkers(text);

  return pieces.map((piece, index) => {
    const boldMatch = piece.match(/^\*\*(.+)\*\*$/s);
    const content = boldMatch ? boldMatch[1] : piece;
    const rendered = highlightCurrency
      ? renderCurrencySpans(content, `${index}-`)
      : stripStrayBoldMarkers(content);

    if (boldMatch) {
      return <strong key={index}>{rendered}</strong>;
    }

    return <React.Fragment key={index}>{rendered}</React.Fragment>;
  });
}

function splitLabelValue(text) {
  const colonIdx = text.indexOf(':');
  if (colonIdx <= 0) return { label: text, value: null };
  return {
    label: text.slice(0, colonIdx).trim(),
    value: text.slice(colonIdx + 1).trim(),
  };
}

function parseReport(text) {
  const lines = text.split('\n');
  let title = null;
  const sections = [];
  let currentSection = null;
  const plainLines = [];
  let hasStructure = false;

  const pushSection = () => {
    if (currentSection && (currentSection.items.length > 0 || currentSection.title)) {
      sections.push(currentSection);
    }
    currentSection = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      hasStructure = true;
      if (!currentSection) currentSection = { title: null, items: [] };
      currentSection.items.push(splitLabelValue(bulletMatch[1]));
      continue;
    }

    const headerMatch = line.match(EMOJI_HEADER_RE);
    if (headerMatch) {
      hasStructure = true;
      const [, emoji, headerText] = headerMatch;

      if (!title && TITLE_HINT_RE.test(headerText)) {
        title = { emoji, text: headerText };
        continue;
      }

      pushSection();
      currentSection = { title: { emoji, text: headerText }, items: [] };
      continue;
    }

    plainLines.push(line);
  }

  pushSection();

  if (!hasStructure) return { type: 'plain', text };

  return { type: 'report', title, sections };
}

export default function FormattedMessage({ text }) {
  const parsed = parseReport(text);

  if (parsed.type === 'plain') {
    return (
      <div className="message-content message-content--plain">
        {text.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {index > 0 && <br />}
            {renderFormattedText(line)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="message-content message-content--report">
      {parsed.title && (
        <header className="report-title">
          <span className="report-title__emoji" aria-hidden="true">
            {parsed.title.emoji}
          </span>
          <span className="report-title__text">
            {renderFormattedText(parsed.title.text)}
          </span>
        </header>
      )}

      <div className="report-body">
        {parsed.sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className="report-section">
            {section.title && (
              <h3 className="report-section__header">
                <span className="report-section__emoji" aria-hidden="true">
                  {section.title.emoji}
                </span>
                <span>{renderFormattedText(section.title.text)}</span>
              </h3>
            )}

            {section.items.length > 0 && (
              <ul className="report-metrics">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="report-metric">
                    <span className="report-metric__label">
                      {renderFormattedText(item.label)}
                    </span>
                    {item.value && (
                      <span className="report-metric__value">
                        {renderFormattedText(item.value, { highlightCurrency: true })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
