import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { TestivaiService } from '../service';

describe('TestivaiService.onComplete', () => {
  let projectRoot: string;
  let originalCwd: string;
  let logSpy: jest.SpyInstance;
  let errSpy: jest.SpyInstance;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-wdio-svc-'));
    originalCwd = process.cwd();
    process.chdir(projectRoot);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(projectRoot, { recursive: true, force: true });
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  function writeLocalConfig(config: Record<string, unknown> = { mode: 'local' }): void {
    const configDir = path.join(projectRoot, '.testivai');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(config));
  }

  function seedTempScreenshot(name: string): void {
    const tempDir = path.join(projectRoot, '.testivai', 'temp', name);
    fs.mkdirSync(tempDir, { recursive: true });
    // Tiny RGBA buffer; the report pipeline byte-equals first, falls back
    // to the diff engine. Bytes don't have to be a real PNG for this test.
    fs.writeFileSync(path.join(tempDir, 'screenshot.png'), Buffer.from([0, 0, 0, 0]));
  }

  it('skips report generation when not in local mode (no config.json)', async () => {
    const svc = new TestivaiService();
    await svc.onComplete();

    const reportDir = path.join(projectRoot, 'visual-report');
    expect(fs.existsSync(reportDir)).toBe(false);
    expect(logSpy.mock.calls.flat().join('\n')).toMatch(/Cloud mode is not yet supported/);
  });

  it('skips report generation when mode is not "local"', async () => {
    writeLocalConfig({ mode: 'cloud' });
    const svc = new TestivaiService();
    await svc.onComplete();

    expect(fs.existsSync(path.join(projectRoot, 'visual-report'))).toBe(false);
  });

  it('generates a local report when mode is local and temp captures exist', async () => {
    writeLocalConfig({ mode: 'local' });
    seedTempScreenshot('homepage');

    const svc = new TestivaiService();
    await svc.onComplete();

    const reportDir = path.join(projectRoot, 'visual-report');
    expect(fs.existsSync(path.join(reportDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(reportDir, 'results.json'))).toBe(true);

    const json = JSON.parse(
      fs.readFileSync(path.join(reportDir, 'results.json'), 'utf-8'),
    );
    expect(json.summary.total).toBe(1);
    expect(json.summary.newSnapshots).toBe(1);
  });

  it('respects custom reportDir option', async () => {
    writeLocalConfig({ mode: 'local' });
    seedTempScreenshot('foo');

    const svc = new TestivaiService({ reportDir: 'custom-report-out' });
    await svc.onComplete();

    expect(fs.existsSync(path.join(projectRoot, 'custom-report-out', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'visual-report'))).toBe(false);
  });

  it('suppresses logging when quiet: true', async () => {
    writeLocalConfig({ mode: 'local' });
    seedTempScreenshot('foo');

    const svc = new TestivaiService({ quiet: true });
    await svc.onComplete();

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does not throw when report generation fails — logs and exits cleanly', async () => {
    writeLocalConfig({ mode: 'local' });

    // Use jest.isolateModules so we can mock @testivai/witness's
    // generateReport just for this test without poisoning the others.
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@testivai/witness', () => {
        const real = jest.requireActual('@testivai/witness');
        return {
          ...real,
          generateReport: jest.fn(() => {
            throw new Error('synthetic generateReport failure');
          }),
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TestivaiService: ScopedSvc } = require('../service');
      const svc = new ScopedSvc();
      await expect(svc.onComplete()).resolves.toBeUndefined();
      expect(errSpy).toHaveBeenCalled();
    });
  });

  it('default export is the same class', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../service');
    expect(mod.default).toBe(mod.TestivaiService);
  });
});
