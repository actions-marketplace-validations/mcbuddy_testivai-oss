import { effectiveSnapshotName } from '../../src/snapshot';
import type { TestInfo } from '@playwright/test';

const testInfoWith = (projects: string[], current: string): TestInfo =>
  ({
    project: { name: current },
    config: { projects: projects.map((name) => ({ name })) },
  } as unknown as TestInfo);

describe('effectiveSnapshotName (baseline keying)', () => {
  it('leaves names untouched for single-project configs', () => {
    expect(effectiveSnapshotName('homepage', testInfoWith(['chromium'], 'chromium'))).toBe('homepage');
  });

  it('suffixes the project name when multiple projects run', () => {
    const info = testInfoWith(['chromium-desktop', 'mobile-safari'], 'mobile-safari');
    expect(effectiveSnapshotName('homepage', info)).toBe('homepage__mobile-safari');
  });

  it('two projects never collide on the same base name', () => {
    const projects = ['chromium-desktop', 'mobile-safari'];
    const a = effectiveSnapshotName('homepage', testInfoWith(projects, 'chromium-desktop'));
    const b = effectiveSnapshotName('homepage', testInfoWith(projects, 'mobile-safari'));
    expect(a).not.toBe(b);
  });

  it('sanitizes project names for the filesystem', () => {
    const info = testInfoWith(['Desktop Chrome @ 2x', 'other'], 'Desktop Chrome @ 2x');
    expect(effectiveSnapshotName('home', info)).toBe('home__desktop_chrome_2x');
  });

  it('tolerates missing project metadata (older runners, unit contexts)', () => {
    expect(effectiveSnapshotName('home', {} as TestInfo)).toBe('home');
    expect(
      effectiveSnapshotName('home', { config: { projects: [{ name: 'a' }, { name: 'b' }] } } as unknown as TestInfo),
    ).toBe('home');
  });
});
