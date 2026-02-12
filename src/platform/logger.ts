/**
 * 结构化日志系统
 *
 * 提供带时间戳、日志级别和模块名的格式化日志输出。
 * 每条日志格式：[HH:mm:ss.SSS] [LEVEL] [Module] message
 */

/**
 * 数值型日志级别（用于高效比较与过滤）。
 */
export const enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * 文本型日志级别（适合配置项与文档表达）。
 */
export type LogLevelName = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export type Logger = {
  debug: (message: string, ...data: unknown[]) => void;
  info: (message: string, ...data: unknown[]) => void;
  warn: (message: string, ...data: unknown[]) => void;
  error: (message: string, ...data: unknown[]) => void;
};

let currentLevel: LogLevel = LogLevel.DEBUG;

const LEVEL_BY_NAME: Record<LogLevelName, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  silent: LogLevel.SILENT
};

/**
 * 将日志级别配置转换为可比较的数值级别。
 */
export const toLogLevel = (level: LogLevel | LogLevelName): LogLevel =>
  typeof level === 'string' ? LEVEL_BY_NAME[level] : level;

/**
 * 设置全局日志输出阈值。
 *
 * @param level 日志级别（支持数值枚举与文本级别）。
 */
export const setLogLevel = (level: LogLevel | LogLevelName): void => {
  currentLevel = toLogLevel(level);
};

/**
 * 获取当前全局日志输出阈值。
 */
export const getLogLevel = (): LogLevel => currentLevel;

const pad2 = (n: number): string => (n < 10 ? '0' : '') + n;

const timestamp = (): string => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
};

const LEVEL_TAG: Record<number, string> = {
  [LogLevel.DEBUG]: 'DBG',
  [LogLevel.INFO]: 'INF',
  [LogLevel.WARN]: 'WRN',
  [LogLevel.ERROR]: 'ERR'
};

const LEVEL_STYLE: Record<number, string> = {
  [LogLevel.DEBUG]: 'color:#8aa2c8',
  [LogLevel.INFO]: 'color:#4ec9b0',
  [LogLevel.WARN]: 'color:#cca700;font-weight:bold',
  [LogLevel.ERROR]: 'color:#f44747;font-weight:bold'
};

const resolveConsoleFn = (level: LogLevel) =>
  level >= LogLevel.ERROR
    ? console.error
    : level >= LogLevel.WARN
      ? console.warn
      : level >= LogLevel.INFO
        ? console.info
        : console.debug;

/**
 * 创建作用域日志记录器。
 *
 * @param scope 日志作用域（通常为模块名）。
 */
export const createLogger = (scope: string): Logger => {
  const emit = (level: LogLevel, message: string, data: unknown[]) => {
    // 统一在入口做阈值过滤，避免各调用点重复判断。
    if (level < currentLevel) return;
    const tag = LEVEL_TAG[level];
    const style = LEVEL_STYLE[level];
    const fn = resolveConsoleFn(level);
    const prefix = `%c[${timestamp()}] [${tag}] [${scope}]%c`;
    if (data.length === 0) {
      fn(prefix, style, 'color:inherit', message);
    } else {
      fn(prefix, style, 'color:inherit', message, ...data);
    }
  };

  return {
    debug: (message, ...data) => emit(LogLevel.DEBUG, message, data),
    info: (message, ...data) => emit(LogLevel.INFO, message, data),
    warn: (message, ...data) => emit(LogLevel.WARN, message, data),
    error: (message, ...data) => emit(LogLevel.ERROR, message, data)
  };
};
