import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { witness } from '../witness';
import type { WitnessBrowser } from '../types';

/**
 * 1x1 transparent PNG, base64 encoded — small but valid enough for
 * "browser.takeScreenshot returned a real-looking string" assertions.
 */
const ONE_PX_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

describe('witness()', () => {
  let projectRoot: string;
  let originalCwd: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-wdio-witness-'));
    originalCwd = process.cwd();
    process.chdir(projectRoot);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  function makeBrowser(overrides: Partial<WitnessBrowser> = {}): WitnessBrowser {
    return {
      takeScreenshot: jest.fn().mockResolvedValue(ONE_PX_PNG_B64),
      execute: jest.fn().mockResolvedValue('<html><body><h1>Hi</h1></body></html>'),
      ...overrides,
    };
  }

  it('writes screenshot.png and dom.html under .testivai/temp/<name>/', async () => {
    await witness(makeBrowser(), 'homepage');

    const tempDir = path.join(projectRoot, '.testivai', 'temp', 'homepage');
    expect(fs.existsSync(path.join(tempDir, 'screenshot.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'dom.html'))).toBe(true);

    const dom = fs.readFileSync(path.join(tempDir, 'dom.html'), 'utf-8');
    expect(dom).toContain('<h1>Hi</h1>');

    const png = fs.readFileSync(path.join(tempDir, 'screenshot.png'));
    expect(png.length).toBeGreaterThan(0);
  });

  it('decodes the base64 screenshot into a real PNG buffer', async () => {
    const browser = makeBrowser();
    await witness(browser, 'snap');

    const png = fs.readFileSync(
      path.join(projectRoot, '.testivai', 'temp', 'snap', 'screenshot.png'),
    );
    // PNG magic header: 89 50 4E 47 0D 0A 1A 0A
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png[2]).toBe(0x4e);
    expect(png[3]).toBe(0x47);
  });

  it('skips DOM capture when skipDom: true', async () => {
    const browser = makeBrowser();
    await witness(browser, 'no-dom', { skipDom: true });

    const tempDir = path.join(projectRoot, '.testivai', 'temp', 'no-dom');
    expect(fs.existsSync(path.join(tempDir, 'screenshot.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'dom.html'))).toBe(false);
    // execute() is still used for capture stabilization — but never for DOM
    const domCalls = (browser.execute as jest.Mock).mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('outerHTML'),
    );
    expect(domCalls).toHaveLength(0);
  });

  it('omits dom.html when browser.execute is missing', async () => {
    const browser: WitnessBrowser = {
      takeScreenshot: jest.fn().mockResolvedValue(ONE_PX_PNG_B64),
      // execute deliberately omitted
    } as unknown as WitnessBrowser;
    await witness(browser, 'no-execute');

    const tempDir = path.join(projectRoot, '.testivai', 'temp', 'no-execute');
    expect(fs.existsSync(path.join(tempDir, 'screenshot.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'dom.html'))).toBe(false);
  });

  it('omits dom.html when DOM capture throws (best-effort)', async () => {
    const browser = makeBrowser({
      execute: jest.fn().mockRejectedValue(new Error('DOM serialization timed out')),
    });
    await witness(browser, 'flaky-dom');

    const tempDir = path.join(projectRoot, '.testivai', 'temp', 'flaky-dom');
    expect(fs.existsSync(path.join(tempDir, 'screenshot.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'dom.html'))).toBe(false);
  });

  it('omits dom.html when execute returns empty/non-string', async () => {
    const browser = makeBrowser({
      execute: jest.fn().mockResolvedValue(''),
    });
    await witness(browser, 'empty-dom');

    const tempDir = path.join(projectRoot, '.testivai', 'temp', 'empty-dom');
    expect(fs.existsSync(path.join(tempDir, 'screenshot.png'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'dom.html'))).toBe(false);
  });

  it('rejects empty/missing snapshot name', async () => {
    await expect(witness(makeBrowser(), '')).rejects.toThrow(/name is required/);
    // @ts-expect-error - intentional bad call
    await expect(witness(makeBrowser(), undefined)).rejects.toThrow(/name is required/);
  });

  it('rejects browser without takeScreenshot', async () => {
    // @ts-expect-error - intentional bad call
    await expect(witness({}, 'name')).rejects.toThrow(/takeScreenshot/);
  });

  it('throws a clear error when takeScreenshot returns an empty string', async () => {
    const browser = makeBrowser({
      takeScreenshot: jest.fn().mockResolvedValue(''),
    });
    await expect(witness(browser, 'no-pixels')).rejects.toThrow(
      /returned an empty value/,
    );
  });

  describe('variant keying', () => {
    it('folds the variant into the snapshot name (sanitized)', async () => {
      await witness(makeBrowser(), 'homepage', { variant: 'Firefox Mobile @2x' });
      const tempDir = path.join(projectRoot, '.testivai', 'temp', 'homepage__firefox_mobile_2x');
      expect(fs.existsSync(path.join(tempDir, 'screenshot.png'))).toBe(true);
    });

    it('different variants never collide', async () => {
      await witness(makeBrowser(), 'homepage', { variant: 'chrome' });
      await witness(makeBrowser(), 'homepage', { variant: 'firefox' });
      const base = path.join(projectRoot, '.testivai', 'temp');
      expect(fs.existsSync(path.join(base, 'homepage__chrome', 'screenshot.png'))).toBe(true);
      expect(fs.existsSync(path.join(base, 'homepage__firefox', 'screenshot.png'))).toBe(true);
    });
  });

  describe('capture preparation (stabilize + ignoreSelectors)', () => {
    const executedScripts = (browser: WitnessBrowser): string[] =>
      (browser.execute as jest.Mock).mock.calls
        .map((c) => c[0])
        .filter((s): s is string => typeof s === 'string');

    const writeConfig = (config: object) => {
      fs.mkdirSync(path.join(projectRoot, '.testivai'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.testivai', 'config.json'),
        JSON.stringify(config),
      );
    };

    it('injects stabilization CSS by default and removes it after capture', async () => {
      const browser = makeBrowser();
      await witness(browser, 'stable');

      const scripts = executedScripts(browser);
      expect(scripts.some((s) => s.includes('animation-duration: 0.001s'))).toBe(true);
      expect(scripts.some((s) => s.includes('caret-color: transparent'))).toBe(true);
      expect(scripts.some((s) => s.includes('el.remove()'))).toBe(true);
    });

    it('waits on document.fonts before the screenshot', async () => {
      const browser = makeBrowser();
      await witness(browser, 'fonts');

      const scripts = executedScripts(browser);
      expect(scripts.some((s) => s.includes('document.fonts'))).toBe(true);
    });

    it('merges ignoreSelectors from config.json and per-call options', async () => {
      writeConfig({ mode: 'local', ignoreSelectors: ['.from-config'] });
      const browser = makeBrowser();
      await witness(browser, 'ignored', { ignoreSelectors: ['.from-call'] });

      const injected = executedScripts(browser).find((s) => s.includes('visibility: hidden'));
      expect(injected).toBeDefined();
      expect(injected).toContain('.from-config');
      expect(injected).toContain('.from-call');
    });

    it('honors stabilize: false from config.json (no CSS injected)', async () => {
      writeConfig({ mode: 'local', stabilize: false });
      const browser = makeBrowser();
      await witness(browser, 'raw');

      const scripts = executedScripts(browser);
      expect(scripts.some((s) => s.includes('animation-duration'))).toBe(false);
      // no style tag injected — the DOM-capture script legitimately contains
      // element removal (ignoreSelectors exclusion), so target the style id
      expect(scripts.some((s) => s.includes('__testivai_capture_css__'))).toBe(false);
    });

    it('per-call stabilize: false wins over config default', async () => {
      const browser = makeBrowser();
      await witness(browser, 'raw-call', { stabilize: false });

      const scripts = executedScripts(browser);
      expect(scripts.some((s) => s.includes('animation-duration'))).toBe(false);
    });

    it('removes the injected CSS even when the screenshot throws', async () => {
      const browser = makeBrowser({
        takeScreenshot: jest.fn().mockRejectedValue(new Error('boom')),
      });
      await expect(witness(browser, 'explodes')).rejects.toThrow('boom');

      const scripts = executedScripts(browser);
      expect(scripts.some((s) => s.includes('__testivai_capture_css__') && s.includes('remove'))).toBe(true);
    });
  });
});
