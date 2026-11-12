import { presentarCelda } from '../lib/recortar-texto-tabla';
import { stripEmojis } from '../lib/strip-emojis';

export default function ChatRanking({ items = [], valueHeader = 'Importe' }) {
  const showValue = items.some((item) => item.value);

  return (
    <div className="chat-table-root chat-ranking-root">
      <div className="chat-table-wrap">
        <table className="chat-table chat-ranking">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Nombre</th>
              {showValue ? <th scope="col">{valueHeader}</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const nombre = presentarCelda(stripEmojis(item.label));
              const valor = presentarCelda(stripEmojis(item.value));
              return (
                <tr key={`rank-${item.rank}-${item.label}`}>
                  <td className="chat-ranking__pos">
                    <span>{item.rank}</span>
                  </td>
                  <td className="chat-table__lead">
                    <span title={nombre.titulo}>{nombre.visible}</span>
                  </td>
                  {showValue ? (
                    <td className="chat-ranking__value">
                      <span title={valor.titulo}>{valor.visible}</span>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
