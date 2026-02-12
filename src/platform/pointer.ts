import { createLogger } from './logger';

export type ClickPoint = {
  x: number;
  y: number;
};

const log = createLogger('Pointer');

export const bindPointer = (
  canvas: HTMLCanvasElement,
  onClick: (point: ClickPoint) => void
): (() => void) => {
  const handler = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    log.debug(`点击 @ (${Math.round(x)}, ${Math.round(y)})`);
    onClick({ x, y });
  };

  canvas.addEventListener('pointerdown', handler, { passive: true });
  log.info('指针事件已绑定');

  return () => {
    canvas.removeEventListener('pointerdown', handler);
    log.info('指针事件已解绑');
  };
};
