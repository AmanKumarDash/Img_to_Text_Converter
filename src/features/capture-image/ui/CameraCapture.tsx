import React, { useRef, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

interface CameraCaptureProps {
  onImageCaptured: (imageUri: string) => void;
  title?: string;
  subtitle?: string;
  thumbnailUri?: string | null;
  onCancel?: () => void;
  cancelButtonText?: string;
}

export default function CameraCapture({
  onImageCaptured,
  title = 'Image Scanner',
  subtitle,
  thumbnailUri,
  onCancel,
  cancelButtonText = 'Cancel',
}: CameraCaptureProps) {
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [cameraReady, setCameraReady] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Check camera permission
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.description}>
          Checking camera permission...
        </Text>
      </View>
    );
  }

  // Request camera permission
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>
          Camera Permission
        </Text>

        <Text style={styles.description}>
          We need camera permission to capture images.
        </Text>

        <Pressable
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>
            Allow Camera Access
          </Text>
        </Pressable>
      </View>
    );
  }

  // Capture photo
  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady || loading) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });

      if (photo?.uri) {
        setPhotoUri(photo.uri);
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      setError('Unable to capture image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setPhotoUri(null);
    setCameraReady(false);
    setError(null);
    setImageError(false);
    setImageLoading(false);
  };

  // Use captured photo
  const handleUsePhoto = () => {
    if (!photoUri) {
      return;
    }

    onImageCaptured(photoUri);
  };

  // Captured image preview
  if (photoUri) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          Captured Image
        </Text>

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
              source={{ uri: photoUri }}
              style={styles.preview}
              resizeMode="contain"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}
        </View>

        <View style={styles.actionContainer}>
          <Pressable
            style={styles.retakeButton}
            onPress={handleRetake}
          >
            <Text style={styles.buttonText}>
              Retake Photo
            </Text>
          </Pressable>

          <Pressable
            style={styles.usePhotoButton}
            onPress={handleUsePhoto}
          >
            <Text style={styles.buttonText}>
              Use Photo
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Live camera preview
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        {onCancel && (
          <Pressable style={styles.cancelHeaderBtn} onPress={onCancel}>
            <Text style={styles.cancelHeaderBtnText}>← {cancelButtonText}</Text>
          </Pressable>
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />

        {thumbnailUri && (
          <View style={styles.thumbnailOverlay}>
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImage} />
            <Text style={styles.thumbnailText}>Front ✓</Text>
          </View>
        )}
      </View>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      <Pressable
        style={[
          styles.captureButton,
          (!cameraReady || loading) && styles.disabledButton,
        ]}
        onPress={handleCapture}
        disabled={!cameraReady || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Capture Photo
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 16,
  },
  headerContainer: {
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  cancelHeaderBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  cancelHeaderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 8,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  thumbnailImage: {
    width: 60,
    height: 40,
    borderRadius: 4,
  },
  thumbnailText: {
    color: '#22C55E',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F7FB',
    gap: 16,
  },

  title: {
    fontSize: 23,
    fontWeight: '700',
    color: '#172033',
    textAlign: 'center',
    marginBottom: 16,
  },

  description: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },

  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#000000',
  },

  camera: {
    flex: 1,
  },

  previewContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#0F172A',
  },

  preview: {
    flex: 1,
    width: '100%',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
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

  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },

  captureButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },

  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  retakeButton: {
    flex: 1,
    backgroundColor: '#64748B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  usePhotoButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  error: {
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 12,
  },
});