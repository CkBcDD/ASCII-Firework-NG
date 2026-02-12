import { createLogger } from '../platform/logger';
import {
  NEON_PALETTES,
  GRAVITY,
  DRAG,
  PARTICLE_SIZE_MIN,
  PARTICLE_SIZE_MAX,
  PARTICLE_COUNT_BASE,
  PARTICLE_COUNT_VARIANCE,
  BURST_THRESHOLD,
  BURST_SPEED_BASE,
  NORMAL_SPEED_BASE,
  BURST_SPEED_VARIANCE,
  NORMAL_SPEED_VARIANCE,
  ANGLE_JITTER,
  BURST_TTL_MIN,
  BURST_TTL_VARIANCE,
  NORMAL_TTL_MIN,
  NORMAL_TTL_VARIANCE,
  BRIGHTNESS_BASE,
  BRIGHTNESS_VARIANCE,
  BRIGHTNESS_DECAY_EXPONENT,
  PARTICLE_ALPHA_BUCKETS,
  PARTICLE_BUDGET_HIGH
} from '../config';

const log = createLogger('Firework');

/**
 * 烟花粒子系统对外能力。
 */
export type FireworkSystem = {
  explode: (x: number, y: number) => void;
  update: (deltaSeconds: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
  setParticleBudget: (maxParticles: number) => void;
};

/**
 * 创建烟花粒子系统实例。
 */
export const createFireworkSystem = (): FireworkSystem => {
  let maxParticles = PARTICLE_BUDGET_HIGH;
  let activeCount = 0;

  const posX = new Float32Array(maxParticles);
  const posY = new Float32Array(maxParticles);
  const velX = new Float32Array(maxParticles);
  const velY = new Float32Array(maxParticles);
  const life = new Float32Array(maxParticles);
  const ttlValues = new Float32Array(maxParticles);
  const brightness = new Float32Array(maxParticles);
  const colorIndex = new Uint8Array(maxParticles);

  const paletteStyles = NEON_PALETTES.map(([red, green, blue]) => {
    const styles: string[] = [];
    for (let bucket = 0; bucket <= PARTICLE_ALPHA_BUCKETS; bucket += 1) {
      const alpha = bucket / Math.max(1, PARTICLE_ALPHA_BUCKETS);
      styles.push(`rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`);
    }
    return styles;
  });

  const compactActiveParticles = (nextLimit: number) => {
    if (activeCount <= nextLimit) {
      return;
    }
    activeCount = nextLimit;
  };

  const swapWithLast = (index: number) => {
    const lastIndex = activeCount - 1;
    if (index === lastIndex) {
      activeCount -= 1;
      return;
    }

    posX[index] = posX[lastIndex];
    posY[index] = posY[lastIndex];
    velX[index] = velX[lastIndex];
    velY[index] = velY[lastIndex];
    life[index] = life[lastIndex];
    ttlValues[index] = ttlValues[lastIndex];
    brightness[index] = brightness[lastIndex];
    colorIndex[index] = colorIndex[lastIndex];
    activeCount -= 1;
  };

  const explode = (x: number, y: number) => {
    const count = PARTICLE_COUNT_BASE + Math.floor(Math.random() * PARTICLE_COUNT_VARIANCE);
    const available = maxParticles - activeCount;
    if (available <= 0) {
      return;
    }
    const spawnCount = Math.min(count, available);

    // 为本次爆炸随机选择一种霓虹色
    const selectedColorIndex = Math.floor(Math.random() * NEON_PALETTES.length);
    const color = NEON_PALETTES[selectedColorIndex];

    // 随机化爆炸类型：0=常规圆形, 1=爆发型(速度快寿命短)
    const type = Math.random() > BURST_THRESHOLD ? 'burst' : 'normal';
    const speedBase = type === 'burst' ? BURST_SPEED_BASE : NORMAL_SPEED_BASE;
    const speedVar = type === 'burst' ? BURST_SPEED_VARIANCE : NORMAL_SPEED_VARIANCE;

    for (let index = 0; index < spawnCount; index += 1) {
      const angle = (Math.PI * 2 * index) / spawnCount + Math.random() * ANGLE_JITTER;
      const speed = speedBase + Math.random() * speedVar;
      const ttl =
        type === 'burst'
          ? BURST_TTL_MIN + Math.random() * BURST_TTL_VARIANCE
          : NORMAL_TTL_MIN + Math.random() * NORMAL_TTL_VARIANCE;

      const writeIndex = activeCount;
      posX[writeIndex] = x;
      posY[writeIndex] = y;
      velX[writeIndex] = Math.cos(angle) * speed;
      velY[writeIndex] = Math.sin(angle) * speed;
      life[writeIndex] = ttl;
      ttlValues[writeIndex] = ttl;
      brightness[writeIndex] = BRIGHTNESS_BASE + Math.random() * BRIGHTNESS_VARIANCE;
      colorIndex[writeIndex] = selectedColorIndex;
      activeCount += 1;
    }
    log.info(
      `烟花爆炸 [${type}] @ (${Math.round(x)}, ${Math.round(y)}), 颜色: RGB(${color.join(', ')})`
    );
  };

  const update = (deltaSeconds: number) => {
    let index = 0;
    while (index < activeCount) {
      life[index] -= deltaSeconds;
      if (life[index] <= 0) {
        swapWithLast(index);
        continue;
      }

      velX[index] *= DRAG;
      velY[index] *= DRAG;
      velY[index] += GRAVITY * deltaSeconds;
      posX[index] += velX[index] * deltaSeconds;
      posY[index] += velY[index] * deltaSeconds;
      index += 1;
    }
  };

  const render = (ctx: CanvasRenderingContext2D) => {
    let lastStyle = '';
    for (let index = 0; index < activeCount; index += 1) {
      const energy = life[index] / ttlValues[index];
      // 使用缓动函数让亮度在生命周期末端更平滑地衰减
      const alpha = Math.max(0, Math.pow(energy, BRIGHTNESS_DECAY_EXPONENT) * brightness[index]);
      const alphaBucket = Math.min(
        PARTICLE_ALPHA_BUCKETS,
        Math.round(alpha * PARTICLE_ALPHA_BUCKETS)
      );
      if (alphaBucket <= 0) {
        continue;
      }

      const size = PARTICLE_SIZE_MIN + energy * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
      const style =
        paletteStyles[colorIndex[index]]?.[alphaBucket] ?? paletteStyles[0][alphaBucket];
      if (style !== lastStyle) {
        ctx.fillStyle = style;
        lastStyle = style;
      }
      ctx.fillRect(posX[index] - size / 2, posY[index] - size / 2, size, size);
    }
  };

  const setParticleBudget = (nextBudget: number) => {
    maxParticles = Math.max(1, Math.floor(nextBudget));
    compactActiveParticles(maxParticles);
  };

  return {
    explode,
    update,
    render,
    setParticleBudget
  };
};
