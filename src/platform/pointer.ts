import { createLogger } from './logger';

/**
 * 画布坐标系下的点击点。
 */
export type ClickPoint = {
  x: number;
  y: number;
};

/**
 * 指针生命周期回调集合。
 */
export type PointerLifecycleHandlers = {
  onPointerDown?: (point: ClickPoint) => void;
  onPointerMove?: (point: ClickPoint) => void;
  onPointerUp?: () => void;
};

const log = createLogger('Pointer');

/**
 * 绑定画布指针事件并返回解绑函数。
 */
export const bindPointer = (
  canvas: HTMLCanvasElement,
  onClick: (point: ClickPoint) => void,
  lifecycleHandlers: PointerLifecycleHandlers = {}
): (() => void) => {
  const toPoint = (event: PointerEvent): ClickPoint => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    const point = toPoint(event);
    const x = point.x;
    const y = point.y;
    log.debug(`点击 @ (${Math.round(x)}, ${Math.round(y)})`);
    onClick(point);
    lifecycleHandlers.onPointerDown?.(point);
  };

  const onPointerMove = (event: PointerEvent) => {
    const point = toPoint(event);
    lifecycleHandlers.onPointerMove?.(point);
  };

  const onPointerUp = () => {
    lifecycleHandlers.onPointerUp?.();
  };

  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerup', onPointerUp, { passive: true });
  canvas.addEventListener('pointercancel', onPointerUp, { passive: true });
  canvas.addEventListener('pointerleave', onPointerUp, { passive: true });
  log.info('指针事件已绑定');

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerUp);
    log.info('指针事件已解绑');
  };
};
