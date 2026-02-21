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
  PARTICLE_BUDGET_HIGH,
  WILLOW_GRAVITY_MULT,
  WILLOW_DRAG_MULT,
  WILLOW_TTL_MULT,
  CROSSETTE_SPLIT_ENERGY,
  CROSSETTE_SPLIT_SPEED,
  STROBE_FREQ_BASE,
  STROBE_FREQ_VARIANCE,
  FLASH_TTL,
  FLASH_SIZE_MULT,
  LAUNCH_DRIFT_VARIANCE,
  LAUNCH_TRAIL_INTERVAL
} from '../config';

const log = createLogger('Firework');

/**
 * 粒子类型枚举
 */
export const enum ParticleType {
  Normal = 0,
  Shell = 1, // 升空弹
  Flash = 2, // 核心闪光
  Trail = 3  // 升空拖尾
}

/**
 * 烟花形态枚举
 */
export const enum ExplosionShape {
  Peony = 0,    // 牡丹 (球形)
  Willow = 1,   // 垂柳 (高重力长拖尾)
  Ring = 2,     // 环形 (空心圆)
  Crossette = 3 // 十字星 (末端分裂)
}

/**
 * 粒子标志位掩码
 */
export const enum ParticleFlags {
  None = 0,
  Strobe = 1 << 0,      // 是否闪烁
  Split = 1 << 1,       // 是否已分裂 (十字星)
  WhiteHot = 1 << 2     // 是否有白炽色过渡
}

/**
 * 烟花粒子系统对外能力。
 */
