#!/usr/bin/env node
import * as fs from 'fs';
import { z, type ZodRawShape } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolvePaths, readResults, verdictFor, resolveImage, listBaselines } from './lib';

const packageJson = require('../package.json');

// Project root: --root <path> flag or cwd (MCP clients set cwd to the workspace).
const rootFlag = process.argv.indexOf('--root');
const projectRoot = rootFlag !== -1 && process.argv[rootFlag + 1] ? process.argv[rootFlag + 1] : process.cwd();

const server = new McpServer({ name: 'testivai', version: packageJson.version });

server.registerTool(
  'get_visual_results',
  {
    title: 'Get visual test results',
    description:
      'Read the latest TestivAI visual regression results (visual-report/results.json). ' +
      'Returns a per-snapshot verdict combining the pixel diff and the DOM signal: ' +
      'DOM-identical diffs are likely render noise; DOM changes are real and need human review. ' +
      'Run the test suite first (e.g. `npx playwright test`) if results are stale or missing.',
    inputSchema: {},
  },
  async () => {
    const paths = resolvePaths(projectRoot);
    const results = readResults(paths);
    if (!results) {
      return {
        content: [
          {
            type: 'text',
            text: `No results found at ${paths.reportDir}/results.json. Run the visual tests first (e.g. npx playwright test).`,
          },
        ],
      };
    }
    const lines = [
      `Run: ${results.timestamp} — ${results.summary.total} snapshots: ${results.summary.passed} passed, ${results.summary.changed} changed, ${results.summary.newSnapshots} new.`,
      '',
      ...results.snapshots.map((s) => `- ${s.name}: ${verdictFor(s)}`),
      '',
      'Baseline approval is a human decision: suggest `/testivai approve <name>` on the PR (or `npx testivai approve` locally); do not approve autonomously.',
    ];
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// registerTool is called through an untyped alias: zod@3.25 + TS 6 blow the
// type-depth limit (TS2589) when inferring the schema generics. Runtime
// validation of the input schema is unaffected.
(server.registerTool as Function)(
  'get_snapshot_diff',
  {
    title: 'View snapshot diff images',
    description:
      'Return the baseline, current, and diff images for one changed snapshot so you can see what changed visually. ' +
      'Use get_visual_results first to find snapshot names.',
    inputSchema: { name: z.string().describe('Snapshot name from get_visual_results') },
  },
  (async ({ name }: { name: string }) => {
    const paths = resolvePaths(projectRoot);
    const results = readResults(paths);
    const snapshot = results?.snapshots.find((s) => s.name === name);
    if (!results || !snapshot) {
      return { content: [{ type: 'text', text: `No snapshot named "${name}" in the latest results.` }] };
    }
    const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }> = [
      { type: 'text', text: `${snapshot.name}: ${verdictFor(snapshot)}` },
    ];
    for (const [label, rel] of [
      ['baseline', snapshot.baselinePath],
      ['current', snapshot.currentPath],
      ['diff', snapshot.diffPath],
    ] as const) {
      const abs = rel ? resolveImage(paths, rel) : null;
      if (abs) {
        content.push({ type: 'text', text: `${label}:` });
        content.push({ type: 'image', data: fs.readFileSync(abs).toString('base64'), mimeType: 'image/png' });
      }
    }
    return { content };
  })
);

server.registerTool(
  'list_baselines',
  {
    title: 'List committed baselines',
    description: 'List the snapshot baselines committed under .testivai/baselines/.',
    inputSchema: {},
  },
  async () => {
    const names = listBaselines(projectRoot);
    return {
      content: [
        {
          type: 'text',
          text: names.length ? `Baselines (${names.length}):\n${names.map((n) => `- ${n}`).join('\n')}` : 'No baselines yet — the first test run creates them.',
        },
      ],
    };
  }
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error('testivai-mcp failed to start:', err);
  process.exit(1);
});
