import { mergeTestConfig } from '../../src/config/loader';
import type { TestivAIProjectConfig } from '../../src/types';

const project = {
  layout: { sensitivity: 2, tolerance: 1 },
  ai: { sensitivity: 2, confidence: 0.7 },
} as TestivAIProjectConfig;

describe('mergeTestConfig — per-call capture options', () => {
  it('passes ignoreSelectors through the merge', () => {
    const merged = mergeTestConfig(project, { ignoreSelectors: ['.badge'] });
    expect(merged.ignoreSelectors).toEqual(['.badge']);
  });

  it('passes stabilize through the merge', () => {
    const merged = mergeTestConfig(project, { stabilize: false });
    expect(merged.stabilize).toBe(false);
  });

  it('leaves them undefined when not provided', () => {
    const merged = mergeTestConfig(project, { selectors: ['x'] });
    expect(merged.ignoreSelectors).toBeUndefined();
  });
});
