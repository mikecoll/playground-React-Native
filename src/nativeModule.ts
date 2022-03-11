import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import type {AddPolarEventListener} from './types';

const LINKING_ERROR =
  `The package 'react-native-polar-ble' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ios: "- You have run 'pod install'\n", default: ''}) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

export const PolarBle = NativeModules.PolarBle
  ? NativeModules.PolarBle
  : new Proxy(
      {},
      {
        get() {
          if (process.env.NODE_ENV !== 'test') {
            throw new Error(LINKING_ERROR);
          }
        },
      },
    );

const baseNativeEventEmitter = new NativeEventEmitter(PolarBle);

export const PolarBleEventEmitter = Object.assign<
  typeof baseNativeEventEmitter,
  {addEventListener: AddPolarEventListener}
>(baseNativeEventEmitter, {
  addEventListener: (eventType, listener) => {
    // map to exported constant
    // i.e. deviceFound to DEVICE_FOUND
    const eventTypeConstant = eventType
      .split('')
      .map(x => (x === x.toUpperCase() ? `_${x}` : x))
      .map(x => x.toUpperCase())
      .join('');

    return baseNativeEventEmitter.addListener(
      PolarBle.getConstants()[eventTypeConstant],
      listener,
    );
  },
});

export const configure = (features: number) =>
  PolarBle.configure(features) as Promise<void>;

export const connectToDevice = (id: string) =>
  PolarBle.connectToDevice(id) as Promise<void>;

export const disconnectFromDevice = (id: string) =>
  PolarBle.disconnectFromDevice(id) as Promise<void>;

export const searchForDevice = () =>
  PolarBle.searchForDevice() as Promise<void>;

export const startAutoConnectToDevice = (
  rssi: number,
  service?: string,
  polarDeviceType?: string,
) => PolarBle.startAutoConnectToDevice(rssi, service, polarDeviceType);
