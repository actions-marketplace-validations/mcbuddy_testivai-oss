/**
 * @testivai/witness-selenium
 *
 * Selenium WebDriver adapter for the TestivAI Witness OSS toolkit. Pairs
 * with `@testivai/witness` (the local CLI + diff engine) and shares the
 * same `.testivai/baselines/` layout as every other TestivAI adapter.
 *
 *   import { testivai } from '@testivai/witness-selenium';
 *   await testivai.witness(driver, 'homepage');
 *
 * Then run `npx testivai report` (add `--fail-on-diff` in CI) to compare
 * against committed baselines and render visual-report/index.html.
 */

import { witness } from './witness';

export { witness } from './witness';
export type { WitnessDriver, WitnessOptions } from './types';

/**
 * Convenience namespace mirroring @testivai/witness-playwright's API:
 *
 *   await testivai.witness(driver, 'homepage');
 */
export const testivai = {
  witness,
};

export const VERSION = require('../package.json').version as string;
