import { createLogger } from '../platform/logger';
import { MAX_DPR } from '../config';

export type CanvasSurface = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  getCssSize: () => { width: number; height: number };
  resize: () => void;
};

const log = createLogger('Canvas');

export const createCanvasSurface = (canvas: HTMLCanvasElement): CanvasSurface => {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('无法初始化 Canvas 2D 上下文。');
  }
  log.info('画布上下文初始化成功');

  const getCssSize = () => {
    const width = Math.max(1, Math.floor(window.innerWidth));
    const height = Math.max(1, Math.floor(window.innerHeight));
    return { width, height };
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const { width, height } = getCssSize();
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = false;
    log.debug(
      `画布调整: CSS ${width}×${height}, 物理 ${canvas.width}×${canvas.height}, DPR ${dpr.toFixed(2)}`
    );
  };

  resize();

  return {
    canvas,
    context,
    getCssSize,
    resize
  };
};
