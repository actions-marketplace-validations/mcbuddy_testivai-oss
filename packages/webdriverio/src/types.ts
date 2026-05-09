/**
 * Public types for @testivai/witness-webdriverio.
 */

/**
 * Minimal subset of the WebdriverIO `browser` object the witness function
 * relies on. Defining a structural type here means consumers can pass any
 * WDIO-shaped object (sync or async, real or mocked) without us pulling
 * `webdriverio`'s heavy global type into our public surface.
 */
export interface WitnessBrowser {
  /**
   * Capture a full-page screenshot of the active session. Returns a base64
   * PNG, matching the WebdriverIO `browser.takeScreenshot()` return shape.
   */
  takeScreenshot(): Promise<string>;

  /**
   * Execute a script in the page context. We only use the no-arg form.
   * Type kept loose to accept WDIO 8/9 signature variants.
   */
  execute<T = unknown>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
}

/**
 * Options for a single witness() call. All optional.
 */
export interface WitnessOptions {
  /**
   * Skip DOM capture even if the adapter would normally write dom.html
   * alongside the screenshot. Use for pages where DOM serialization is
   * known to be expensive or unstable.
   */
  skipDom?: boolean;
}

/**
 * Configuration passed to the WDIO service.
 *
 * Local mode is detected automatically from `.testivai/config.json` —
 * these options exist only to override the defaults that
 * generateReport() picks up from that file.
 */
export interface TestivaiServiceOptions {
  /** Project root for the test run. Defaults to `process.cwd()`. */
  projectRoot?: string;
  /** Override the report directory. Defaults to local config (`visual-report`). */
  reportDir?: string;
  /** Override the diff threshold (0–1). Defaults to local config (0.1). */
  threshold?: number;
  /** Auto-open the rendered report in a browser. Defaults to local config. */
  autoOpen?: boolean;
  /** Suppress all adapter logging except errors. */
  quiet?: boolean;
}
