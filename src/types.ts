import type {EmitterSubscription} from 'react-native';

export type PolarDeviceInfo = {
  deviceId: string;
  address: string;
  rssi: number;
  name: string;
  isConnectable: boolean;
};

export type HeartRate = {
  hr: number;
  rrs: number[];
  rrsMs: number[];
  rrAvailable: number[];
};

export type PolarDevice = PolarDeviceInfo & {
  state: 'connecting' | 'connected' | 'disconnected';
  batteryLevel?: number;
  hrFeatureReady?: boolean;
  ftpFeatureReady?: boolean;
  streamingFeatures?: number[];
  heartRate?: HeartRate;
  dis?: {
    uuid: string;
    value: string;
  };
};

export type AddPolarEventListener = {
  (
    eventType: 'deviceFound',
    listener: (deviceInfo: PolarDeviceInfo) => any,
  ): EmitterSubscription;
  (
    eventType: 'deviceConnecting',
    listener: (deviceInfo: PolarDeviceInfo) => any,
  ): EmitterSubscription;
  (
    eventType: 'deviceConnected',
    listener: (deviceInfo: PolarDeviceInfo) => any,
  ): EmitterSubscription;
  (
    eventType: 'deviceDisconnected',
    listener: (deviceInfo: PolarDeviceInfo) => any,
  ): EmitterSubscription;
  (
    eventType: 'batteryLevelReceived',
    listener: (data: {identifier: string; batteryLevel: number}) => any,
  ): EmitterSubscription;
  (
    eventType: 'disInformationReceived',
    listener: (data: {identifier: string; uuid: string; value: string}) => any,
  ): EmitterSubscription;
  (eventType: 'blePowerOn', listener: () => any): EmitterSubscription;
  (eventType: 'blePowerOff', listener: () => any): EmitterSubscription;
  (
    eventType: 'hrFeatureReady',
    listener: (identifier: string) => any,
  ): EmitterSubscription;
  (
    eventType: 'ftpFeatureReady',
    listener: (identifier: string) => any,
  ): EmitterSubscription;
  (
    eventType: 'streamingFeaturesReady',
    listener: (data: {identifier: string; features: number[]}) => any,
  ): EmitterSubscription;
  (
    eventType: 'hrValueReceived',
    listener: (data: {identifier: string; data: HeartRate}) => any,
  ): EmitterSubscription;
};
