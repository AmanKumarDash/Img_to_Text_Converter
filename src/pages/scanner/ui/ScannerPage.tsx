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
import { OCRResult, OCRStatus } from '../../../features/ocr/model/types';
import { OCRService } from '../../../features/ocr/services/ocrService';
import OCRResultView from '../../../features/ocr/ui/OCRResultView';

export default function ScannerPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // OCR States
  const [ocrStatus, setOcrStatus] = useState<OCRStatus>('idle');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Handle OCR extraction
  const handleExtract = async (forceTest = false) => {
    if (!selectedImage) return;

    try {
      setOcrStatus('processing');
      setOcrError(null);
      const result = await OCRService.recognizeText(selectedImage, forceTest);
      setOcrResult(result);
      setOcrStatus('success');
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setOcrStatus('error');
      setOcrError(err?.message || 'Failed to extract text from image.');
    }
  };

  // Reset all states back to camera capture
  const handleReset = () => {
    setSelectedImage(null);
    setImageError(false);
    setImageLoading(false);
    setOcrStatus('idle');
    setOcrResult(null);
    setOcrError(null);
  };

  // If OCR completed successfully, display OCR result review screen
  if (selectedImage && ocrStatus === 'success' && ocrResult) {
    return (
      <SafeAreaView style={styles.container}>
        <OCRResultView
          imageUri={selectedImage}
          result={ocrResult}
          onRetake={handleReset}
          onReExtract={() => handleExtract(false)}
        />
      </SafeAreaView>
    );
  }

  // If an image was selected/captured, display preview with extraction actions
  if (selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {ocrStatus === 'processing' ? 'Extracting Text & Table...' : 'Document Captured'}
          </Text>
          <Text style={styles.subtitle}>
            {ocrStatus === 'processing'
              ? 'AI is analyzing lines, text, and tabular structure'
              : 'Review your image and run OCR extraction'}
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
              resizeMode="contain"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}

          {ocrStatus === 'processing' && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.processingText}>Processing with OCR...</Text>
              <Text style={styles.processingSubText}>
                {OCRService.hasApiKey()
                  ? 'Connecting to Gemini Vision API'
                  : 'Analyzing with local test parser'}
              </Text>
            </View>
          )}
        </View>

        {ocrError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Extraction Notice</Text>
            <Text style={styles.errorBannerText}>{ocrError}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {ocrStatus === 'processing' ? (
            <Text style={styles.waitText}>Please wait a moment...</Text>
          ) : (
            <>
              <Pressable
                style={styles.primaryButton}
                onPress={() => handleExtract(false)}
              >
                <Text style={styles.primaryButtonText}>
                  {OCRService.hasApiKey() ? '✨ Extract with Gemini AI' : '🚀 Extract Text & Table'}
                </Text>
              </Pressable>

              {!OCRService.hasApiKey() && (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => handleExtract(true)}
                >
                  <Text style={styles.secondaryButtonText}>
                    🧪 Run Instant Demo Mock
                  </Text>
                </Pressable>
              )}

              <Pressable style={styles.retakeButton} onPress={handleReset}>
                <Text style={styles.retakeButtonText}>Capture Another Photo</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Live camera screen
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
    marginTop: 4,
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  preview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 247, 251, 0.8)',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    gap: 12,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  processingSubText: {
    color: '#94A3B8',
    fontSize: 13,
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
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
  },
  errorBannerTitle: {
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4338CA',
    fontSize: 15,
    fontWeight: '600',
  },
  retakeButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  waitText: {
    textAlign: 'center',
    color: '#64748B',
    paddingVertical: 16,
    fontSize: 14,
  },
});
