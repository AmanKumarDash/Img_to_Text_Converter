
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import CameraCapture from '../../../features/capture-image/ui/CameraCapture';

export default function ScannerPage() {
  return (
    <SafeAreaView style={styles.container}>
      <CameraCapture />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
});
