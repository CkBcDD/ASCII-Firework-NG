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
} from '../config';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  brightness: number;
  color: readonly [number, number, number];
};

const log = createLogger('Firework');

export type FireworkSystem = {
  explode: (x: number, y: number) => void;
  update: (deltaSeconds: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
};

export const createFireworkSystem = (): FireworkSystem => {
  const particles: Particle[] = [];

  const explode = (x: number, y: number) => {
    const count = PARTICLE_COUNT_BASE + Math.floor(Math.random() * PARTICLE_COUNT_VARIANCE);

    // 为本次爆炸随机选择一种霓虹色
    const color = NEON_PALETTES[Math.floor(Math.random() * NEON_PALETTES.length)];

    // 随机化爆炸类型：0=常规圆形, 1=爆发型(速度快寿命短)
    const type = Math.random() > BURST_THRESHOLD ? 'burst' : 'normal';
    const speedBase = type === 'burst' ? BURST_SPEED_BASE : NORMAL_SPEED_BASE;
    const speedVar = type === 'burst' ? BURST_SPEED_VARIANCE : NORMAL_SPEED_VARIANCE;

    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * ANGLE_JITTER;
      const speed = speedBase + Math.random() * speedVar;
      const ttl = type === 'burst'
        ? BURST_TTL_MIN + Math.random() * BURST_TTL_VARIANCE
        : NORMAL_TTL_MIN + Math.random() * NORMAL_TTL_VARIANCE;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: ttl,
        ttl,
        brightness: BRIGHTNESS_BASE + Math.random() * BRIGHTNESS_VARIANCE,
        color,
      });
    }
    log.info(`烟花爆炸 [${type}] @ (${Math.round(x)}, ${Math.round(y)}), 颜色: RGB(${color.join(', ')})`);
  };

  const update = (deltaSeconds: number) => {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= deltaSeconds;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      particle.vx *= DRAG;
      particle.vy *= DRAG;
      particle.vy += GRAVITY * deltaSeconds;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
    }
  };

  const render = (ctx: CanvasRenderingContext2D) => {
    for (const particle of particles) {
      const energy = particle.life / particle.ttl;
      // 使用缓动函数让亮度在生命周期末端更平滑地衰减
      const alpha = Math.max(0, Math.pow(energy, BRIGHTNESS_DECAY_EXPONENT) * particle.brightness);

      const size = PARTICLE_SIZE_MIN + energy * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);

      const [r, g, b] = particle.color;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
    }
  };

  return {
    explode,
    update,
    render
  };
};
