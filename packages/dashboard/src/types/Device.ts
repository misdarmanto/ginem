import { IRoot } from "./Root";

export interface IDevice extends IRoot {
  deviceId: number;
  deviceToken: string;
  deviceName: string;
  deviceDescription?: string;
  deviceType: "sensor" | "actuator";
  deviceStatus: "online" | "offline";
  deviceFirmwareVersion?: string;
  deviceMetadata?: object;
  deviceValues?: IDeviceValue[];
}

export interface IDeviceValue extends IRoot {
  deviceValueId: number;
  deviceValueDeviceId: number;
  deviceValueValue: string;
}
