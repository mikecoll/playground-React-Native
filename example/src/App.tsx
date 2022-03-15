import * as React from 'react';
import {useEffect} from 'react';

import {StyleSheet, View, Text, Button} from 'react-native';
import {Features, usePolarBle} from 'react-native-polar-ble';

export default function App() {
  const {
    devices,
    configure,
    searchForDevice,
    connectToDevice,
    disconnectFromDevice,
  } = usePolarBle();

  useEffect(() => {
    configure(Features.ALL_FEATURES);
  }, [configure]);

  return (
    <View style={styles.container}>
      <Button title="Search for device" onPress={searchForDevice} />
      {devices.map(x => (
        <View>
          {x.state === 'connected' ? (
            <Button
              title="Disconnect"
              onPress={() => disconnectFromDevice(x.deviceId)}
            />
          ) : (
            <Button
              title="Connect"
              onPress={() => connectToDevice(x.deviceId)}
              disabled={x.state === 'connecting'}
            />
          )}
          <Text>{JSON.stringify(x, undefined, '\t')}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
