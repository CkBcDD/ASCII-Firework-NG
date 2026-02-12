import { MAX_DELTA } from '../config';

export type TickCallback = (deltaSeconds: number, elapsedSeconds: number) => void;

export const createTicker = (callback: TickCallback) => {
  let animationFrameId = 0;
  let previousTime = performance.now();
  let elapsed = 0;

  const loop = (time: number) => {
    const deltaSeconds = Math.min((time - previousTime) / 1000, MAX_DELTA);
    previousTime = time;
    elapsed += deltaSeconds;
    callback(deltaSeconds, elapsed);
    animationFrameId = requestAnimationFrame(loop);
  };

  return {
    start: () => {
      previousTime = performance.now();
      animationFrameId = requestAnimationFrame(loop);
    },
    stop: () => cancelAnimationFrame(animationFrameId)
  };
};
