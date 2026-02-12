import { PERF_SAMPLE_SIZE, DEFAULT_FPS, MIN_AVG_FRAME_TIME } from '../config';

export type PerfMonitor = {
  sample: (deltaSeconds: number) => void;
  getFps: () => number;
};

export const createPerfMonitor = (): PerfMonitor => {
  const frameTimes: number[] = [];

  const sample = (deltaSeconds: number) => {
    frameTimes.push(deltaSeconds);
    if (frameTimes.length > PERF_SAMPLE_SIZE) {
      frameTimes.shift();
    }
  };

  const getFps = () => {
    if (frameTimes.length === 0) {
      return DEFAULT_FPS;
    }
    const average = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
    return 1 / Math.max(average, MIN_AVG_FRAME_TIME);
  };

  return {
    sample,
    getFps
  };
};
