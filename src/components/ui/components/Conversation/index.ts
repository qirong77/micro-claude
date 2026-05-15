import mitt from 'mitt';
import { LogArea } from './LogArea.js';

type Events = {
  /** 请求清空消息列表 */
  clear: void;
};

const emitter = mitt<Events>();

export const ConversationUI = {
  renderFn: LogArea,
  emitter,
};
