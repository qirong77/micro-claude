import mitt from 'mitt';
import { Conversation } from './Conversation';


type Events = {
  /** 请求清空消息列表 */
  clear: void;
};

const emitter = mitt<Events>();

export const ConversationUI = {
  renderFn: Conversation,
  emitter,
};
