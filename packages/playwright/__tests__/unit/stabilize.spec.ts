import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { STABILIZE_CSS, readWitnessConfigStabilize, resolveStabilize, waitForFonts } from '../../src/config/stabilize';
import { TestivAIProjectConfig } from '../../src/types';

const projectConfig = (overrides: Partial<TestivAIProjectConfig> = {}): TestivAIProjectConfig =>
  ({
    layout: { sensitivity: 2, tolerance: 1 },
    ai: { sensitivity: 2, confidence: 0.7 },
    ...overrides,
  } as TestivAIProjectConfig);

describe('capture stabilization', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-stabilize-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const writeWitnessConfig = (config: object) => {
    fs.mkdirSync(path.join(root, '.testivai'), { recursive: true });
    fs.writeFileSync(path.join(root, '.testivai', 'config.json'), JSON.stringify(config));
  };

  it('neutralizes animations, transitions, caret, and smooth scroll', () => {
    expect(STABILIZE_CSS).toContain('animation: none !important');
    expect(STABILIZE_CSS).toContain('transition: none !important');
    expect(STABILIZE_CSS).toContain('caret-color: transparent !important');
    expect(STABILIZE_CSS).toContain('scroll-behavior: auto !important');
  });

  it('defaults to enabled', () => {
    expect(resolveStabilize(root, projectConfig())).toBe(true);
  });

  it('reads the global flag from .testivai/config.json', () => {
    writeWitnessConfig({ mode: 'local', stabilize: false });
    expect(readWitnessConfigStabilize(root)).toBe(false);
    expect(resolveStabilize(root, projectConfig())).toBe(false);
  });

  it('project config overrides config.json', () => {
    writeWitnessConfig({ mode: 'local', stabilize: false });
    expect(resolveStabilize(root, projectConfig({ stabilize: true }))).toBe(true);
  });

  it('per-snapshot config wins over everything', () => {
    writeWitnessConfig({ mode: 'local', stabilize: true });
    expect(resolveStabilize(root, projectConfig({ stabilize: true }), { stabilize: false })).toBe(false);
  });

  it('ignores malformed config.json', () => {
    fs.mkdirSync(path.join(root, '.testivai'), { recursive: true });
    fs.writeFileSync(path.join(root, '.testivai', 'config.json'), '{not json');
    expect(resolveStabilize(root, projectConfig())).toBe(true);
  });

  it('waitForFonts awaits the page fonts and swallows errors', async () => {
    const evaluated: unknown[] = [];
    const page = {
      evaluate: async (fn: unknown) => {
        evaluated.push(fn);
        return undefined;
      },
    };
    await waitForFonts(page as never);
    expect(evaluated).toHaveLength(1);

    const throwingPage = {
      evaluate: async () => {
        throw new Error('detached');
      },
    };
    await expect(waitForFonts(throwingPage as never)).resolves.toBeUndefined();
  });
});
