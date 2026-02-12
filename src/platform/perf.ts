import { PERF_SAMPLE_SIZE, DEFAULT_FPS, MIN_AVG_FRAME_TIME } from '../config';

export type PerfMonitor = {
  sample: (deltaSeconds: number) => void;
  getFps: () => number;
};

export const createPerfMonitor = (): PerfMonitor => {
  const frameTimes = new Float64Array(PERF_SAMPLE_SIZE);
  let sampleCount = 0;
  let writeIndex = 0;
  let totalFrameTime = 0;

  const sample = (deltaSeconds: number) => {
    if (sampleCount < PERF_SAMPLE_SIZE) {
      frameTimes[writeIndex] = deltaSeconds;
      totalFrameTime += deltaSeconds;
      sampleCount += 1;
    } else {
      totalFrameTime -= frameTimes[writeIndex] ?? 0;
      frameTimes[writeIndex] = deltaSeconds;
      totalFrameTime += deltaSeconds;
    }
    writeIndex = (writeIndex + 1) % PERF_SAMPLE_SIZE;
  };

  const getFps = () => {
    if (sampleCount === 0) {
      return DEFAULT_FPS;
    }
    const average = totalFrameTime / sampleCount;
    return 1 / Math.max(average, MIN_AVG_FRAME_TIME);
  };

  return {
    sample,
    getFps
  };
};
