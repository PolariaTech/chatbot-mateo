import { hasChatTable, parseChatBlocks } from './parse-chat-table.js';

export function armarBloques(texto) {
  if (!hasChatTable(texto)) {
    return [{ type: 'paragraph', text: String(texto || '') }];
  }
  return parseChatBlocks(texto);
}
