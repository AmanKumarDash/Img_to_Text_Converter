import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import CameraCapture from '../../../features/capture-image/ui/CameraCapture';
import { OCRStatus, OfflineOCRResult } from '../../../features/ocr/model/types';
import { OCRService } from '../../../features/ocr/services/ocrService';
import OCRResultView from '../../../features/ocr/ui/OCRResultView';
import { EditableTableData } from '../../../features/table-editor/model/types';
import TableEditor from '../../../features/table-editor/ui/TableEditor';
import { ExcelService } from '../../../features/export-excel/services/excelService';
import { GeneratedWorkbookResult } from '../../../features/export-excel/model/types';
import WorkbookStatusModal from '../../../features/export-excel/ui/WorkbookStatusModal';

import {
  DocumentDetectionResult,
  DocumentDetectionService,
  ReviewDocumentModal,
} from '../../../features/document-detection';
import {
  CollectionScreen,
  NewDocumentRecordInput,
  useDocumentCollection,
} from '../../../features/document-collection';

export default function ScannerPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // On-Device OCR States
  const [ocrStatus, setOcrStatus] = useState<OCRStatus>('idle');
  const [ocrResult, setOcrResult] = useState<OfflineOCRResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Document Detection & Review States
  const [detectionResult, setDetectionResult] =
    useState<DocumentDetectionResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCollectionScreen, setShowCollectionScreen] = useState(false);

  // Multi-Scan Document Collection Hook
  const {
    records,
    addRecord,
    updateRecord,
    deleteRecord,
    clearCollection,
  } = useDocumentCollection();

  // Table Editor State (Single Table Mode)
  const [editingTableData, setEditingTableData] =
    useState<EditableTableData | null>(null);

  // Excel Workbook State
  const [workbookResult, setWorkbookResult] =
    useState<GeneratedWorkbookResult | null>(null);
  const [workbookError, setWorkbookError] = useState<string | null>(null);
  const [showWorkbookModal, setShowWorkbookModal] = useState(false);

  // Generate Excel Workbook from Single Table Data
  const handleExportSingleTable = (tableData: EditableTableData) => {
    try {
      setWorkbookError(null);
      const result = ExcelService.generateWorkbook(tableData);
      setWorkbookResult(result);
      setShowWorkbookModal(true);
    } catch (err: any) {
      console.error('Workbook generation error:', err);
      setWorkbookError(err?.message || 'Failed to generate Excel workbook.');
      setShowWorkbookModal(true);
    }
  };

  // Generate Excel Workbook from Complete Document Collection
  const handleExportCollection = () => {
    try {
      setWorkbookError(null);
      if (records.length === 0) {
        Alert.alert('Empty Collection', 'No documents in collection to export.');
        return;
      }
      const result = ExcelService.generateCollectionWorkbook(records);
      setWorkbookResult(result);
      setShowWorkbookModal(true);
    } catch (err: any) {
      console.error('Collection export error:', err);
      setWorkbookError(err?.message || 'Failed to export document collection.');
      setShowWorkbookModal(true);
    }
  };

  // Trigger On-Device OCR extraction & Document Type Detection
  const handleExtract = async () => {
    if (!selectedImage) return;

    try {
      setOcrStatus('processing');
      setOcrError(null);
      const result = await OCRService.recognizeText(selectedImage);
      setOcrResult(result);
      setOcrStatus('success');

      // Run automatic document classification
      const detected = DocumentDetectionService.detectDocumentType(result.rawText);
      setDetectionResult(detected);
      setShowReviewModal(true);
    } catch (err: any) {
      console.error('Offline OCR processing error:', err);
      setOcrStatus('error');
      setOcrError(err?.message || 'Failed to recognize text on device.');
    }
  };

  // Handle adding reviewed record to the multi-scan collection
  const handleSaveToCollection = async (input: NewDocumentRecordInput) => {
    try {
      setShowReviewModal(false);
      await addRecord(input);
      const newTotal = records.length + 1;

      Alert.alert(
        '✓ Added to Collection',
        `Record #${newTotal} (${input.documentTypeLabel}) was added to your collection. Total records: ${newTotal}.`,
        [
          {
            text: '📷 Scan Next Document',
            onPress: () => handleReset(),
          },
          {
            text: '📋 View Collection',
            onPress: () => {
              handleReset();
              setShowCollectionScreen(true);
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Save Error', err?.message || 'Failed to save record to collection.');
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
    setEditingTableData(null);
    setDetectionResult(null);
    setShowReviewModal(false);
  };

  // 1. If Collection Screen is opened, show full multi-scan management view
  if (showCollectionScreen) {
    return (
      <>
        <CollectionScreen
          records={records}
          onScanNext={() => {
            setShowCollectionScreen(false);
            handleReset();
          }}
          onExportExcel={handleExportCollection}
          onUpdateRecord={(id, updates) => updateRecord(id, updates)}
          onDeleteRecord={(id) => deleteRecord(id)}
          onClearCollection={clearCollection}
          onBack={() => setShowCollectionScreen(false)}
        />
        <WorkbookStatusModal
          visible={showWorkbookModal}
          result={workbookResult}
          error={workbookError}
          onClose={() => setShowWorkbookModal(false)}
        />
      </>
    );
  }

  // 2. If the user tapped "Edit Table" (Single Table Mode), show spreadsheet editor
  if (editingTableData) {
    return (
      <>
        <TableEditor
          initialData={editingTableData}
          onBack={() => setEditingTableData(null)}
          onContinueExport={(savedTable) => {
            setEditingTableData(savedTable);
            handleExportSingleTable(savedTable);
          }}
        />
        <WorkbookStatusModal
          visible={showWorkbookModal}
          result={workbookResult}
          error={workbookError}
          onClose={() => setShowWorkbookModal(false)}
        />
      </>
    );
  }

  // 3. If OCR completed successfully, display on-device OCR result review screen
  if (selectedImage && ocrStatus === 'success' && ocrResult) {
    return (
      <SafeAreaView style={styles.container}>
        <OCRResultView
          imageUri={selectedImage}
          result={ocrResult}
          onRetake={handleReset}
          onReExtract={handleExtract}
          onEditTable={(tableData) => setEditingTableData(tableData)}
        />

        {/* Floating Identity Review Trigger */}
        <View style={styles.reviewBar}>
          <Pressable
            style={styles.reviewBarBtn}
            onPress={() => setShowReviewModal(true)}
          >
            <Text style={styles.reviewBarBtnText}>
              🪪 Review Identity Fields ({detectionResult?.label || 'Document'})
            </Text>
          </Pressable>
        </View>

        {/* Identity Document Review & Extraction Modal */}
        <ReviewDocumentModal
          visible={showReviewModal}
          imageUri={selectedImage}
          detectionResult={detectionResult}
          nextIndex={records.length + 1}
          onSaveToCollection={handleSaveToCollection}
          onDiscard={() => setShowReviewModal(false)}
        />

        <WorkbookStatusModal
          visible={showWorkbookModal}
          result={workbookResult}
          error={workbookError}
          onClose={() => setShowWorkbookModal(false)}
        />
      </SafeAreaView>
    );
  }

  // 4. If an image was selected/captured, display preview with extraction action
  if (selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {ocrStatus === 'processing' ? 'Processing On Device...' : 'Document Captured'}
          </Text>
          <Text style={styles.subtitle}>
            {ocrStatus === 'processing'
              ? 'Analyzing text locally with Google ML Kit'
              : 'Review your image and run offline text recognition'}
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
              <Text style={styles.processingText}>Recognizing Text On Device...</Text>
              <Text style={styles.processingSubText}>
                ⚡ 100% Offline • Hardware Accelerated • Private
              </Text>
            </View>
          )}
        </View>

        {ocrError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Recognition Notice</Text>
            <Text style={styles.errorBannerText}>{ocrError}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {ocrStatus === 'processing' ? (
            <Text style={styles.waitText}>Processing document locally...</Text>
          ) : (
            <>
              <Pressable
                style={styles.primaryButton}
                onPress={handleExtract}
              >
                <Text style={styles.primaryButtonText}>
                  ⚡ Extract Text with On-Device OCR
                </Text>
              </Pressable>

              <Pressable style={styles.retakeButton} onPress={handleReset}>
                <Text style={styles.retakeButtonText}>Capture Another Photo</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // 5. Live camera screen with top Collection counter button
  return (
    <SafeAreaView style={styles.container}>
      {/* Top Floating Collection Bar */}
      <View style={styles.topCameraBar}>
        <Pressable
          style={styles.collectionBadgeBtn}
          onPress={() => setShowCollectionScreen(true)}
        >
          <Text style={styles.collectionBadgeText}>
            📁 View Collection ({records.length})
          </Text>
        </Pressable>
      </View>

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
  topCameraBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  collectionBadgeBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  collectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    gap: 12,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
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
  reviewBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  reviewBarBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  reviewBarBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
