// The parts of smartcube-web-bluetooth we use. The package ships TypeScript source but no built types,
// so Vite compiles its source (see the alias in vite.config.ts) and these declarations stand in for tsc.
declare module "smartcube-web-bluetooth" {
  type SmartCubeEvent = { timestamp: number } & (
    | { type: "MOVE"; move: string; face: number; direction: number; localTimestamp: number | null; cubeTimestamp: number | null }
    | { type: "FACELETS"; facelets: string }
    | { type: "BATTERY"; batteryLevel: number }
    | { type: "GYRO" }
    | { type: "HARDWARE" }
    | { type: "DISCONNECT" }
  );

  interface SmartCubeConnection {
    readonly deviceName: string;
    readonly deviceMAC: string;
    readonly protocol: { id: string; name: string };
    readonly capabilities: { gyroscope: boolean; battery: boolean; facelets: boolean; hardware: boolean; reset: boolean };
    events$: { subscribe(next: (event: SmartCubeEvent) => void): { unsubscribe(): void } };
    sendCommand(command: { type: "REQUEST_FACELETS" | "REQUEST_BATTERY" | "REQUEST_HARDWARE" | "REQUEST_RESET" }): Promise<void>;
    disconnect(): Promise<void>;
  }

  export function connectSmartCube(options?: {
    macAddressProvider?: (device: unknown, isFallbackCall?: boolean) => Promise<string | null>;
    enableAddressSearch?: boolean;
    onStatus?: (message: string) => void;
    signal?: AbortSignal;
  }): Promise<SmartCubeConnection>;
}
