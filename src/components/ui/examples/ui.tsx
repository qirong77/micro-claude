import { ui } from '..';
import {
  messagesAtom,
  quickCommandsAtom,
  messageBarItemsAtom,
} from '../../../store';
import mockSession from './example-session.json'

messagesAtom.set(mockSession as any);
quickCommandsAtom.set([
  { name: 'help', description: '查看帮助', action: () => {} },
  { name: 'clear', description: '清空对话', action: () => {} },
]);
messageBarItemsAtom.set([{ id: 'example', text: '演示模式' }]);

ui.run();


setTimeout(()=>{
  messagesAtom.set([])
},3000)