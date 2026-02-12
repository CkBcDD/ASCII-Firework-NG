import { mapBrightnessToChar } from '../ascii/mapper';
import { createLogger } from '../platform/logger';
import {
  BASE_CELL_WIDTH,
  BASE_CELL_HEIGHT,
  MIN_COLUMNS,
  MIN_ROWS,
  FADE_ALPHA,
  BG_COLOR,
  FPS_LABEL_COLOR,
  BUFFER_CLEAR_COLOR,
  FONT_FAMILY,
  FPS_LABEL_OFFSET,
  DEFAULT_FPS,
} from '../config';

export type AsciiLayer = {
  resize: (width: number, height: number, qualityScale: number) => void;
  fade: () => void;
  withBuffer: (draw: (ctx: CanvasRenderingContext2D) => void) => void;
  renderTo: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
};

const log = createLogger('AsciiLayer');

export const createAsciiLayer = (): AsciiLayer => {
  const buffer = document.createElement('canvas');
  const bufferContext = buffer.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!bufferContext) {
    throw new Error('无法初始化离屏画布。');
  }

  let columns = 1;
  let rows = 1;
  let cellWidth = BASE_CELL_WIDTH;
  let cellHeight = BASE_CELL_HEIGHT;
  let worldWidth = 1;
  let worldHeight = 1;

  const resize = (width: number, height: number, qualityScale: number) => {
    worldWidth = Math.max(1, width);
    worldHeight = Math.max(1, height);
    cellWidth = Math.max(BASE_CELL_WIDTH, Math.floor(BASE_CELL_WIDTH / qualityScale));
    cellHeight = Math.max(BASE_CELL_HEIGHT, Math.floor(BASE_CELL_HEIGHT / qualityScale));
    columns = Math.max(MIN_COLUMNS, Math.floor(width / cellWidth));
    rows = Math.max(MIN_ROWS, Math.floor(height / cellHeight));
    buffer.width = columns;
    buffer.height = rows;
    bufferContext.fillStyle = BUFFER_CLEAR_COLOR;
    bufferContext.fillRect(0, 0, columns, rows);
    log.info(`缓冲区调整: ${columns}×${rows} 单元格, 世界: ${worldWidth}×${worldHeight}, 质量: ${qualityScale}`);
  };

  const fade = () => {
    bufferContext.fillStyle = `rgba(0, 0, 0, ${FADE_ALPHA})`;
    bufferContext.fillRect(0, 0, columns, rows);
  };

  const withBuffer = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const scaleX = columns / worldWidth;
    const scaleY = rows / worldHeight;
    bufferContext.save();
    bufferContext.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    draw(bufferContext);
    bufferContext.restore();
  };

  const renderTo = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = bufferContext.getImageData(0, 0, columns, rows).data;
    const drawCellHeight = height / rows;
    const drawCellWidth = width / columns;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    const fontSize = Math.ceil(drawCellHeight);
    ctx.font = `${fontSize}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';

    // 测量实际字符宽度，计算水平拉伸系数以匹配单元格宽度
    const actualCharWidth = ctx.measureText('M').width;
    const hStretch = drawCellWidth / actualCharWidth;

    ctx.save();
    ctx.scale(hStretch, 1);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = (row * columns + column) * 4;
        const red = imageData[index] ?? 0;
        const green = imageData[index + 1] ?? 0;
        const blue = imageData[index + 2] ?? 0;
        const brightness = red * 0.299 + green * 0.587 + blue * 0.114;
        const char = mapBrightnessToChar(brightness);
        if (char === ' ') {
          continue;
        }
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillText(char, column * actualCharWidth, row * drawCellHeight);
      }
    }

    ctx.restore();

    // FPS 标签在原始变换下渲染，避免拉伸
    const fpsLabel = `FPS ${Math.round((window as Window & { __fps?: number }).__fps ?? DEFAULT_FPS)}`;
    ctx.fillStyle = FPS_LABEL_COLOR;
    ctx.font = `${fontSize}px ${FONT_FAMILY}`;
    ctx.fillText(fpsLabel, FPS_LABEL_OFFSET, FPS_LABEL_OFFSET);
  };

  return {
    resize,
    fade,
    withBuffer,
    renderTo
  };
};
