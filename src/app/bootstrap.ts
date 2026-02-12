import { createFireworkSystem } from '../engine/firework';
import { createTicker } from '../engine/ticker';
import { bindPointer } from '../platform/pointer';
import { createPerfMonitor } from '../platform/perf';
import { createLogger } from '../platform/logger';
import { createAsciiLayer } from '../render/asciiLayer';
import { createCanvasSurface } from '../render/canvas';
import { createStarfield } from '../render/starfield';
import {
  QUALITY_HIGH,
  QUALITY_LOW,
  FPS_DOWNGRADE_THRESHOLD,
  FPS_UPGRADE_THRESHOLD,
  APP_CANVAS_SELECTOR,
  RESIZE_THROTTLE_MS,
} from '../config';

const log = createLogger('App');

const createThrottledHandler = (callback: () => void, intervalMs: number) => {
  let timeoutId: number | null = null;
  let lastInvokeAt = 0;

  const invoke = () => {
    timeoutId = null;
    lastInvokeAt = performance.now();
    callback();
  };

  const handler = () => {
    const elapsed = performance.now() - lastInvokeAt;
    const remaining = intervalMs - elapsed;

    if (remaining <= 0) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      invoke();
      return;
    }

    if (timeoutId === null) {
      timeoutId = window.setTimeout(invoke, remaining);
    }
  };

  const cancel = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return {
    handler,
    cancel
  };
};

export const bootstrap = (): void => {
  const canvas = document.querySelector<HTMLCanvasElement>(APP_CANVAS_SELECTOR);
  if (!canvas) {
    throw new Error(`未找到 ${APP_CANVAS_SELECTOR} 画布。`);
  }

  log.info('ASCII Firework NG 启动中…');

  const surface = createCanvasSurface(canvas);
  const asciiLayer = createAsciiLayer();
  const fireworkSystem = createFireworkSystem();
  const perfMonitor = createPerfMonitor();
  const { width, height } = surface.getCssSize();
  const starfield = createStarfield(width, height);

  let quality = QUALITY_HIGH;

  const syncSize = () => {
    surface.resize();
    const size = surface.getCssSize();
    starfield.resize(size.width, size.height);
    asciiLayer.resize(size.width, size.height, quality);
    log.debug(`窗口尺寸同步: ${size.width}×${size.height}`);
  };

  syncSize();
  const { handler: onResize, cancel: cancelResizeThrottle } = createThrottledHandler(syncSize, RESIZE_THROTTLE_MS);

  const unbindPointer = bindPointer(surface.canvas, ({ x, y }) => {
    fireworkSystem.explode(x, y);
  });

  const ticker = createTicker((deltaSeconds, elapsedSeconds) => {
    perfMonitor.sample(deltaSeconds);
    const fps = perfMonitor.getFps();
    (window as Window & { __fps?: number }).__fps = fps;

    if (fps < FPS_DOWNGRADE_THRESHOLD && quality !== QUALITY_LOW) {
      quality = QUALITY_LOW;
      log.warn(`性能降级: FPS=${Math.round(fps)} < ${FPS_DOWNGRADE_THRESHOLD}, 切换为低质量 (${QUALITY_LOW})`);
      syncSize();
    } else if (fps > FPS_UPGRADE_THRESHOLD && quality !== QUALITY_HIGH) {
      quality = QUALITY_HIGH;
      log.info(`性能恢复: FPS=${Math.round(fps)} > ${FPS_UPGRADE_THRESHOLD}, 切换为高质量 (${QUALITY_HIGH})`);
      syncSize();
    }

    fireworkSystem.update(deltaSeconds);

    asciiLayer.fade();
    asciiLayer.withBuffer((ctx) => {
      starfield.render(ctx, elapsedSeconds);
      fireworkSystem.render(ctx);
    });

    const size = surface.getCssSize();
    asciiLayer.renderTo(surface.context, size.width, size.height);
  });

  const onVisibilityChange = () => {
    if (document.hidden) {
      ticker.stop();
      log.info('页面不可见，动画已暂停');
    } else {
      ticker.start();
      log.info('页面可见，动画已恢复');
    }
  };

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);

  ticker.start();
  log.info('ASCII Firework NG 启动完成');

  window.addEventListener('beforeunload', () => {
    log.info('页面卸载，清理资源…');
    ticker.stop();
    unbindPointer();
    cancelResizeThrottle();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
};
