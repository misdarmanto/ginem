import { IRoot } from "./Root";
import type { DeviceLiveStatus } from "@/features/devices/liveStatus";

export interface IDevice extends IRoot {
  deviceId: number;
  deviceToken: string;
  deviceName: string;
  deviceDescription?: string;
  deviceType: "sensor" | "actuator";
  deviceStatus: "online" | "offline";
  liveStatus?: DeviceLiveStatus;
  deviceFirmwareVersion?: string;
  deviceMetadata?: object;
  deviceValues?: IDeviceValue[];
}

export interface IDeviceValue extends IRoot {
  deviceValueId: number;
  deviceValueDeviceId: number;
  deviceValueValue: string;
}
