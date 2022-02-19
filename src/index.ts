import { useEffect, useState } from 'react';
import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';

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

type AddPolarEventListener = {
  (
    eventType: 'deviceFound',
    listener: (deviceInfo: PolarDeviceInfo) => any
  ): EmitterSubscription;
  (
    eventType: 'deviceConnecting',
    listener: (deviceInfo: PolarDeviceInfo) => any
  ): EmitterSubscription;
  (
    eventType: 'deviceConnected',
    listener: (deviceInfo: PolarDeviceInfo) => any
  ): EmitterSubscription;
  (
    eventType: 'deviceDisconnected',
    listener: (deviceInfo: PolarDeviceInfo) => any
  ): EmitterSubscription;
  (
    eventType: 'batteryLevelReceived',
    listener: (data: { identifier: string; batteryLevel: number }) => any
  ): EmitterSubscription;
  (
    eventType: 'disInformationReceived',
    listener: (data: { identifier: string; uuid: string; value: string }) => any
  ): EmitterSubscription;
  (eventType: 'blePowerOn', listener: () => any): EmitterSubscription;
  (eventType: 'blePowerOff', listener: () => any): EmitterSubscription;
  (
    eventType: 'hrFeatureReady',
    listener: (identifier: string) => any
  ): EmitterSubscription;
  (
    eventType: 'ftpFeatureReady',
    listener: (identifier: string) => any
  ): EmitterSubscription;
  (
    eventType: 'streamingFeaturesReady',
    listener: (data: { identifier: string; features: number[] }) => any
  ): EmitterSubscription;
  (
    eventType: 'hrValueReceived',
    listener: (data: { identifier: string; data: HeartRate }) => any
  ): EmitterSubscription;
};

const LINKING_ERROR =
  `The package 'react-native-polar-ble' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const PolarBle = NativeModules.PolarBle
  ? NativeModules.PolarBle
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export const {
  DEVICE_FOUND,
  DEVICE_CONNECTING,
  DEVICE_CONNECTED,
  DEVICE_DISCONNECTED,
  BATTERY_LEVEL_RECEIVED,
  DIS_INFORMATION_RECEIVED,
  BLE_POWER_ON,
  BLE_POWER_OFF,
  HR_FEATURE_READY,
  FTP_FEATURE_READY,
  STREAMING_FEATURES_READY,
  HR_VALUE_RECEIVED,
} = PolarBle.getConstants();

const baseNativeEventEmitter = new NativeEventEmitter(PolarBle);

export const PolarBleEventEmitter = Object.assign<
  typeof baseNativeEventEmitter,
  { addEventListener: AddPolarEventListener }
>(baseNativeEventEmitter, {
  addEventListener: (eventType, listener) => {
    // map to exported constant
    // i.e. deviceFound to DEVICE_FOUND
    const eventTypeConstant = eventType
      .split('')
      .map((x) => (x === x.toUpperCase() ? `_${x}` : x))
      .map((x) => x.toUpperCase())
      .join('');

    return baseNativeEventEmitter.addListener(
      PolarBle.getConstants()[eventTypeConstant],
      listener
    );
  },
});

const configure = (features: number) => PolarBle.configure(features);

const connectToDevice = (id: string) =>
  PolarBle.connectToDevice(id) as Promise<void>;

const disconnectFromDevice = (id: string) =>
  PolarBle.disconnectFromDevice(id) as Promise<void>;

const searchForDevice = () => PolarBle.searchForDevice() as Promise<void>;

export const startAutoConnectToDevice = (
  rssi: number,
  service?: string,
  polarDeviceType?: string
) => PolarBle.startAutoConnectToDevice(rssi, service, polarDeviceType);

export const usePolarBle = () => {
  const [deviceMap, setDeviceMap] = useState<Record<string, PolarDevice>>({});
  const [blePoweredOn, setBlePoweredOn] = useState<boolean | undefined>();

  const devices = Object.values(deviceMap);

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('deviceFound', (deviceInfo) =>
        setDeviceMap((x) => ({
          ...x,
          [deviceInfo.deviceId]: {
            ...x[deviceInfo.deviceId],
            ...deviceInfo,
            state: 'disconnected',
          },
        }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('deviceConnecting', (deviceInfo) =>
        setDeviceMap((x) => ({
          ...x,
          [deviceInfo.deviceId]: {
            ...x[deviceInfo.deviceId],
            ...deviceInfo,
            state: 'connecting',
          },
        }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('deviceConnected', (deviceInfo) =>
        setDeviceMap((x) => ({
          ...x,
          [deviceInfo.deviceId]: {
            ...x[deviceInfo.deviceId],
            ...deviceInfo,
            state: 'connected',
          },
        }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener(
        'deviceDisconnected',
        (deviceInfo) =>
          setDeviceMap((x) => ({
            ...x,
            [deviceInfo.deviceId]: { ...deviceInfo, state: 'disconnected' },
          }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('batteryLevelReceived', (data) =>
        setDeviceMap((x) => ({
          ...x,
          [data.identifier]: {
            ...x[data.identifier],
            batteryLevel: data.batteryLevel,
          },
        }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('disInformationReceived', (data) =>
        setDeviceMap((x) => ({
          ...x,
          [data.identifier]: {
            ...x[data.identifier],
            dis: { uuid: data.uuid, value: data.value },
          },
        }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('blePowerOn', () =>
        setBlePoweredOn(true)
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('blePowerOff', () =>
        setBlePoweredOn(false)
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('hrFeatureReady', (identifier) =>
        setDeviceMap((x) => ({
          ...x,
          [identifier]: {
            ...x[identifier],
            hrFeatureReady: true,
          },
        }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('ftpFeatureReady', (identifier) =>
        setDeviceMap((x) => ({
          ...x,
          [identifier]: {
            ...x[identifier],
            ftpFeatureReady: true,
          },
        }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('streamingFeaturesReady', (data) =>
        setDeviceMap((x) => ({
          ...x,
          [data.identifier]: {
            ...x[data.identifier],
            streamingFeatures: data.features,
          },
        }))
      ).remove,
    []
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('hrValueReceived', (data) =>
        setDeviceMap((x) => ({
          ...x,
          [data.identifier]: {
            ...x[data.identifier],
            heartRate: data.data,
          },
        }))
      ).remove,
    []
  );

  return {
    devices,
    blePoweredOn,
    configure,
    connectToDevice,
    disconnectFromDevice,
    searchForDevice,
    startAutoConnectToDevice,
  };
};
