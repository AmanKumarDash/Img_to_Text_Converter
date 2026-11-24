import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GeneratedWorkbookResult, SavedFileResult } from '../model/types';
import { FileService } from '../services/fileService';

interface WorkbookStatusModalProps {
  visible: boolean;
  result: GeneratedWorkbookResult | null;
  error?: string | null;
  onClose: () => void;
  onFileSaved?: (file: SavedFileResult) => void;
}

export default function WorkbookStatusModal({
  visible,
  result,
  error,
  onClose,
  onFileSaved,
}: WorkbookStatusModalProps) {
  const [fileName, setFileName] = useState('');
  const [savedFile, setSavedFile] = useState<SavedFileResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // When a new result arrives, reset states and initialize file name
  useEffect(() => {
    if (result) {
      setFileName(result.suggestedFileName);
      setSavedFile(null);
      setActionError(null);
      setActionNotice(null);
      // Auto-save the workbook locally upon generation
      autoSaveFile(result, result.suggestedFileName);
    } else {
      setSavedFile(null);
      setActionError(null);
      setActionNotice(null);
    }
  }, [result]);

  const autoSaveFile = async (
    wbResult: GeneratedWorkbookResult,
    targetName: string
  ) => {
    try {
      setIsSaving(true);
      setActionError(null);
      const saved = await FileService.saveWorkbookFile(wbResult, targetName);
      setSavedFile(saved);
      if (onFileSaved) {
        onFileSaved(saved);
      }
    } catch (err: any) {
      console.warn('Auto-save notice:', err);
      setActionError(err?.message || 'Failed to automatically save workbook to device.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!result) return;
    try {
      setIsSaving(true);
      setActionError(null);
      setActionNotice(null);
      const saved = await FileService.saveWorkbookFile(result, fileName);
      setSavedFile(saved);
      setActionNotice('Spreadsheet saved to device storage!');
      if (onFileSaved) {
        onFileSaved(saved);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save workbook.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      setIsSharing(true);
      setActionError(null);
      setActionNotice(null);

      // Ensure the file is saved first
      let fileToShare = savedFile;
      if (!fileToShare) {
        fileToShare = await FileService.saveWorkbookFile(result, fileName);
        setSavedFile(fileToShare);
        if (onFileSaved) {
          onFileSaved(fileToShare);
        }
      }

      const shareResult = await FileService.shareExcelFile(
        fileToShare.uri,
        `Share ${fileToShare.fileName}`
      );

      if (shareResult.message) {
        setActionNotice(shareResult.message);
      }
    } catch (err: any) {
      console.error('Sharing failure:', err);
      setActionError(err?.message || 'Failed to open share dialog.');
    } finally {
      setIsSharing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <>
                <View style={styles.errorIconCircle}>
                  <Text style={styles.errorIcon}>✕</Text>
                </View>
                <Text style={styles.title}>Generation Failed</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <Pressable style={styles.secondaryBtn} onPress={onClose}>
                  <Text style={styles.secondaryBtnText}>Dismiss</Text>
                </Pressable>
              </>
            ) : result ? (
              <>
                <View style={styles.successIconCircle}>
                  <Text style={styles.successIcon}>✓</Text>
                </View>

                <Text style={styles.title}>Excel (.xlsx) Ready</Text>
                <Text style={styles.subtitle}>
                  Genuine OpenXML spreadsheet generated completely offline on your device.
                </Text>

                {/* File Details Card */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>File Size</Text>
                    <Text style={styles.detailValue}>
                      {(result.byteSize / 1024).toFixed(1)} KB
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sheet Name</Text>
                    <Text style={styles.detailValue}>{result.sheetName}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dimensions</Text>
                    <Text style={styles.detailValue}>
                      {result.columnCount} cols × {result.rowCount} rows
                    </Text>
                  </View>
                </View>

                {/* File Name Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>File Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={fileName}
                      onChangeText={setFileName}
                      placeholder="Scanned_Table.xlsx"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Local Storage Saved Banner */}
                {isSaving ? (
                  <View style={styles.savingBox}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.savingText}>Saving file to device storage...</Text>
                  </View>
                ) : savedFile ? (
                  <View style={styles.savedBanner}>
                    <View style={styles.savedHeaderRow}>
                      <Text style={styles.savedBadgeText}>✓ SAVED TO DEVICE</Text>
                    </View>
                    <Text style={styles.savedFileNameText} numberOfLines={1}>
                      {savedFile.fileName}
                    </Text>
                    <Text style={styles.savedPathText} numberOfLines={2}>
                      {savedFile.uri}
                    </Text>
                  </View>
                ) : null}

                {/* Notification/Notice Banner */}
                {actionNotice && (
                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>ℹ️ {actionNotice}</Text>
                  </View>
                )}

                {/* Error Banner */}
                {actionError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️ {actionError}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtonGroup}>
                  {/* Share Button (Primary) */}
                  <Pressable
                    style={[styles.primaryBtn, isSharing && styles.btnDisabled]}
                    onPress={handleShare}
                    disabled={isSharing || isSaving}
                  >
                    {isSharing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>📤 Share Excel (.xlsx)</Text>
                    )}
                  </Pressable>

                  {/* Manual Save / Update Name Button */}
                  <Pressable
                    style={[styles.saveBtn, isSaving && styles.btnDisabled]}
                    onPress={handleManualSave}
                    disabled={isSaving || isSharing}
                  >
                    <Text style={styles.saveBtnText}>
                      💾 {savedFile ? 'Update File Name' : 'Save to Device'}
                    </Text>
                  </Pressable>

                  {/* Close Button */}
                  <Pressable style={styles.secondaryBtn} onPress={onClose}>
                    <Text style={styles.secondaryBtnText}>Done</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  successIcon: {
    fontSize: 28,
    color: '#15803D',
    fontWeight: '700',
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  errorIcon: {
    fontSize: 28,
    color: '#B91C1C',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  inputWrapper: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  savingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 14,
    gap: 8,
  },
  savingText: {
    fontSize: 13,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  savedBanner: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 14,
  },
  savedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  savedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  savedFileNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 2,
  },
  savedPathText: {
    fontSize: 11,
    color: '#15803D',
    opacity: 0.8,
  },
  noticeBox: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 16,
  },
  actionButtonGroup: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
