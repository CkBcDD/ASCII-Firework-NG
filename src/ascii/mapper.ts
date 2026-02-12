import { CHARSET } from '../config';

export const mapBrightnessToChar = (value: number): string => {
  const normalized = Math.max(0, Math.min(1, value / 255));
  const index = Math.floor(normalized * (CHARSET.length - 1));
  return CHARSET[index] ?? ' ';
};