export type FireworkSystem = {
  launch: (startX: number, startY: number, targetX: number, targetY: number) => void;
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

  // SoA (Structure of Arrays) 扁平化数组结构
  const posX = new Float32Array(maxParticles);
  const posY = new Float32Array(maxParticles);
  const velX = new Float32Array(maxParticles);
  const velY = new Float32Array(maxParticles);
  const life = new Float32Array(maxParticles);
  const ttlValues = new Float32Array(maxParticles);
  const brightness = new Float32Array(maxParticles);
  const colorIndex = new Uint8Array(maxParticles);
  const secondaryColorIndex = new Uint8Array(maxParticles); // 用于多色混合
  const pType = new Uint8Array(maxParticles); // ParticleType
  const shape = new Uint8Array(maxParticles); // ExplosionShape
  const flags = new Uint8Array(maxParticles); // ParticleFlags
  const strobeFreq = new Float32Array(maxParticles); // 闪烁频率
  const trailTimer = new Float32Array(maxParticles); // 升空拖尾计时器

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
    secondaryColorIndex[index] = secondaryColorIndex[lastIndex];
    pType[index] = pType[lastIndex];
    shape[index] = shape[lastIndex];
    flags[index] = flags[lastIndex];
    strobeFreq[index] = strobeFreq[lastIndex];
    trailTimer[index] = trailTimer[lastIndex];
    activeCount -= 1;
  };

  const launch = (startX: number, startY: number, targetX: number, targetY: number) => {
    if (activeCount >= maxParticles) {
      return;
    }

    // 计算到达目标高度所需的初速度 (v^2 = 2gh)
    const height = startY - targetY;
    if (height <= 0) {
      explode(targetX, targetY);
      return;
    }

    const initialVelY = -Math.sqrt(2 * GRAVITY * height);
    // 估算到达顶点的时间 (t = v/g)
    const timeToApex = -initialVelY / GRAVITY;
    // 计算水平速度以在相同时间内到达目标X
    const initialVelX = (targetX - startX) / timeToApex + (Math.random() - 0.5) * LAUNCH_DRIFT_VARIANCE;

    const writeIndex = activeCount;
    posX[writeIndex] = startX;
    posY[writeIndex] = startY;
    velX[writeIndex] = initialVelX;
    velY[writeIndex] = initialVelY;
    life[writeIndex] = timeToApex * 1.2; // 稍微多给一点寿命，以防提前消失
    ttlValues[writeIndex] = timeToApex * 1.2;
    brightness[writeIndex] = BRIGHTNESS_BASE + Math.random() * BRIGHTNESS_VARIANCE;
    colorIndex[writeIndex] = 6; // 升空弹使用白色 (Pure White)
    secondaryColorIndex[writeIndex] = 6;
    pType[writeIndex] = ParticleType.Shell;
    shape[writeIndex] = ExplosionShape.Peony; // 默认
    flags[writeIndex] = ParticleFlags.None;
    strobeFreq[writeIndex] = 0;
    trailTimer[writeIndex] = 0;
    activeCount += 1;

    log.info(`发射升空弹 @ (${Math.round(startX)}, ${Math.round(startY)}) -> (${Math.round(targetX)}, ${Math.round(targetY)})`);
  };

  const explode = (x: number, y: number) => {
    const count = PARTICLE_COUNT_BASE + Math.floor(Math.random() * PARTICLE_COUNT_VARIANCE);
    const available = maxParticles - activeCount;
    if (available <= 0) {
      return;
    }
    const spawnCount = Math.min(count, available);

    // 随机选择 1~2 种霓虹色用于多色混合
    let color1 = Math.floor(Math.random() * (NEON_PALETTES.length - 1)); // 排除纯白
    let color2 = color1;
    if (Math.random() > 0.5) {
      color2 = Math.floor(Math.random() * (NEON_PALETTES.length - 1));
    }

    // 随机选择爆炸形态
    const shapeType = Math.floor(Math.random() * 4) as ExplosionShape;
    const isBurst = Math.random() > BURST_THRESHOLD;
    const speedBase = isBurst ? BURST_SPEED_BASE : NORMAL_SPEED_BASE;
    const speedVar = isBurst ? BURST_SPEED_VARIANCE : NORMAL_SPEED_VARIANCE;

    // 核心闪光
    if (activeCount < maxParticles) {
      const writeIndex = activeCount;
      posX[writeIndex] = x;
      posY[writeIndex] = y;
      velX[writeIndex] = 0;
      velY[writeIndex] = 0;
      life[writeIndex] = FLASH_TTL;
      ttlValues[writeIndex] = FLASH_TTL;
      brightness[writeIndex] = BRIGHTNESS_BASE * 2; // 高亮
      colorIndex[writeIndex] = 6; // 纯白
      secondaryColorIndex[writeIndex] = 6;
      pType[writeIndex] = ParticleType.Flash;
      shape[writeIndex] = ExplosionShape.Peony;
      flags[writeIndex] = ParticleFlags.None;
      strobeFreq[writeIndex] = 0;
      trailTimer[writeIndex] = 0;
      activeCount += 1;
    }

    for (let index = 0; index < spawnCount; index += 1) {
      if (activeCount >= maxParticles) break;

      let angle = (Math.PI * 2 * index) / spawnCount;
      let speed = speedBase + Math.random() * speedVar;
      let ttl = isBurst
        ? BURST_TTL_MIN + Math.random() * BURST_TTL_VARIANCE
        : NORMAL_TTL_MIN + Math.random() * NORMAL_TTL_VARIANCE;

      let particleFlags = ParticleFlags.WhiteHot; // 默认带白炽色过渡

      // 根据形态调整参数
      if (shapeType === ExplosionShape.Ring) {
        // 环形：速度一致，角度均匀
        speed = speedBase + speedVar * 0.5;
        angle += Math.random() * 0.05; // 极小抖动
      } else {
        angle += Math.random() * ANGLE_JITTER;
      }

      if (shapeType === ExplosionShape.Willow) {
        // 垂柳：寿命长，速度慢
        ttl *= WILLOW_TTL_MULT;
        speed *= 0.6;
        color1 = 3; // 强制黄色/金色
        color2 = 3;
      }

      // 随机闪烁
      if (Math.random() > 0.7) {
        particleFlags |= ParticleFlags.Strobe;
      }

      const writeIndex = activeCount;
      posX[writeIndex] = x;
      posY[writeIndex] = y;
      velX[writeIndex] = Math.cos(angle) * speed;
      velY[writeIndex] = Math.sin(angle) * speed;
      life[writeIndex] = ttl;
      ttlValues[writeIndex] = ttl;
      brightness[writeIndex] = BRIGHTNESS_BASE + Math.random() * BRIGHTNESS_VARIANCE;
      colorIndex[writeIndex] = Math.random() > 0.5 ? color1 : color2;
      secondaryColorIndex[writeIndex] = colorIndex[writeIndex];
      pType[writeIndex] = ParticleType.Normal;
      shape[writeIndex] = shapeType;
      flags[writeIndex] = particleFlags;
      strobeFreq[writeIndex] = STROBE_FREQ_BASE + Math.random() * STROBE_FREQ_VARIANCE;
      trailTimer[writeIndex] = 0;
      activeCount += 1;
    }
    log.info(
      `烟花爆炸 [形态:${shapeType}] @ (${Math.round(x)}, ${Math.round(y)}), 颜色: ${color1}/${color2}`
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

      const currentType = pType[index] as ParticleType;

      if (currentType === ParticleType.Shell) {
        // 升空弹逻辑
        velY[index] += GRAVITY * deltaSeconds;
        posX[index] += velX[index] * deltaSeconds;
        posY[index] += velY[index] * deltaSeconds;

        // 生成拖尾
        trailTimer[index] += deltaSeconds;
        if (trailTimer[index] >= LAUNCH_TRAIL_INTERVAL) {
          trailTimer[index] = 0;
          if (activeCount < maxParticles) {
            const writeIndex = activeCount;
            posX[writeIndex] = posX[index];
            posY[writeIndex] = posY[index];
            velX[writeIndex] = 0;
            velY[writeIndex] = 0;
            life[writeIndex] = 0.3; // 拖尾寿命短
            ttlValues[writeIndex] = 0.3;
            brightness[writeIndex] = BRIGHTNESS_BASE * 0.5;
            colorIndex[writeIndex] = 6; // 白色拖尾
            secondaryColorIndex[writeIndex] = 6;
            pType[writeIndex] = ParticleType.Trail;
            shape[writeIndex] = ExplosionShape.Peony;
            flags[writeIndex] = ParticleFlags.None;
            strobeFreq[writeIndex] = 0;
            trailTimer[writeIndex] = 0;
            activeCount += 1;
          }
        }

        // 到达顶点 (垂直速度 >= 0) 时爆炸
        if (velY[index] >= 0) {
          const ex = posX[index];
          const ey = posY[index];
          swapWithLast(index);
          explode(ex, ey);
          continue;
        }
      } else if (currentType === ParticleType.Normal) {
        // 普通粒子逻辑
        const currentShape = shape[index] as ExplosionShape;
        const currentFlags = flags[index] as ParticleFlags;
        const energy = life[index] / ttlValues[index];

        // 垂柳形态特殊物理
        if (currentShape === ExplosionShape.Willow) {
          velX[index] *= WILLOW_DRAG_MULT;
          velY[index] *= WILLOW_DRAG_MULT;
          velY[index] += GRAVITY * WILLOW_GRAVITY_MULT * deltaSeconds;
        } else {
          velX[index] *= DRAG;
          velY[index] *= DRAG;
          velY[index] += GRAVITY * deltaSeconds;
        }

        posX[index] += velX[index] * deltaSeconds;
        posY[index] += velY[index] * deltaSeconds;

        // 十字星分裂逻辑
        if (currentShape === ExplosionShape.Crossette && energy <= CROSSETTE_SPLIT_ENERGY && !(currentFlags & ParticleFlags.Split)) {
          flags[index] |= ParticleFlags.Split; // 标记已分裂
          const currentSpeed = Math.sqrt(velX[index] * velX[index] + velY[index] * velY[index]);
          const splitSpeed = currentSpeed * CROSSETTE_SPLIT_SPEED;
          const baseAngle = Math.atan2(velY[index], velX[index]);

          // 原地生成 4 个十字方向的小粒子
          for (let i = 0; i < 4; i++) {
            if (activeCount >= maxParticles) break;
            const splitAngle = baseAngle + (Math.PI / 2) * i;
            const writeIndex = activeCount;
            posX[writeIndex] = posX[index];
            posY[writeIndex] = posY[index];
            velX[writeIndex] = Math.cos(splitAngle) * splitSpeed;
            velY[writeIndex] = Math.sin(splitAngle) * splitSpeed;
            life[writeIndex] = life[index] * 0.8; // 继承剩余寿命
            ttlValues[writeIndex] = ttlValues[index];
            brightness[writeIndex] = brightness[index] * 0.8;
            colorIndex[writeIndex] = colorIndex[index];
            secondaryColorIndex[writeIndex] = secondaryColorIndex[index];
            pType[writeIndex] = ParticleType.Normal;
            shape[writeIndex] = ExplosionShape.Peony; // 分裂后变为普通粒子
            flags[writeIndex] = ParticleFlags.None; // 不再分裂
            strobeFreq[writeIndex] = 0;
            trailTimer[writeIndex] = 0;
            activeCount += 1;
          }
          // 销毁原粒子
          swapWithLast(index);
          continue;
        }
      } else if (currentType === ParticleType.Trail || currentType === ParticleType.Flash) {
        // 拖尾和闪光不移动，只随时间衰减
      }

      index += 1;
    }
  };

  const render = (ctx: CanvasRenderingContext2D) => {
    let lastStyle = '';
    for (let index = 0; index < activeCount; index += 1) {
      const energy = life[index] / ttlValues[index];
      let alpha = Math.max(0, Math.pow(energy, BRIGHTNESS_DECAY_EXPONENT) * brightness[index]);

      const currentFlags = flags[index] as ParticleFlags;
      const currentType = pType[index] as ParticleType;

      // 闪烁效果
      if (currentFlags & ParticleFlags.Strobe) {
        const strobe = Math.sin(life[index] * strobeFreq[index]);
        alpha *= 0.5 + 0.5 * strobe; // 0.0 ~ 1.0 调制
      }

      const alphaBucket = Math.min(
        PARTICLE_ALPHA_BUCKETS,
        Math.round(alpha * PARTICLE_ALPHA_BUCKETS)
      );
      if (alphaBucket <= 0) {
        continue;
      }

      let size = PARTICLE_SIZE_MIN + energy * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
      if (currentType === ParticleType.Flash) {
        size *= FLASH_SIZE_MULT;
      }

      // 白炽色过渡
      let cIndex = colorIndex[index];
      if ((currentFlags & ParticleFlags.WhiteHot) && energy > 0.85) {
        cIndex = 6; // 纯白
      }

      const style =
        paletteStyles[cIndex]?.[alphaBucket] ?? paletteStyles[0][alphaBucket];
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
    launch,
    explode,
    update,
    render,
    setParticleBudget
  };
};
