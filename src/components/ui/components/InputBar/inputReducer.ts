import type { InputState, InputAction } from '../../data.js';

export function inputReducer(state: InputState, action: InputAction): InputState {
  switch (action.type) {
    case 'insert':
      return {
        value: state.value.slice(0, state.cursor) + action.text + state.value.slice(state.cursor),
        cursor: state.cursor + action.text.length,
      };
    case 'backspace':
      if (state.cursor === 0) return state;
      return {
        value: state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor),
        cursor: state.cursor - 1,
      };
    case 'delete':
      if (state.cursor >= state.value.length) return state;
      return {
        value: state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1),
        cursor: state.cursor,
      };
    case 'clear':
      return { value: '', cursor: 0 };
    case 'move':
      return { ...state, cursor: Math.max(0, Math.min(action.cursor, state.value.length)) };
    case 'set':
      return { value: action.value, cursor: Math.max(0, Math.min(action.cursor, action.value.length)) };
  }
}

export const initialState: InputState = { value: '', cursor: 0 };
