/**
 * @testivai/witness-webdriverio — capture function
 *
 * The user-facing call inside a WebdriverIO test:
 *
 *   import { testivai } from '@testivai/witness-webdriverio';
 *   await testivai.witness(browser, 'homepage');
 *
 * Captures a full-page screenshot via `browser.takeScreenshot()` and the
 * page DOM via `browser.execute(() => document.documentElement.outerHTML)`,
 * then writes both into `.testivai/temp/<name>/` using the same
 * BaselineStore layout as @testivai/witness-playwright. The TestivaiService
 * (registered in wdio.conf.ts) runs `compareAll` + `generateReport` after
 * all tests finish.
 *
 * Architectural choice: we rely on WebdriverIO's native `takeScreenshot`
 * and `execute` APIs rather than opening a CDP session. This is the whole
 * point of the per-framework adapter — using the framework's stable public
 * API instead of fighting Chrome-launch coordination.
 */

import { BaselineStore } from '@testivai/witness';
import type { WitnessBrowser, WitnessOptions } from './types';

/**
 * Capture a screenshot + DOM and write them as a temp snapshot.
 *
 * @param browser WebdriverIO browser-like object (must expose
 *   `takeScreenshot()` and `execute()`).
 * @param name    Snapshot name. Becomes the directory under
 *   `.testivai/temp/<name>/` and the key in the rendered report.
 * @param options Per-call overrides.
 */
export async function witness(
  browser: WitnessBrowser,
  name: string,
  options: WitnessOptions = {},
): Promise<void> {
  if (!name || typeof name !== 'string') {
    throw new Error('testivai.witness: snapshot name is required and must be a non-empty string');
  }
  if (!browser || typeof browser.takeScreenshot !== 'function') {
    throw new Error('testivai.witness: browser argument must expose takeScreenshot()');
  }

  // 1. Capture screenshot (base64 PNG → Buffer)
  const base64 = await browser.takeScreenshot();
  if (typeof base64 !== 'string' || base64.length === 0) {
    throw new Error(`testivai.witness("${name}"): browser.takeScreenshot() returned an empty value`);
  }
  const screenshot = Buffer.from(base64, 'base64');

  // 2. Capture DOM (best-effort — never break the screenshot path)
  let dom: string | undefined;
  if (!options.skipDom && typeof browser.execute === 'function') {
    try {
      const result = await browser.execute<string>(
        // Inline string form for maximum WDIO sync/async compatibility.
        // The function-form across WDIO 8/9 has subtle typing differences;
        // the string form is stable.
        'return document.documentElement.outerHTML;',
      );
      if (typeof result === 'string' && result.length > 0) {
        dom = result;
      }
    } catch {
      // Suppressed by design. DOM capture failure means the noise hint
      // is unavailable for this snapshot; pixel diff still works.
    }
  }

  // 3. Write to .testivai/temp/<name>/
  const store = new BaselineStore(process.cwd());
  store.writeTemp(name, screenshot, dom);
}
