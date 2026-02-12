import { createLogger } from './logger';

export type KeyboardShortcutHandlers = {
  onToggleGodModePanel: () => void;
};

const log = createLogger('Keyboard');

export const bindKeyboardShortcuts = (
  handlers: KeyboardShortcutHandlers
): (() => void) => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey && event.key === 'F12') {
      event.preventDefault();
      handlers.onToggleGodModePanel();
      log.info('触发快捷键: Alt+F12');
    }
  };

  window.addEventListener('keydown', onKeyDown);
  log.info('键盘快捷键已绑定');

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    log.info('键盘快捷键已解绑');
  };
};
