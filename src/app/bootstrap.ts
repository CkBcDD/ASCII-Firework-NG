import { createFireworkSystem } from '../engine/firework';
import { createTicker } from '../engine/ticker';
import { bindPointer } from '../platform/pointer';
import { bindKeyboardShortcuts } from '../platform/keyboard';
import { createPerfMonitor } from '../platform/perf';
import { createLogger, setLogLevel } from '../platform/logger';
import { createGodModePanel, type GodModeState } from './godModePanel';
import { createAsciiLayer } from '../render/asciiLayer';
import { createCanvasSurface } from '../render/canvas';
import { createStarfield } from '../render/starfield';
import {
  QUALITY_HIGH,
  QUALITY_LOW,
  FPS_DOWNGRADE_THRESHOLD,
  FPS_UPGRADE_THRESHOLD,
  PARTICLE_BUDGET_HIGH,
  PARTICLE_BUDGET_LOW,
  MAX_RAPID_FIRE_BURSTS_PER_FRAME,
  APP_CANVAS_SELECTOR,
  RESIZE_THROTTLE_MS,
  LOG_LEVEL
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
  // 在任何业务日志输出前设置全局日志阈值，保证启动期日志也受配置控制。
  setLogLevel(LOG_LEVEL);

  const canvas = document.querySelector<HTMLCanvasElement>(APP_CANVAS_SELECTOR);
  if (!canvas) {
    throw new Error(`未找到 ${APP_CANVAS_SELECTOR} 画布。`);
  }

  log.info('ASCII Firework NG 启动中…');

  const surface = createCanvasSurface(canvas);
  const asciiLayer = createAsciiLayer();
  const fireworkSystem = createFireworkSystem();
  fireworkSystem.setParticleBudget(PARTICLE_BUDGET_HIGH);
  const perfMonitor = createPerfMonitor();
  const { width, height } = surface.getCssSize();
  const starfield = createStarfield(width, height);

  let quality = QUALITY_HIGH;
  let pointerPressed = false;
  let pointerPosition = {
    x: width / 2,
    y: height / 2
  };
  let rapidFireAccumulatorMs = 0;
  let godModeState: GodModeState = {
    panelVisible: false,
    rapidFireEnabled: false,
    rapidFireHz: 20
  };

  const setGodModeState = (nextState: GodModeState) => {
    godModeState = nextState;
  };

  const godModePanel = createGodModePanel({
    initialState: godModeState,
    onStateChange: setGodModeState
  });

  const syncSize = () => {
    surface.resize();
    const size = surface.getCssSize();
    starfield.resize(size.width, size.height);
    asciiLayer.resize(size.width, size.height, quality);
    log.debug(`窗口尺寸同步: ${size.width}×${size.height}`);
  };

  syncSize();
  const { handler: onResize, cancel: cancelResizeThrottle } = createThrottledHandler(
    syncSize,
    RESIZE_THROTTLE_MS
  );

  const unbindPointer = bindPointer(
    surface.canvas,
    ({ x, y }) => {
      const size = surface.getCssSize();
      fireworkSystem.launch(x, size.height, x, y);
    },
    {
      onPointerDown: (point) => {
        pointerPressed = true;
        pointerPosition = point;
        rapidFireAccumulatorMs = 0;
      },
      onPointerMove: (point) => {
        pointerPosition = point;
      },
      onPointerUp: () => {
        pointerPressed = false;
        rapidFireAccumulatorMs = 0;
      }
    }
  );

  const unbindKeyboard = bindKeyboardShortcuts({
    onToggleGodModePanel: () => {
      godModePanel.setVisible(!godModeState.panelVisible);
    }
  });

  const ticker = createTicker((deltaSeconds, elapsedSeconds) => {
    if (pointerPressed && godModeState.rapidFireEnabled) {
      const intervalMs = 1000 / godModeState.rapidFireHz;
      rapidFireAccumulatorMs += deltaSeconds * 1000;
      const pendingBursts = Math.floor(rapidFireAccumulatorMs / intervalMs);
      const burstsToRun = Math.min(MAX_RAPID_FIRE_BURSTS_PER_FRAME, pendingBursts);
      for (let burst = 0; burst < burstsToRun; burst += 1) {
        const size = surface.getCssSize();
        fireworkSystem.launch(pointerPosition.x, size.height, pointerPosition.x, pointerPosition.y);
      }
      rapidFireAccumulatorMs -= pendingBursts * intervalMs;
      rapidFireAccumulatorMs = Math.max(0, Math.min(rapidFireAccumulatorMs, intervalMs));
    } else {
      rapidFireAccumulatorMs = 0;
    }

    perfMonitor.sample(deltaSeconds);
    const fps = perfMonitor.getFps();
    (window as Window & { __fps?: number }).__fps = fps;

    if (fps < FPS_DOWNGRADE_THRESHOLD && quality !== QUALITY_LOW) {
      // 使用双阈值避免在临界 FPS 附近频繁抖动（hysteresis）。
      quality = QUALITY_LOW;
      fireworkSystem.setParticleBudget(PARTICLE_BUDGET_LOW);
      log.warn(
        `性能降级: FPS=${Math.round(fps)} < ${FPS_DOWNGRADE_THRESHOLD}, 切换为低质量 (${QUALITY_LOW})`
      );
      syncSize();
    } else if (fps > FPS_UPGRADE_THRESHOLD && quality !== QUALITY_HIGH) {
      quality = QUALITY_HIGH;
      fireworkSystem.setParticleBudget(PARTICLE_BUDGET_HIGH);
      log.info(
        `性能恢复: FPS=${Math.round(fps)} > ${FPS_UPGRADE_THRESHOLD}, 切换为高质量 (${QUALITY_HIGH})`
      );
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
    unbindKeyboard();
    godModePanel.destroy();
    cancelResizeThrottle();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
};
