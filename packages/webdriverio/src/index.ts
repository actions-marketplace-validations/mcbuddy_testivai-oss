/**
 * @testivai/witness-webdriverio
 *
 * WebdriverIO adapter for the TestivAI Witness OSS toolkit. Pairs with
 * `@testivai/witness` (the local CLI + diff engine) and shares the same
 * `.testivai/baselines/` layout as `@testivai/witness-playwright`.
 *
 *   import { testivai } from '@testivai/witness-webdriverio';
 *   import { TestivaiService } from '@testivai/witness-webdriverio/service';
 */

import { witness } from './witness';

export { witness } from './witness';
export { TestivaiService, default as DefaultTestivaiService } from './service';
export type { WitnessBrowser, WitnessOptions, TestivaiServiceOptions } from './types';

/**
 * Convenience namespace mirroring @testivai/witness-playwright's API:
 *
 *   await testivai.witness(browser, 'homepage');
 */
export const testivai = {
  witness,
};

export const VERSION = require('../package.json').version as string;
