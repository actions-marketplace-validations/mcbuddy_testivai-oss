import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolvePaths, readResults, verdictFor, resolveImage, listBaselines } from '../lib';

describe('@testivai/mcp lib', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-mcp-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const writeResults = (reportDir: string, data: unknown) => {
    fs.mkdirSync(path.join(root, reportDir), { recursive: true });
    fs.writeFileSync(path.join(root, reportDir, 'results.json'), JSON.stringify(data));
  };

  it('defaults reportDir to visual-report', () => {
    expect(resolvePaths(root).reportDir).toBe(path.join(root, 'visual-report'));
  });

  it('honors reportDir from .testivai/config.json', () => {
    fs.mkdirSync(path.join(root, '.testivai'), { recursive: true });
    fs.writeFileSync(path.join(root, '.testivai', 'config.json'), JSON.stringify({ reportDir: 'out' }));
    expect(resolvePaths(root).reportDir).toBe(path.join(root, 'out'));
  });

  it('returns null when results.json is missing', () => {
    expect(readResults(resolvePaths(root))).toBeNull();
  });

  it('reads results.json', () => {
    writeResults('visual-report', {
      version: '2.0.0',
      timestamp: 't',
      summary: { total: 1, passed: 1, changed: 0, newSnapshots: 0 },
      snapshots: [{ name: 'home', status: 'passed' }],
    });
    const results = readResults(resolvePaths(root));
    expect(results?.snapshots[0].name).toBe('home');
  });

  describe('verdictFor', () => {
    it('labels DOM-identical diffs as likely render noise', () => {
      const verdict = verdictFor({
        name: 'x',
        status: 'changed',
        diffPercent: 0.4,
        dom: { changed: false, noiseHint: true, summary: null },
      });
      expect(verdict).toContain('likely render noise');
      expect(verdict).toContain('0.40%');
    });

    it('labels DOM changes as real with the change summary', () => {
      const verdict = verdictFor({
        name: 'x',
        status: 'changed',
        diffPercent: 5,
        dom: { changed: true, noiseHint: false, summary: { added: 2, removed: 1, attributeChanges: 0 } },
      });
      expect(verdict).toContain('real structural change');
      expect(verdict).toContain('2 added, 1 removed');
    });

    it('treats missing DOM data as needing review', () => {
      expect(verdictFor({ name: 'x', status: 'changed' })).toContain('human review');
    });

    it('asks for human approval on new snapshots', () => {
      expect(verdictFor({ name: 'x', status: 'new' })).toContain('human');
    });
  });

  describe('resolveImage', () => {
    it('resolves an existing image inside the report dir', () => {
      writeResults('visual-report', {});
      const img = path.join(root, 'visual-report', 'images');
      fs.mkdirSync(img, { recursive: true });
      fs.writeFileSync(path.join(img, 'a.png'), 'png');
      expect(resolveImage(resolvePaths(root), 'images/a.png')).toBe(path.join(img, 'a.png'));
    });

    it('rejects path traversal out of the report dir', () => {
      writeResults('visual-report', {});
      fs.writeFileSync(path.join(root, 'secret.png'), 'png');
      expect(resolveImage(resolvePaths(root), '../secret.png')).toBeNull();
    });
  });

  it('lists baseline directories sorted', () => {
    for (const name of ['b-page', 'a-page']) {
      fs.mkdirSync(path.join(root, '.testivai', 'baselines', name), { recursive: true });
    }
    expect(listBaselines(root)).toEqual(['a-page', 'b-page']);
  });
});
