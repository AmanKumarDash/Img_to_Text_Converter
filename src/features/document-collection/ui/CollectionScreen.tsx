import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DocumentRecord } from '../model/types';
import CollectionList from './CollectionList';

interface CollectionScreenProps {
  records: DocumentRecord[];
  onScanNext: () => void;
  onExportExcel: () => void;
  onUpdateRecord: (
    id: string,
    updates: Partial<Omit<DocumentRecord, 'id' | 'index' | 'scannedAt'>>
  ) => void;
  onDeleteRecord: (id: string) => void;
  onClearCollection: () => void;
  onBack: () => void;
}

export default function CollectionScreen({
  records,
  onScanNext,
  onExportExcel,
  onUpdateRecord,
  onDeleteRecord,
  onClearCollection,
  onBack,
}: CollectionScreenProps) {
  const [editingRecord, setEditingRecord] = useState<DocumentRecord | null>(null);

  // Edit form states
  const [editFullName, setEditFullName] = useState('');
  const [editDocNumber, setEditDocNumber] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editNationality, setEditNationality] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const omanIdCount = records.filter((r) => r.documentType === 'OMAN_ID').length;
  const omanDlCount = records.filter((r) => r.documentType === 'OMAN_DL').length;
  const passportCount = records.filter(
    (r) => r.documentType === 'INDIAN_PASSPORT'
  ).length;

  const handleOpenEdit = (record: DocumentRecord) => {
    setEditingRecord(record);
    setEditFullName(record.fullName);
    setEditDocNumber(record.documentNumber);
    setEditDob(record.dateOfBirth);
    setEditExpiry(record.expiryDate);
    setEditNationality(record.nationality);
    setEditGender(record.gender);
    setEditIssueDate(record.issueDate);
    setEditAddress(record.address);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    onUpdateRecord(editingRecord.id, {
      fullName: editFullName.trim(),
      documentNumber: editDocNumber.trim(),
      dateOfBirth: editDob.trim(),
      expiryDate: editExpiry.trim(),
      nationality: editNationality.trim(),
      gender: editGender.trim(),
      issueDate: editIssueDate.trim(),
      address: editAddress.trim(),
    });
    setEditingRecord(null);
  };

  const handleConfirmClear = () => {
    Alert.alert(
      'Clear Entire Collection?',
      `Are you sure you want to permanently delete all ${records.length} collected records? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: onClearCollection,
        },
      ]
    );
  };

  const handleConfirmDelete = (id: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this record from the collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteRecord(id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Scanner</Text>
          </Pressable>

          <Text style={styles.title}>Document Collection</Text>

          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              {records.length} {records.length === 1 ? 'Record' : 'Records'}
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Single-worksheet continuous multi-scan identity collection
        </Text>

        {/* Breakdown chips */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Oman ID</Text>
            <Text style={styles.statValue}>{omanIdCount}</Text>
          </View>

          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Oman DL</Text>
            <Text style={styles.statValue}>{omanDlCount}</Text>
          </View>

          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Indian Passport</Text>
            <Text style={styles.statValue}>{passportCount}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons Bar */}
      <View style={styles.actionsBar}>
        <Pressable style={styles.scanBtn} onPress={onScanNext}>
          <Text style={styles.scanBtnText}>📷 Scan Next</Text>
        </Pressable>

        <Pressable
          style={[styles.exportBtn, records.length === 0 && styles.btnDisabled]}
          onPress={onExportExcel}
          disabled={records.length === 0}
        >
          <Text style={styles.exportBtnText}>📊 Export Excel</Text>
        </Pressable>

        {records.length > 0 && (
          <Pressable style={styles.clearBtn} onPress={handleConfirmClear}>
            <Text style={styles.clearBtnText}>🗑️</Text>
          </Pressable>
        )}
      </View>

      {/* Records List */}
      <View style={styles.listContainer}>
        <CollectionList
          records={records}
          onEditRecord={handleOpenEdit}
          onDeleteRecord={handleConfirmDelete}
        />
      </View>

      {/* Edit Record Modal */}
      {editingRecord && (
        <Modal
          visible={!!editingRecord}
          animationType="slide"
          onRequestClose={() => setEditingRecord(null)}
        >
          <SafeAreaView style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>
                Edit Record #{editingRecord.index} ({editingRecord.documentTypeLabel})
              </Text>
              <Pressable onPress={() => setEditingRecord(null)}>
                <Text style={styles.editModalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.editModalScroll}
              contentContainerStyle={styles.editModalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Full Name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Document Number</Text>
                <TextInput
                  style={[styles.input, styles.monoInput]}
                  value={editDocNumber}
                  onChangeText={setEditDocNumber}
                  placeholder="Document Number"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <TextInput
                    style={styles.input}
                    value={editDob}
                    onChangeText={setEditDob}
                    placeholder="DD-MM-YYYY"
                  />
                </View>

                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput
                    style={styles.input}
                    value={editExpiry}
                    onChangeText={setEditExpiry}
                    placeholder="DD-MM-YYYY"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>Nationality</Text>
                  <TextInput
                    style={styles.input}
                    value={editNationality}
                    onChangeText={setEditNationality}
                    placeholder="Nationality"
                  />
                </View>

                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <TextInput
                    style={styles.input}
                    value={editGender}
                    onChangeText={setEditGender}
                    placeholder="Gender"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Issue Date</Text>
                <TextInput
                  style={styles.input}
                  value={editIssueDate}
                  onChangeText={setEditIssueDate}
                  placeholder="Issue Date"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Address"
                />
              </View>
            </ScrollView>

            <View style={styles.editModalFooter}>
              <Pressable style={styles.saveEditBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveEditBtnText}>Save Changes</Text>
              </Pressable>

              <Pressable
                style={styles.cancelEditBtn}
                onPress={() => setEditingRecord(null)}
              >
                <Text style={styles.cancelEditBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
    alignItems: 'center',
  },
  scanBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  exportBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  clearBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearBtnText: {
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  listContainer: {
    flex: 1,
  },
  editModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  editModalCloseText: {
    fontSize: 20,
    color: '#64748B',
    padding: 4,
  },
  editModalScroll: {
    flex: 1,
  },
  editModalScrollContent: {
    padding: 16,
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  monoInput: {
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  editModalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  saveEditBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveEditBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelEditBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelEditBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
