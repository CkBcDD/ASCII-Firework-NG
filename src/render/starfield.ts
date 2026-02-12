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

  const seed = () => {
    const count = Math.max(MIN_STAR_COUNT, Math.floor(areaWidth * areaHeight * STAR_DENSITY));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * areaWidth,
      y: Math.random() * areaHeight,
      phase: Math.random() * Math.PI * 2,
      speed: TWINKLE_SPEED_BASE + Math.random() * TWINKLE_SPEED_VARIANCE,
      base: STAR_BRIGHTNESS_BASE + Math.random() * STAR_BRIGHTNESS_VARIANCE,
    }));
    log.debug(`星空播种: ${count} 颗星, 区域: ${areaWidth}×${areaHeight}`);
  };

  const resize = (widthValue: number, heightValue: number) => {
    areaWidth = widthValue;
    areaHeight = heightValue;
    seed();
  };

  const render = (ctx: CanvasRenderingContext2D, elapsed: number) => {
    for (const star of stars) {
      // 通过相位 + 速度构造不同频率闪烁，避免整屏同步明暗造成“呼吸灯”感。
      const alpha = Math.min(1, star.base + Math.sin(elapsed * star.speed + star.phase) * TWINKLE_AMPLITUDE + TWINKLE_OFFSET);
      ctx.fillStyle = `rgba(${STAR_COLOR_RGB[0]}, ${STAR_COLOR_RGB[1]}, ${STAR_COLOR_RGB[2]}, ${alpha})`;
      ctx.fillRect(star.x, star.y, STAR_SIZE, STAR_SIZE);
    }
  };

  seed();

  return {
    resize,
    render
  };
};
