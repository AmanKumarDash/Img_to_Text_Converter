import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
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
  DocumentFieldExtractor,
  ExtractedDocumentFields,
  ReviewDocumentModal,
} from '../../../features/document-detection';
import {
  CollectionScreen,
  NewDocumentRecordInput,
  useDocumentCollection,
} from '../../../features/document-collection';

export default function ScannerPage() {
  // Captured Images: Front and Back sides
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isCapturingBack, setIsCapturingBack] = useState(false);

  // Image loading / error states
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // On-Device OCR States
  const [ocrStatus, setOcrStatus] = useState<OCRStatus>('idle');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrProgressMessage, setOcrProgressMessage] = useState<string>('');
  const [singleTableResult, setSingleTableResult] =
    useState<OfflineOCRResult | null>(null);

  // Document Detection & Review States
  const [detectionResult, setDetectionResult] =
    useState<DocumentDetectionResult | null>(null);
  const [extractedFields, setExtractedFields] =
    useState<ExtractedDocumentFields | null>(null);
  const [frontRawText, setFrontRawText] = useState<string>('');
  const [backRawText, setBackRawText] = useState<string>('');
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

  // Process and Extract text from one or both sides
  const handleProcessImages = async (
    frontUri: string,
    backUri?: string | null
  ) => {
    try {
      setOcrStatus('processing');
      setOcrError(null);

      // 1. Process Front Side
      setOcrProgressMessage(
        backUri ? 'Recognizing text on Front side...' : 'Recognizing text on device...'
      );
      const frontRes = await OCRService.recognizeText(frontUri);
      setSingleTableResult(frontRes);
      setFrontRawText(frontRes.rawText);

      let backRes: OfflineOCRResult | null = null;
      let backText = '';

      // 2. Process Back Side (if captured)
      if (backUri) {
        setOcrProgressMessage('Recognizing text on Back side...');
        try {
          backRes = await OCRService.recognizeText(backUri);
          backText = backRes.rawText;
          setBackRawText(backText);
        } catch (backErr: any) {
          console.warn('Back side OCR warning (proceeding with front):', backErr);
          // If back OCR fails, preserve front results gracefully
          Alert.alert(
            'Back Side OCR Notice',
            'Back side text recognition had difficulty reading text. Continuing with front side information.'
          );
        }
      }

      // 3. Combine OCR texts for document detection
      const combinedRaw = backText
        ? `${frontRes.rawText}\n--- BACK SIDE ---\n${backText}`
        : frontRes.rawText;

      // 4. Run automatic document classification
      const detected = DocumentDetectionService.detectDocumentType(combinedRaw);
      setDetectionResult(detected);

      // 5. Extract fields using dual-side extraction logic
      const mergedFields = DocumentFieldExtractor.extractDualSideFields(
        detected.documentType,
        frontRes.rawText,
        backText
      );
      setExtractedFields(mergedFields);

      setOcrStatus('success');
      setShowReviewModal(true);
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setOcrStatus('error');
      setOcrError(err?.message || 'Failed to recognize text on device.');
    } finally {
      setOcrProgressMessage('');
    }
  };

  // Handle adding reviewed record to the multi-scan collection
  const handleSaveToCollection = async (input: NewDocumentRecordInput) => {
    try {
      setShowReviewModal(false);
      await addRecord(input);
      const newTotal = records.length + 1;
      const sideLabel = input.backImageUri ? 'Front & Back' : 'Front Only';

      Alert.alert(
        '✓ Added to Collection',
        `Record #${newTotal} (${input.documentTypeLabel} • ${sideLabel}) added successfully. Total records in collection: ${newTotal}.`,
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

  // Reset all scanning states back to initial front camera capture
  const handleReset = () => {
    setFrontImage(null);
    setBackImage(null);
    setIsCapturingBack(false);
    setImageError(false);
    setImageLoading(false);
    setOcrStatus('idle');
    setSingleTableResult(null);
    setOcrError(null);
    setOcrProgressMessage('');
    setEditingTableData(null);
    setDetectionResult(null);
    setExtractedFields(null);
    setFrontRawText('');
    setBackRawText('');
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

  // 3. If OCR completed successfully and Review modal is closed, show raw OCR review
  if (frontImage && ocrStatus === 'success' && singleTableResult) {
    return (
      <SafeAreaView style={styles.container}>
        <OCRResultView
          imageUri={frontImage}
          result={singleTableResult}
          onRetake={handleReset}
          onReExtract={() => handleProcessImages(frontImage, backImage)}
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
          frontImageUri={frontImage}
          backImageUri={backImage}
          detectionResult={detectionResult}
          initialFields={extractedFields}
          frontRawText={frontRawText}
          backRawText={backRawText}
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

  // 4. If currently scanning the Back side, show camera with front thumbnail in corner
  if (isCapturingBack && frontImage) {
    return (
      <SafeAreaView style={styles.container}>
        <CameraCapture
          title="Capture Back Side"
          subtitle="Step 2 of 2: Flip document and capture the BACK side"
          thumbnailUri={frontImage}
          onCancel={() => setIsCapturingBack(false)}
          cancelButtonText="Cancel Back Scan"
          onImageCaptured={(backUri) => {
            setBackImage(backUri);
            setIsCapturingBack(false);
          }}
        />
      </SafeAreaView>
    );
  }

  // 5. If BOTH Front and Back sides are captured, display Dual-Side Preview & Process Screen
  if (frontImage && backImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {ocrStatus === 'processing' ? 'Processing Both Sides...' : 'Both Sides Captured'}
          </Text>
          <Text style={styles.subtitle}>
            {ocrStatus === 'processing'
              ? ocrProgressMessage || 'Analyzing text on device with Google ML Kit'
              : 'Step 2 of 2 Complete • Front and Back sides ready to process'}
          </Text>
        </View>

        {/* Dual Previews */}
        <ScrollView
          style={styles.dualScroll}
          contentContainerStyle={styles.dualScrollContent}
        >
          {/* Front Preview Card */}
          <View style={styles.sideCard}>
            <View style={styles.sideCardHeader}>
              <Text style={styles.sideCardTitle}>1. Front Side</Text>
              <Pressable
                onPress={() => {
                  setFrontImage(null);
                }}
              >
                <Text style={styles.retakeText}>Retake Front</Text>
              </Pressable>
            </View>
            <View style={styles.sideImageWrapper}>
              <Image
                source={{ uri: frontImage }}
                style={styles.sideImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Back Preview Card */}
          <View style={styles.sideCard}>
            <View style={styles.sideCardHeader}>
              <Text style={styles.sideCardTitle}>2. Back Side</Text>
              <Pressable
                onPress={() => {
                  setBackImage(null);
                  setIsCapturingBack(true);
                }}
              >
                <Text style={styles.retakeText}>Retake Back</Text>
              </Pressable>
            </View>
            <View style={styles.sideImageWrapper}>
              <Image
                source={{ uri: backImage }}
                style={styles.sideImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </ScrollView>

        {ocrError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Recognition Notice</Text>
            <Text style={styles.errorBannerText}>{ocrError}</Text>
          </View>
        )}

        {/* Action Footer */}
        <View style={styles.footer}>
          {ocrStatus === 'processing' ? (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.waitText}>
                {ocrProgressMessage || 'Processing document locally...'}
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.primaryButton}
                onPress={() => handleProcessImages(frontImage, backImage)}
              >
                <Text style={styles.primaryButtonText}>
                  ⚡ Process Both Sides (Extract All Fields)
                </Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  // Cancel back scan and proceed with front only
                  setBackImage(null);
                  handleProcessImages(frontImage, null);
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  Discard Back (Continue with Front Only)
                </Text>
              </Pressable>

              <Pressable style={styles.textButton} onPress={handleReset}>
                <Text style={styles.textButtonText}>Discard Both & Start Over</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // 6. If FRONT side ONLY is captured, display Front Preview with "Scan Back Side" or "Continue" (Step 2)
  if (frontImage && !backImage && !isCapturingBack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {ocrStatus === 'processing' ? 'Processing On Device...' : 'Front Side Captured'}
          </Text>
          <Text style={styles.subtitle}>
            {ocrStatus === 'processing'
              ? ocrProgressMessage || 'Analyzing text locally with Google ML Kit'
              : 'Step 1 of 2 Complete • Capture the back side or continue with front only'}
          </Text>
        </View>

        {/* Front Image Preview */}
        <View style={styles.previewContainer}>
          {imageLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          )}

          {imageError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load image preview.</Text>
            </View>
          ) : (
            <Image
              source={{ uri: frontImage }}
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

          <View style={styles.stepBadgeOverlay}>
            <Text style={styles.stepBadgeText}>Front Side ✓</Text>
          </View>
        </View>

        {ocrError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Recognition Notice</Text>
            <Text style={styles.errorBannerText}>{ocrError}</Text>
          </View>
        )}

        {/* Action Footer (Step 2 of workflow) */}
        <View style={styles.footer}>
          {ocrStatus === 'processing' ? (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.waitText}>
                {ocrProgressMessage || 'Processing document locally...'}
              </Text>
            </View>
          ) : (
            <>
              {/* Button A: Scan Back Side */}
              <Pressable
                style={styles.primaryButton}
                onPress={() => setIsCapturingBack(true)}
              >
                <Text style={styles.primaryButtonText}>
                  🔄 Scan Back Side
                </Text>
              </Pressable>

              {/* Button B: Continue with Front Only */}
              <Pressable
                style={styles.secondaryButton}
                onPress={() => handleProcessImages(frontImage, null)}
              >
                <Text style={styles.secondaryButtonText}>
                  ⚡ Continue with Front Only
                </Text>
              </Pressable>

              {/* Retake Front */}
              <Pressable style={styles.retakeButton} onPress={handleReset}>
                <Text style={styles.retakeButtonText}>Retake Front Photo</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // 7. Initial Live Camera Screen (Step 1: Capture Front Side)
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
        title="Capture Front Side"
        subtitle="Step 1 of 2: Align the FRONT side of your document"
        onImageCaptured={(imageUri) => {
          setFrontImage(imageUri);
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
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
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
  stepBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(22, 163, 74, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dualScroll: {
    flex: 1,
  },
  dualScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  sideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sideCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  sideImageWrapper: {
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  sideImage: {
    width: '100%',
    height: '100%',
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
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  waitText: {
    textAlign: 'center',
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  retakeButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  textButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
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
