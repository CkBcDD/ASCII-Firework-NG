import { createLogger } from '../platform/logger';
import {
  STAR_DENSITY,
  MIN_STAR_COUNT,
  TWINKLE_SPEED_BASE,
  TWINKLE_SPEED_VARIANCE,
  STAR_BRIGHTNESS_BASE,
  STAR_BRIGHTNESS_VARIANCE,
  TWINKLE_AMPLITUDE,
  TWINKLE_OFFSET,
  STAR_SIZE,
  STAR_COLOR_RGB,
  STARFIELD_UPDATE_INTERVAL_HIGH,
  STARFIELD_UPDATE_INTERVAL_LOW,
  FPS_DOWNGRADE_THRESHOLD
} from '../config';

type Star = {
  x: number;
  y: number;
  phase: number;
  speed: number;
  base: number;
};

/**
 * 星空层对外能力。
 */
export type Starfield = {
  resize: (width: number, height: number) => void;
  render: (ctx: CanvasRenderingContext2D, elapsed: number) => void;
};

const log = createLogger('Starfield');

/**
 * 创建星空层实例。
 */
export const createStarfield = (width: number, height: number): Starfield => {
  let stars: Star[] = [];
  let areaWidth = width;
  let areaHeight = height;
  const layer = document.createElement('canvas');
  const layerContext = layer.getContext('2d', { alpha: true });
  if (!layerContext) {
    throw new Error('无法初始化星空离屏画布。');
  }

  let updateTick = 0;
  const alphaStyles = Array.from({ length: 17 }, (_, bucket) => {
    const alpha = (bucket / 16).toFixed(3);
    return `rgba(${STAR_COLOR_RGB[0]}, ${STAR_COLOR_RGB[1]}, ${STAR_COLOR_RGB[2]}, ${alpha})`;
  });

  const syncLayerSize = () => {
    const widthPx = Math.max(1, Math.round(areaWidth));
    const heightPx = Math.max(1, Math.round(areaHeight));
    if (layer.width !== widthPx || layer.height !== heightPx) {
      layer.width = widthPx;
      layer.height = heightPx;
    }
  };

  const seed = () => {
    const count = Math.max(MIN_STAR_COUNT, Math.floor(areaWidth * areaHeight * STAR_DENSITY));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * areaWidth,
      y: Math.random() * areaHeight,
      phase: Math.random() * Math.PI * 2,
      speed: TWINKLE_SPEED_BASE + Math.random() * TWINKLE_SPEED_VARIANCE,
      base: STAR_BRIGHTNESS_BASE + Math.random() * STAR_BRIGHTNESS_VARIANCE
    }));
    log.debug(`星空播种: ${count} 颗星, 区域: ${areaWidth}×${areaHeight}`);
  };

  const resize = (widthValue: number, heightValue: number) => {
    areaWidth = widthValue;
    areaHeight = heightValue;
    syncLayerSize();
    updateTick = 0;
    seed();
  };

  const paintLayer = (elapsed: number) => {
    layerContext.clearRect(0, 0, layer.width, layer.height);
    let lastStyle = '';
    for (const star of stars) {
      // 通过相位 + 速度构造不同频率闪烁，避免整屏同步明暗造成“呼吸灯”感。
      const alpha = Math.min(
        1,
        Math.max(
          0,
          star.base +
            Math.sin(elapsed * star.speed + star.phase) * TWINKLE_AMPLITUDE +
            TWINKLE_OFFSET
        )
      );
      const bucket = Math.min(16, Math.round(alpha * 16));
      const style = alphaStyles[bucket] ?? alphaStyles[0];
      if (style !== lastStyle) {
        layerContext.fillStyle = style;
        lastStyle = style;
      }
      layerContext.fillRect(star.x, star.y, STAR_SIZE, STAR_SIZE);
    }
  };

  const render = (ctx: CanvasRenderingContext2D, elapsed: number) => {
    const fps = (window as Window & { __fps?: number }).__fps ?? 60;
    const interval =
      fps < FPS_DOWNGRADE_THRESHOLD
        ? STARFIELD_UPDATE_INTERVAL_LOW
        : STARFIELD_UPDATE_INTERVAL_HIGH;

    if (updateTick <= 0) {
      paintLayer(elapsed);
      updateTick = Math.max(0, interval - 1);
    } else {
      updateTick -= 1;
    }

    ctx.drawImage(layer, 0, 0);
  };

  syncLayerSize();
  seed();

  return {
    resize,
    render
  };
};
