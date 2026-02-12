// ─── ASCII Firework NG — 集中配置 ─────────────────────────────
// 所有可调参数统一在此管理，各模块按需导入。
// 修改 BG_COLOR / FONT_FAMILY 后需同步 global.css 中对应的 CSS 变量。

// ── 物理 ──────────────────────────────────────────────────────
/** 重力加速度 (px/s²) */
export const GRAVITY = 50;
/** 每帧速度衰减系数 (0–1) */
export const DRAG = 0.982;

// ── 粒子 / 烟花 ──────────────────────────────────────────────
export const PARTICLE_SIZE_MIN = 8;
export const PARTICLE_SIZE_MAX = 32;
/** 每次爆炸的基础粒子数 */
export const PARTICLE_COUNT_BASE = 120;
/** 粒子数随机增减范围 */
export const PARTICLE_COUNT_VARIANCE = 100;

/** 爆发型爆炸概率阈值 (> 此值为 burst) */
export const BURST_THRESHOLD = 0.7;

export const BURST_SPEED_BASE = 240;
export const NORMAL_SPEED_BASE = 120;
export const BURST_SPEED_VARIANCE = 400;
export const NORMAL_SPEED_VARIANCE = 320;

/** 角度随机抖动量 (rad) */
export const ANGLE_JITTER = 0.15;

export const BURST_TTL_MIN = 0.6;
export const BURST_TTL_VARIANCE = 0.8;
export const NORMAL_TTL_MIN = 0.9;
export const NORMAL_TTL_VARIANCE = 1.2;

/** 粒子初始亮度基础值 */
export const BRIGHTNESS_BASE = 0.5;
/** 粒子初始亮度随机范围 */
export const BRIGHTNESS_VARIANCE = 0.5;

/** 亮度衰减缓动指数 */
export const BRIGHTNESS_DECAY_EXPONENT = 1.5;

// ── 赛博朋克霓虹色板 (R, G, B) ──────────────────────────────
export const NEON_PALETTES: readonly (readonly [number, number, number])[] = [
    [0, 255, 255],    // Cyber Cyan
    [255, 0, 255],    // Neon Magenta
    [50, 255, 50],    // Acid Green
    [255, 255, 0],    // Electric Yellow
    [255, 20, 147],   // Hot Pink
    [0, 153, 255],    // Electric Blue
    [255, 255, 255],  // Pure White (Flash)
];

// ── ASCII 渲染 ───────────────────────────────────────────────
/** 亮度→字符映射字符集 (从暗到亮) */
export const CHARSET = ' .,-~:;=!*a#$@';
export const BASE_CELL_WIDTH = 8;
export const BASE_CELL_HEIGHT = 11;
/** 最小列数 */
export const MIN_COLUMNS = 20;
/** 最小行数 */
export const MIN_ROWS = 12;
/** 淡出蒙版透明度 */
export const FADE_ALPHA = 0.18;

// ── 主题 / 颜色 ─────────────────────────────────────────────
// ⚠ 修改后需同步 global.css :root 中的 CSS 变量
export const BG_COLOR = '#05070d';
export const ASCII_TEXT_COLOR = '#c7ddff';
export const FPS_LABEL_COLOR = '#8aa2c8';
export const BUFFER_CLEAR_COLOR = '#000';
/** 星星颜色 RGB 分量 */
export const STAR_COLOR_RGB = [214, 235, 255] as const;
/** 渲染字体族（仅 Canvas 中使用的简短字体栈） */
export const FONT_FAMILY = 'ui-monospace, monospace';
/** FPS 标签距左上角偏移量 (px) */
export const FPS_LABEL_OFFSET = 8;

// ── 星空 ─────────────────────────────────────────────────────
/** 每像素星星密度 */
export const STAR_DENSITY = 0.0016;
/** 最少星星数量 */
export const MIN_STAR_COUNT = 80;
export const TWINKLE_SPEED_BASE = 0.7;
export const TWINKLE_SPEED_VARIANCE = 1.5;
export const STAR_BRIGHTNESS_BASE = 0.2;
export const STAR_BRIGHTNESS_VARIANCE = 0.6;
/** 闪烁振幅 & 偏移 */
export const TWINKLE_AMPLITUDE = 0.35;
export const TWINKLE_OFFSET = 0.35;
/** 星星渲染像素尺寸 */
export const STAR_SIZE = 1;

// ── 质量 / 性能 ──────────────────────────────────────────────
export const QUALITY_HIGH = 1;
export const QUALITY_LOW = 0.8;
/** ASCII 高质量模式采样间隔（每 N 帧采样一次） */
export const ASCII_SAMPLE_INTERVAL_HIGH = 1;
/** ASCII 低质量模式采样间隔（每 N 帧采样一次） */
export const ASCII_SAMPLE_INTERVAL_LOW = 3;
/** 增量重绘亮度变化阈值（0-255） */
export const ASCII_DIRTY_BRIGHTNESS_EPSILON = 8;
/** 脏单元占比超过此阈值时回退全量重绘 */
export const ASCII_DIRTY_FULL_REDRAW_RATIO = 0.55;
/** 低于此 FPS 自动降级 */
export const FPS_DOWNGRADE_THRESHOLD = 42;
/** 高于此 FPS 自动恢复 */
export const FPS_UPGRADE_THRESHOLD = 54;
/** FPS 采样窗口大小 */
export const PERF_SAMPLE_SIZE = 50;
/** resize 同步节流间隔 (ms) */
export const RESIZE_THROTTLE_MS = 80;
/** 无采样数据时的默认 FPS */
export const DEFAULT_FPS = 60;
/** 避免除零的最小平均帧时间 */
export const MIN_AVG_FRAME_TIME = 0.0001;

// ── Canvas ───────────────────────────────────────────────────
/** 最大设备像素比 */
export const MAX_DPR = 2;

// ── Ticker ───────────────────────────────────────────────────
/** 最大帧间隔 (s)，等效 20 FPS 下限 */
export const MAX_DELTA = 1 / 20;

// ── App ──────────────────────────────────────────────────────
export const APP_CANVAS_SELECTOR = '#app';
