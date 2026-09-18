import { stripEmojis } from '../lib/strip-emojis';

export default function ChatTable({ headers = [], rows = [] }) {
  const cols = headers.map((header) => stripEmojis(header));
  return (
    <div className="chat-table-root">
      <div className="chat-table-wrap">
        <table className="chat-table">
          <thead>
            <tr>
              {cols.map((header, headerIndex) => (
                <th key={`h-${headerIndex}-${header}`} scope="col">
                  {header || '—'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={cols.length}>—</td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {cols.map((_, cellIndex) => (
                    <td
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className={cellIndex === 0 ? 'chat-table__lead' : undefined}
                    >
                      <span>{stripEmojis(row[cellIndex]) || '—'}</span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
