import { connectSmartCube } from "smartcube-web-bluetooth";
import { savedAddress } from "./address";
import type { Driver, DriverEvents } from "./connection";

/** Connects through the smartcube-web-bluetooth library, which handles QiYi, GAN, GoCube, Giiker and MoYu cubes. */
export async function connectBluetooth(events: DriverEvents, onStatus: (message: string) => void): Promise<Driver> {
  const conn = await connectSmartCube({
    enableAddressSearch: true,
    onStatus,
    macAddressProvider: async () => savedAddress(),
  });
  const sub = conn.events$.subscribe((e) => {
    if (e.type === "MOVE") events.move(e.move);
    else if (e.type === "FACELETS") events.facelets(e.facelets);
    else if (e.type === "BATTERY") events.battery(e.batteryLevel);
    else if (e.type === "DISCONNECT") {
      sub.unsubscribe();
      events.disconnected();
    }
  });
  if (conn.capabilities.facelets) void conn.sendCommand({ type: "REQUEST_FACELETS" }).catch(() => {});
  if (conn.capabilities.battery) void conn.sendCommand({ type: "REQUEST_BATTERY" }).catch(() => {});
  return {
    name: conn.deviceName || conn.protocol.name,
    canReset: conn.capabilities.reset,
    reset: () => conn.sendCommand({ type: "REQUEST_RESET" }),
    disconnect: async () => {
      sub.unsubscribe();
      await conn.disconnect();
    },
  };
}
