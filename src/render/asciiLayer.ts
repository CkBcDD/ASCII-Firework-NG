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
  QUALITY_LOW,
  ASCII_SAMPLE_INTERVAL_HIGH,
  ASCII_SAMPLE_INTERVAL_LOW,
  ASCII_DIRTY_BRIGHTNESS_EPSILON,
  ASCII_DIRTY_FULL_REDRAW_RATIO,
} from '../config';

/**
 * ASCII 渲染层对外能力。
 */
export type AsciiLayer = {
  resize: (width: number, height: number, qualityScale: number) => void;
  fade: () => void;
  withBuffer: (draw: (ctx: CanvasRenderingContext2D) => void) => void;
  renderTo: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
};

const log = createLogger('AsciiLayer');

/**
 * 创建 ASCII 渲染层：负责离屏采样、字符映射与增量重绘。
 */
export const createAsciiLayer = (): AsciiLayer => {
  const buffer = document.createElement('canvas');
  const bufferContext = buffer.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!bufferContext) {
    throw new Error('无法初始化离屏画布。');
  }

  const asciiFrame = document.createElement('canvas');
  const asciiFrameContext = asciiFrame.getContext('2d', { alpha: false });
  if (!asciiFrameContext) {
    throw new Error('无法初始化 ASCII 画布。');
  }

  let columns = 1;
  let rows = 1;
  let cellWidth = BASE_CELL_WIDTH;
  let cellHeight = BASE_CELL_HEIGHT;
  let worldWidth = 1;
  let worldHeight = 1;
  let cachedFontSize = 0;
  let cachedCharWidth = 1;
  let sampleInterval = ASCII_SAMPLE_INTERVAL_HIGH;
  let sampleTick = 0;
  let forceFullRedraw = true;

  let previousChars = new Uint16Array(1);
  let previousColors = new Uint32Array(1);
  let previousBrightness = new Uint16Array(1);
  let nextChars = new Uint16Array(1);
  let nextColors = new Uint32Array(1);
  let nextBrightness = new Uint16Array(1);

  const isDirtyCell = (index: number) => {
    const charChanged = nextChars[index] !== previousChars[index];
    const colorChanged = nextColors[index] !== previousColors[index];
    const brightnessChanged = Math.abs(nextBrightness[index] - previousBrightness[index]) > ASCII_DIRTY_BRIGHTNESS_EPSILON;
    return charChanged || colorChanged || brightnessChanged;
  };

  const ensureCellCache = () => {
    const cellCount = columns * rows;
    previousChars = new Uint16Array(cellCount);
    previousColors = new Uint32Array(cellCount);
    previousBrightness = new Uint16Array(cellCount);
    nextChars = new Uint16Array(cellCount);
    nextColors = new Uint32Array(cellCount);
    nextBrightness = new Uint16Array(cellCount);
  };

  const resize = (width: number, height: number, qualityScale: number) => {
    worldWidth = Math.max(1, Math.round(width));
    worldHeight = Math.max(1, Math.round(height));
    cellWidth = Math.max(BASE_CELL_WIDTH, Math.floor(BASE_CELL_WIDTH / qualityScale));
    cellHeight = Math.max(BASE_CELL_HEIGHT, Math.floor(BASE_CELL_HEIGHT / qualityScale));
    columns = Math.max(MIN_COLUMNS, Math.floor(width / cellWidth));
    rows = Math.max(MIN_ROWS, Math.floor(height / cellHeight));
    buffer.width = columns;
    buffer.height = rows;
    bufferContext.fillStyle = BUFFER_CLEAR_COLOR;
    bufferContext.fillRect(0, 0, columns, rows);

    asciiFrame.width = worldWidth;
    asciiFrame.height = worldHeight;
    asciiFrameContext.fillStyle = BG_COLOR;
    asciiFrameContext.fillRect(0, 0, worldWidth, worldHeight);

    sampleInterval = qualityScale <= QUALITY_LOW ? ASCII_SAMPLE_INTERVAL_LOW : ASCII_SAMPLE_INTERVAL_HIGH;
    sampleTick = 0;
    forceFullRedraw = true;
    ensureCellCache();

    cachedFontSize = 0;
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
    const targetWidth = Math.max(1, Math.round(width));
    const targetHeight = Math.max(1, Math.round(height));

    if (asciiFrame.width !== targetWidth || asciiFrame.height !== targetHeight) {
      asciiFrame.width = targetWidth;
      asciiFrame.height = targetHeight;
      asciiFrameContext.fillStyle = BG_COLOR;
      asciiFrameContext.fillRect(0, 0, asciiFrame.width, asciiFrame.height);
      forceFullRedraw = true;
    }

    const drawCellHeight = height / rows;
    const drawCellWidth = width / columns;
    const fontSize = Math.ceil(drawCellHeight);

    asciiFrameContext.font = `${fontSize}px ${FONT_FAMILY}`;
    asciiFrameContext.textBaseline = 'top';

    if (fontSize !== cachedFontSize) {
      cachedCharWidth = Math.max(1, asciiFrameContext.measureText('M').width);
      cachedFontSize = fontSize;
      forceFullRedraw = true;
    }

    const shouldSample = sampleTick === 0 || forceFullRedraw;
    sampleTick = (sampleTick + 1) % Math.max(1, sampleInterval);

    if (shouldSample) {
      const imageData = bufferContext.getImageData(0, 0, columns, rows).data;
      const totalCells = columns * rows;
      let dirtyCells = 0;

      for (let index = 0; index < totalCells; index += 1) {
        const pixelIndex = index * 4;
        const red = imageData[pixelIndex] ?? 0;
        const green = imageData[pixelIndex + 1] ?? 0;
        const blue = imageData[pixelIndex + 2] ?? 0;
        const brightness = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
        const charCode = mapBrightnessToChar(brightness).charCodeAt(0);
        const colorCode = (red << 16) | (green << 8) | blue;

        nextChars[index] = charCode;
        nextColors[index] = colorCode;
        nextBrightness[index] = brightness;

        if (forceFullRedraw || isDirtyCell(index)) {
          dirtyCells += 1;
        }
      }

      const dirtyRatio = dirtyCells / Math.max(1, totalCells);
      // 当脏单元占比过高时，全量重绘通常比逐格更新更快且更稳定。
      const redrawAll = forceFullRedraw || dirtyRatio > ASCII_DIRTY_FULL_REDRAW_RATIO;
      const hStretch = drawCellWidth / cachedCharWidth;

      if (redrawAll) {
        asciiFrameContext.setTransform(1, 0, 0, 1, 0, 0);
        asciiFrameContext.fillStyle = BG_COLOR;
        asciiFrameContext.fillRect(0, 0, targetWidth, targetHeight);

        asciiFrameContext.save();
        asciiFrameContext.scale(hStretch, 1);

        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const index = row * columns + column;
            const charCode = nextChars[index] ?? 32;
            if (charCode === 32) {
              continue;
            }
            const colorCode = nextColors[index] ?? 0;
            const red = (colorCode >> 16) & 255;
            const green = (colorCode >> 8) & 255;
            const blue = colorCode & 255;
            asciiFrameContext.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            asciiFrameContext.fillText(String.fromCharCode(charCode), column * cachedCharWidth, row * drawCellHeight);
          }
        }

        asciiFrameContext.restore();
      } else {
        asciiFrameContext.setTransform(1, 0, 0, 1, 0, 0);
        asciiFrameContext.fillStyle = BG_COLOR;
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const index = row * columns + column;
            if (!isDirtyCell(index)) {
              continue;
            }
            asciiFrameContext.fillRect(column * drawCellWidth, row * drawCellHeight, drawCellWidth, drawCellHeight);
          }
        }

        asciiFrameContext.save();
        asciiFrameContext.scale(hStretch, 1);

        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const index = row * columns + column;
            if (!isDirtyCell(index)) {
              continue;
            }
            const charCode = nextChars[index] ?? 32;
            if (charCode === 32) {
              continue;
            }
            const colorCode = nextColors[index] ?? 0;
            const red = (colorCode >> 16) & 255;
            const green = (colorCode >> 8) & 255;
            const blue = colorCode & 255;
            asciiFrameContext.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            asciiFrameContext.fillText(String.fromCharCode(charCode), column * cachedCharWidth, row * drawCellHeight);
          }
        }

        asciiFrameContext.restore();
      }

      [previousChars, nextChars] = [nextChars, previousChars];
      [previousColors, nextColors] = [nextColors, previousColors];
      [previousBrightness, nextBrightness] = [nextBrightness, previousBrightness];
      forceFullRedraw = false;
    }

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(asciiFrame, 0, 0, width, height);

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
