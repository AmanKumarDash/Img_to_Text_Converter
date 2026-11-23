import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GeneratedWorkbookResult } from '../model/types';

interface WorkbookStatusModalProps {
  visible: boolean;
  result: GeneratedWorkbookResult | null;
  error?: string | null;
  onClose: () => void;
}

export default function WorkbookStatusModal({
  visible,
  result,
  error,
  onClose,
}: WorkbookStatusModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {error ? (
            <>
              <View style={styles.errorIconCircle}>
                <Text style={styles.errorIcon}>✕</Text>
              </View>
              <Text style={styles.title}>Generation Failed</Text>
              <Text style={styles.description}>{error}</Text>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Dismiss</Text>
              </Pressable>
            </>
          ) : result ? (
            <>
              <View style={styles.successIconCircle}>
                <Text style={styles.successIcon}>✓</Text>
              </View>

              <Text style={styles.title}>Excel (.xlsx) Generated</Text>
              <Text style={styles.subtitle}>
                Genuine OpenXML spreadsheet created successfully from your edited table.
              </Text>

              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>File Name</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {result.suggestedFileName}
                  </Text>
                </View>

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
                    {result.columnCount} columns × {result.rowCount} rows
                  </Text>
                </View>
              </View>

              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  🔒 Generated 100% offline. Ready for local device saving and sharing in Task 4.
                </Text>
              </View>

              <Pressable style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </>
          ) : null}
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
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
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
    marginBottom: 18,
    lineHeight: 18,
  },
  description: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
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
  noticeBox: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  noticeText: {
    fontSize: 12,
    color: '#1D4ED8',
    textAlign: 'center',
    lineHeight: 16,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
});
