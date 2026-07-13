/**
 * Capture stabilization — neutralize the top causes of flaky visual diffs
 * before a screenshot is taken:
 *
 *   1. CSS animations & transitions (elements caught mid-motion)
 *   2. The blinking text caret
 *   3. Web fonts still loading (fallback font rendered in the capture)
 *   4. Smooth scrolling still settling
 *
 * Resolution order for the on/off switch (first defined wins):
 *   1. per-snapshot  testivai.witness(..., { stabilize })
 *   2. project       testivai.config.ts → stabilize
 *   3. global        .testivai/config.json → stabilize
 *   4. default       true
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Page } from '@playwright/test';
import { TestivAIConfig, TestivAIProjectConfig } from '../types';

/**
 * CSS injected for the duration of the capture. `animation: none` freezes
 * every animation at its initial state (deterministic across runs);
 * transitions are removed so property changes land instantly.
 */
export const STABILIZE_CSS = `*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}`;

/** Read the global `stabilize` flag from `.testivai/config.json`, if set. */
export function readWitnessConfigStabilize(projectRoot: string): boolean | undefined {
  try {
    const configPath = path.join(projectRoot, '.testivai', 'config.json');
    if (!fs.existsSync(configPath)) return undefined;
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return typeof raw.stabilize === 'boolean' ? raw.stabilize : undefined;
  } catch {
    return undefined;
  }
}

/** Resolve the effective stabilize flag across all three config sources. */
export function resolveStabilize(
  projectRoot: string,
  projectConfig: TestivAIProjectConfig,
  testConfig?: TestivAIConfig,
): boolean {
  if (typeof testConfig?.stabilize === 'boolean') return testConfig.stabilize;
  if (typeof projectConfig.stabilize === 'boolean') return projectConfig.stabilize;
  const fromWitnessConfig = readWitnessConfigStabilize(projectRoot);
  if (typeof fromWitnessConfig === 'boolean') return fromWitnessConfig;
  return true;
}

/**
 * Wait for web fonts to finish loading, bounded at 3s so a hanging font
 * request can never stall the capture. Best-effort: errors are swallowed —
 * a missing FontFaceSet API just means no wait.
 */
export async function waitForFonts(page: Page): Promise<void> {
  try {
    await page.evaluate(() =>
      Promise.race([
        (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]),
    );
  } catch {
    // Page navigated or evaluate failed — capture proceeds unstabilized fonts
  }
}
