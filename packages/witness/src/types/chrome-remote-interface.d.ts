declare module 'chrome-remote-interface' {
  export interface Client {
    on(event: string, listener: (...args: any[]) => void): void;
    once(event: string, listener: (...args: any[]) => void): void;
    send(method: string, params?: any): Promise<any>;
    close(): Promise<void>;
    Target: {
      getTargets(): Promise<{ targetInfos: any[] }>;
      attachToTarget(params: { targetId: string; flatten?: boolean }): Promise<any>;
      createTarget(params: { url?: string }): Promise<{ targetId: string }>;
      closeTarget(params: { targetId: string }): Promise<void>;
    };
    Page: {
      enable(): Promise<void>;
      getLayoutMetrics(): Promise<{
        contentSize: { x: number; y: number; width: number; height: number };
        cssContentSize?: { x: number; y: number; width: number; height: number };
      }>;
      captureScreenshot(params?: {
        format?: string;
        fromSurface?: boolean;
        captureBeyondViewport?: boolean;
        clip?: { x: number; y: number; width: number; height: number; scale: number };
      }): Promise<{ data: string }>;
      addScriptToEvaluateOnNewDocument(params: { source: string }): Promise<any>;
      reload(params?: any): Promise<void>;
      frameNavigated(callback: (params: any) => void): void;
      loadEventFired(callback: () => void): void;
    };
    Runtime: {
      enable(): Promise<void>;
      addBinding(params: { name: string }): Promise<void>;
      evaluate(params: { expression: string; returnByValue?: boolean }): Promise<{ result: { value: any } }>;
      bindingCalled(callback: (params: { name: string; payload: string }) => void): void;
      consoleAPICalled(callback: (params: any) => void): void;
      exceptionThrown(callback: (params: { exceptionDetails: any }) => void): void;
    };
    Emulation: {
      setDeviceMetricsOverride(params: {
        width: number;
        height: number;
        deviceScaleFactor: number;
        mobile: boolean;
      }): Promise<void>;
    };
    DOM: {
      getDocument(): Promise<{ root: { nodeId: number } }>;
      getOuterHTML(params: { nodeId: number }): Promise<{ outerHTML: string }>;
    };
    Network: {
      requestWillBeSent(callback: (params: any) => void): void;
      responseReceived(callback: (params: any) => void): void;
    };
  }

  export namespace CDP {
    export interface Client extends chrome_remote_interface.Client {}
  }

  export interface CdpOptions {
    target?: string;
    port?: number;
    host?: string;
    local?: boolean;
  }

  interface CDPStatic {
    (options?: CdpOptions | string): Promise<Client>;
    /** Open a new tab at url (wraps /json/new). */
    New(options?: { port?: number; host?: string; url?: string }): Promise<{ id: string; webSocketDebuggerUrl?: string }>;
    /** Close a tab by id (wraps /json/close). */
    Close(options: { port?: number; host?: string; id: string }): Promise<void>;
  }

  const CDP: CDPStatic;
  export default CDP;
}
