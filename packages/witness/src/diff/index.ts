/**
 * TestivAI Diff Engine
 *
 * Pixel-level visual comparison engine forked from pixel-buffer-diff (Pbd)
 * by @p01 (MIT license). Extended with ignore regions, size mismatch
 * handling, region detection, and TypeScript support.
 *
 * @see https://github.com/p01/pixel-buffer-diff
 */

export { diff } from './diff';
export { applyIgnoreRegions } from './ignore';
export { applyMinimap } from './minimap';
export { normalizeDimensions } from './resize';
export { detectRegions } from './regions';
export { domDiff } from './dom-diff';
export type {
  DiffOptions,
  DiffResult,
  DiffRegion,
  IgnoreRegion,
  SizeMismatch,
  PbdRawResult,
} from './types';
export type { DomDiffResult, DomDiffSummary } from './dom-diff';
