import React, { useState } from 'react';

import {
  ActivityIndicator,
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
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

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

        <View style={styles.previewContainer}>
          {imageLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          )}

          {imageError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Failed to load image preview.
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: selectedImage }}
              style={styles.preview}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.successText}>
            Photo captured successfully!
          </Text>

          <Pressable
            style={styles.retakeButton}
            onPress={() => {
              setSelectedImage(null);
              setImageError(false);
              setImageLoading(false);
            }}
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

  previewContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },

  preview: {
    flex: 1,
    width: '100%',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 247, 251, 0.8)',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 15,
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