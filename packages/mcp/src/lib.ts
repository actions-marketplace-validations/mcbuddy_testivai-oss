import * as fs from 'fs';
import * as path from 'path';

/** Subset of the semver-governed results.json contract this server reads. */
export interface DomInfo {
  changed: boolean;
  noiseHint: boolean;
  summary: { added: number; removed: number; attributeChanges: number; textChanges?: number } | null;
}

export interface SnapshotResult {
  name: string;
  status: 'passed' | 'changed' | 'new';
  diffPercent?: number;
  baselinePath?: string;
  currentPath?: string;
  diffPath?: string;
  dom?: DomInfo;
}

export interface ResultsFile {
  version: string;
  timestamp: string;
  summary: { total: number; passed: number; changed: number; newSnapshots: number };
  snapshots: SnapshotResult[];
}

export interface ProjectPaths {
  root: string;
  reportDir: string;
}

/** Resolve the report dir from .testivai/config.json (reportDir key), default visual-report/. */
export function resolvePaths(root: string): ProjectPaths {
  let reportDir = 'visual-report';
  const configPath = path.join(root, '.testivai', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (typeof config.reportDir === 'string' && config.reportDir.length > 0) {
        reportDir = config.reportDir;
      }
    } catch {
      // unreadable config falls back to the default report dir
    }
  }
  return { root, reportDir: path.join(root, reportDir) };
}

export function readResults(paths: ProjectPaths): ResultsFile | null {
  const file = path.join(paths.reportDir, 'results.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as ResultsFile;
}

/** One-line, agent-oriented verdict for a snapshot. */
export function verdictFor(snapshot: SnapshotResult): string {
  if (snapshot.status === 'passed') return 'passed — no visual change';
  if (snapshot.status === 'new') return 'new snapshot — no baseline yet; a human should review and approve it';
  const pct = snapshot.diffPercent !== undefined ? `${snapshot.diffPercent.toFixed(2)}% pixels differ` : 'pixels differ';
  if (snapshot.dom?.noiseHint) {
    return `changed (${pct}) but DOM is structurally identical — likely render noise (font hinting, anti-aliasing); mention it, don't block`;
  }
  if (snapshot.dom?.changed) {
    const s = snapshot.dom.summary;
    const detail = s
      ? ` (${s.added} added, ${s.removed} removed, ${s.attributeChanges} attribute changes${s.textChanges ? `, ${s.textChanges} text changes` : ''})`
      : '';
    return `changed (${pct}) and the DOM changed${detail} — a real structural change; confirm it is intended before approving`;
  }
  return `changed (${pct}) — no DOM data; treat as needing human review`;
}

/** Resolve a report-relative image path safely inside the report dir. */
export function resolveImage(paths: ProjectPaths, relativePath: string): string | null {
  const abs = path.resolve(paths.reportDir, relativePath);
  if (!abs.startsWith(path.resolve(paths.reportDir) + path.sep)) return null; // no traversal
  return fs.existsSync(abs) ? abs : null;
}

export function listBaselines(root: string): string[] {
  const dir = path.join(root, '.testivai', 'baselines');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}
