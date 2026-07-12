/**
 * Tests for comment builder
 */

import { buildComment, buildEmptyComment } from '../comment';
import { ResultsData } from '../types';

describe('buildComment', () => {
  it('T6.1 - includes TestivAI Visual Report header', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 1, passed: 1, changed: 0, newSnapshots: 0 },
      snapshots: [{ id: '1', name: 'homepage', status: 'passed', currentPath: 'test.png' }],
    };

    const comment = buildComment(results);
    expect(comment).toContain('### 🔍 TestivAI Visual Report');
  });

  it('T6.2 - includes upsert marker', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 0, passed: 0, changed: 0, newSnapshots: 0 },
      snapshots: [],
    };

    const comment = buildComment(results);
    expect(comment).toContain('<!-- testivai-visual-report -->');
  });

  it('T6.3 - includes summary line with counts', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 5, passed: 2, changed: 2, newSnapshots: 1 },
      snapshots: [],
    };

    const comment = buildComment(results);
    expect(comment).toContain('✅ **2 passed**');
    expect(comment).toContain('⚠️ **2 changed**');
    expect(comment).toContain('🆕 **1 new**');
  });

  it('T6.4 - includes details with approve command for changed snapshots', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
      snapshots: [
        { id: '1', name: 'homepage', status: 'changed', diffPercentage: 12.5, currentPath: 'test.png' },
      ],
    };

    const comment = buildComment(results);
    expect(comment).toContain('homepage');
    expect(comment).toContain('12.50% different');
    expect(comment).toContain('/testivai approve homepage');
    expect(comment).toContain('/testivai approve --all');
  });

  it('T6.5 - no details sections when all passed', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 3, passed: 3, changed: 0, newSnapshots: 0 },
      snapshots: [
        { id: '1', name: 'page1', status: 'passed', currentPath: 'test.png' },
        { id: '2', name: 'page2', status: 'passed', currentPath: 'test.png' },
        { id: '3', name: 'page3', status: 'passed', currentPath: 'test.png' },
      ],
    };

    const comment = buildComment(results);
    expect(comment).not.toContain('Changed Snapshots');
    expect(comment).not.toContain('New Snapshots');
  });

  it('T6.6 - empty results has graceful message', () => {
    const comment = buildEmptyComment();
    expect(comment).toContain('No visual snapshots were captured');
  });

  it('renders new-snapshots section when present', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 1, passed: 0, changed: 0, newSnapshots: 1 },
      snapshots: [
        { id: '1', name: 'fresh-baseline', status: 'new', currentPath: 'fresh.png' },
      ],
    };
    const comment = buildComment(results);
    expect(comment).toContain('#### New Snapshots');
    expect(comment).toContain('`fresh-baseline`');
  });

  it('accepts diffPercent (new) and diffPercentage (legacy) interchangeably', () => {
    const newField: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
      snapshots: [
        { id: '1', name: 'a', status: 'changed', diffPercent: 7.5, currentPath: 'a.png' },
      ],
    };
    const legacyField: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
      snapshots: [
        { id: '1', name: 'a', status: 'changed', diffPercentage: 7.5, currentPath: 'a.png' },
      ],
    };
    expect(buildComment(newField)).toContain('7.50% different');
    expect(buildComment(legacyField)).toContain('7.50% different');
  });

  describe('DOM noise hint in PR comment', () => {
    it('renders "DOM unchanged" hint when noiseHint is true', () => {
      const results: ResultsData = {
        timestamp: Date.now(),
        summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
        snapshots: [
          {
            id: '1',
            name: 'noisy',
            status: 'changed',
            diffPercent: 0.5,
            currentPath: 'noisy.png',
            dom: { changed: false, summary: null, noiseHint: true },
          },
        ],
      };
      const comment = buildComment(results);
      expect(comment).toContain('DOM unchanged');
      expect(comment).toContain('likely render noise');
    });

    it('renders "DOM changed" hint with counts when noiseHint is false', () => {
      const results: ResultsData = {
        timestamp: Date.now(),
        summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
        snapshots: [
          {
            id: '1',
            name: 'real-change',
            status: 'changed',
            diffPercent: 12,
            currentPath: 'rc.png',
            dom: {
              changed: true,
              summary: { added: 2, removed: 0, attributeChanges: 1 },
              noiseHint: false,
            },
          },
        ],
      };
      const comment = buildComment(results);
      expect(comment).toContain('DOM changed');
      expect(comment).toContain('2 added');
      expect(comment).toContain('1 attribute change');
    });

    it('omits DOM hint when snapshot has no dom data', () => {
      const results: ResultsData = {
        timestamp: Date.now(),
        summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
        snapshots: [
          { id: '1', name: 'no-dom', status: 'changed', diffPercent: 5, currentPath: 'x.png' },
        ],
      };
      const comment = buildComment(results);
      expect(comment).not.toContain('💡 **DOM unchanged**');
      expect(comment).not.toContain('🧱 **DOM changed**');
    });

    it('singular vs plural attribute-change wording', () => {
      const buildWith = (count: number): string => buildComment({
        timestamp: Date.now(),
        summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
        snapshots: [{
          id: '1', name: 'x', status: 'changed', diffPercent: 1, currentPath: 'x.png',
          dom: { changed: true, summary: { added: 0, removed: 0, attributeChanges: count }, noiseHint: false },
        }],
      });
      expect(buildWith(1)).toContain('1 attribute change');
      expect(buildWith(1)).not.toContain('1 attribute changes');
      expect(buildWith(3)).toContain('3 attribute changes');
    });
  });
});
