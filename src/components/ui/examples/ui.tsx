import { ui } from '..';
import { messagesAtom } from '../../../store';
import { EXAMPLE_CHUNKS } from './const';

ui.run();

// 初始状态：只有 user 和固定 assistant 消息
const INITIAL_MESSAGES = [
  { role: 'user' as const, content: '请写一首诗' },
  { role: 'assistant' as const, content: '好的，请稍等片刻...' },
];

// 先用初始消息渲染
messagesAtom.set({ messages: INITIAL_MESSAGES });

let chunkIndex = 0;
setInterval(() => {
  const content = EXAMPLE_CHUNKS.slice(0, chunkIndex + 1).join('');
  const status = chunkIndex + 1 < EXAMPLE_CHUNKS.length ? ('streaming' as const) : undefined;

  // 保持前两条消息引用不变，只更新 streaming 消息
  messagesAtom.set({
    messages: [
      INITIAL_MESSAGES[0],
      INITIAL_MESSAGES[1],
      { role: 'assistant' as const, content, status },
    ],
  });
  chunkIndex++;
}, 100);
