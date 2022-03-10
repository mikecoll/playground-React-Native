import {useEffect, useState} from 'react';
import {
  configure,
  connectToDevice,
  disconnectFromDevice,
  PolarBleEventEmitter,
  searchForDevice,
  startAutoConnectToDevice,
} from './nativeModule';
import type {PolarDevice} from './types';

export const usePolarBle = () => {
  const [deviceMap, setDeviceMap] = useState<Record<string, PolarDevice>>({});
  const [blePoweredOn, setBlePoweredOn] = useState<boolean | undefined>();

  const devices = Object.values(deviceMap);

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('deviceFound', deviceInfo =>
        setDeviceMap(x => ({
          ...x,
          [deviceInfo.deviceId]: {
            ...x[deviceInfo.deviceId],
            ...deviceInfo,
            state: 'disconnected',
          },
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('deviceConnecting', deviceInfo =>
        setDeviceMap(x => ({
          ...x,
          [deviceInfo.deviceId]: {
            ...x[deviceInfo.deviceId],
            ...deviceInfo,
            state: 'connecting',
          },
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('deviceConnected', deviceInfo =>
        setDeviceMap(x => ({
          ...x,
          [deviceInfo.deviceId]: {
            ...x[deviceInfo.deviceId],
            ...deviceInfo,
            state: 'connected',
          },
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('deviceDisconnected', deviceInfo =>
        setDeviceMap(x => ({
          ...x,
          [deviceInfo.deviceId]: {...deviceInfo, state: 'disconnected'},
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('batteryLevelReceived', data =>
        setDeviceMap(x => ({
          ...x,
          [data.identifier]: {
            ...x[data.identifier],
            batteryLevel: data.batteryLevel,
          },
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('disInformationReceived', data =>
        setDeviceMap(x => ({
          ...x,
          [data.identifier]: {
            ...x[data.identifier],
            dis: {uuid: data.uuid, value: data.value},
          },
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('blePowerOn', () =>
        setBlePoweredOn(true),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('blePowerOff', () =>
        setBlePoweredOn(false),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('hrFeatureReady', identifier =>
        setDeviceMap(x => ({
          ...x,
          [identifier]: {
            ...x[identifier],
            hrFeatureReady: true,
          },
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('ftpFeatureReady', identifier =>
        setDeviceMap(x => ({
          ...x,
          [identifier]: {
            ...x[identifier],
            ftpFeatureReady: true,
          },
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('streamingFeaturesReady', data =>
        setDeviceMap(x => ({
          ...x,
          [data.identifier]: {
            ...x[data.identifier],
            streamingFeatures: data.features,
          },
        })),
      ).remove,
    [],
  );

  useEffect(
    () =>
      PolarBleEventEmitter.addEventListener('hrValueReceived', data =>
        setDeviceMap(x => ({
          ...x,
          [data.identifier]: {
            ...x[data.identifier],
            heartRate: data.data,
          },
        })),
      ).remove,
    [],
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
