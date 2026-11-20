import React, { useState } from 'react';

import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import CameraCapture from '../../../features/capture-image/ui/CameraCapture';

export default function ScannerPage() {
  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  // Image selected successfully
  if (selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Image Selected Successfully
          </Text>

          <Text style={styles.subtitle}>
            Your captured image is ready.
          </Text>
        </View>

        <Image
          source={{ uri: selectedImage }}
          style={styles.preview}
          resizeMode="contain"
        />

        <View style={styles.footer}>
          <Text style={styles.successText}>
            Photo captured successfully!
          </Text>

          <Pressable
            style={styles.retakeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.buttonText}>
              Capture Another Photo
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Camera screen
  return (
    <SafeAreaView style={styles.container}>
      <CameraCapture
        onImageCaptured={(imageUri) => {
          setSelectedImage(imageUri);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  header: {
    padding: 20,
    alignItems: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#172033',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },

  preview: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
  },

  footer: {
    padding: 20,
    alignItems: 'center',
  },

  successText: {
    fontSize: 16,
    color: '#16A34A',
    fontWeight: '600',
    marginBottom: 15,
  },

  retakeButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});