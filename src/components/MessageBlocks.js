'use client';

import FormattedMessage from './FormattedMessage';
import ChatTable from './ChatTable';
import ChatRanking from './ChatRanking';
import { armarBloques } from '../lib/message-blocks';

function Bloque({ block, onOpenEmbed }) {
  if (block.type === 'table') {
    return <ChatTable headers={block.headers} rows={block.rows} />;
  }
  if (block.type === 'ranking') {
    return <ChatRanking items={block.items} valueHeader={block.valueHeader} />;
  }
  return <FormattedMessage text={block.text} onOpenEmbed={onOpenEmbed} />;
}

export default function MessageBlocks({ text, onOpenEmbed }) {
  const blocks = armarBloques(text);
  if (blocks.length === 1 && blocks[0].type === 'paragraph') {
    return <FormattedMessage text={text} onOpenEmbed={onOpenEmbed} />;
  }
  return (
    <div className="message-content--rich">
      {blocks.map((block, index) => (
        <Bloque key={`${block.type}-${index}`} block={block} onOpenEmbed={onOpenEmbed} />
      ))}
    </div>
  );
}
