import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTableEditor } from '../hooks/useTableEditor';
import { EditableTableData } from '../model/types';

interface TableEditorProps {
  initialData: EditableTableData;
  onBack: () => void;
  onContinueExport: (data: EditableTableData) => void;
}

export default function TableEditor({
  initialData,
  onBack,
  onContinueExport,
}: TableEditorProps) {
  const {
    data,
    selectedCell,
    setSelectedCell,
    editingHeaderIndex,
    setEditingHeaderIndex,
    updateCell,
    updateHeader,
    addRow,
    deleteRow,
    addColumn,
    deleteColumn,
    resetData,
  } = useTableEditor(initialData);

  const [cellInputValue, setCellInputValue] = useState('');
  const [headerInputValue, setHeaderInputValue] = useState('');
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [saveBannerVisible, setSaveBannerVisible] = useState(false);

  // When a cell is tapped, open cell edit modal
  const handleCellPress = (rowIndex: number, colIndex: number) => {
    const val = data.rows[rowIndex]?.[colIndex] || '';
    const headerTitle = data.headers[colIndex] || `Col ${colIndex + 1}`;
    setSelectedCell({
      rowIndex,
      colIndex,
      currentValue: val,
      headerTitle,
    });
    setCellInputValue(val);
  };

  // Save edited cell
  const handleSaveCell = () => {
    if (selectedCell) {
      updateCell(selectedCell.rowIndex, selectedCell.colIndex, cellInputValue);
      setSelectedCell(null);
    }
  };

  // When a header is tapped, open rename dialog
  const handleHeaderPress = (colIndex: number) => {
    const currentTitle = data.headers[colIndex] || `Column ${colIndex + 1}`;
    setEditingHeaderIndex({
      colIndex,
      currentTitle,
    });
    setHeaderInputValue(currentTitle);
  };

  // Save renamed header
  const handleSaveHeader = () => {
    if (editingHeaderIndex) {
      updateHeader(editingHeaderIndex.colIndex, headerInputValue);
      setEditingHeaderIndex(null);
    }
  };

  // Confirm delete column
  const confirmDeleteColumn = (colIndex: number) => {
    if (data.headers.length <= 1) {
      Alert.alert('Notice', 'A table must contain at least one column.');
      return;
    }
    Alert.alert(
      'Delete Column',
      `Are you sure you want to delete "${data.headers[colIndex]}"? All cell data in this column will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setEditingHeaderIndex(null);
            deleteColumn(colIndex);
          },
        },
      ]
    );
  };

  // Confirm delete row
  const confirmDeleteRow = (rowIndex: number) => {
    Alert.alert(
      'Delete Row',
      `Delete Row #${rowIndex + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRow(rowIndex),
        },
      ]
    );
  };

  const handleSaveChanges = () => {
    setSaveBannerVisible(true);
    setTimeout(() => {
      setSaveBannerVisible(false);
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topNav}>
        <Pressable style={styles.navButton} onPress={onBack}>
          <Text style={styles.navButtonText}>← Back</Text>
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>Spreadsheet Editor</Text>
          <Text style={styles.statsSubtitle}>
            {data.headers.length} columns × {data.rows.length} rows
          </Text>
        </View>

        <Pressable style={styles.resetButton} onPress={resetData}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </Pressable>
      </View>

      {/* Save confirmation banner */}
      {saveBannerVisible && (
        <View style={styles.saveBanner}>
          <Text style={styles.saveBannerText}>✓ Table changes saved to session</Text>
        </View>
      )}

      {/* Toolbar Controls */}
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={() => addRow()}>
          <Text style={styles.toolBtnText}>+ Add Row</Text>
        </Pressable>

        <Pressable style={styles.toolBtn} onPress={() => addColumn()}>
          <Text style={styles.toolBtnText}>+ Add Column</Text>
        </Pressable>

        {data.sourceImageUri && (
          <Pressable
            style={[styles.toolBtnSecondary, showImagePreview && styles.toolBtnActive]}
            onPress={() => setShowImagePreview(!showImagePreview)}
          >
            <Text
              style={[
                styles.toolBtnSecondaryText,
                showImagePreview && styles.toolBtnActiveText,
              ]}
            >
              {showImagePreview ? 'Hide Photo' : 'Compare Photo'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Collapsible Document Image Preview */}
      {showImagePreview && data.sourceImageUri && (
        <View style={styles.imageCompareContainer}>
          <Image
            source={{ uri: data.sourceImageUri }}
            style={styles.imageCompare}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Spreadsheet Grid */}
      <View style={styles.gridWrapper}>
        <ScrollView horizontal style={styles.horizontalScroll}>
          <ScrollView style={styles.verticalScroll}>
            <View style={styles.table}>
              {/* Header Row */}
              <View style={styles.tableRowHeader}>
                {/* Row Number Column Anchor */}
                <View style={styles.rowNumberCellHeader}>
                  <Text style={styles.rowNumberTextHeader}>#</Text>
                </View>

                {/* Column Headers */}
                {data.headers.map((header, colIdx) => (
                  <Pressable
                    key={colIdx}
                    style={styles.headerCell}
                    onPress={() => handleHeaderPress(colIdx)}
                  >
                    <View style={styles.headerContent}>
                      <Text style={styles.headerText} numberOfLines={1}>
                        {header}
                      </Text>
                      <Text style={styles.editIconHint}>✎</Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Data Rows */}
              {data.rows.map((row, rowIdx) => (
                <View
                  key={rowIdx}
                  style={[
                    styles.tableRow,
                    rowIdx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                  ]}
                >
                  {/* Row Number & Delete Button */}
                  <Pressable
                    style={styles.rowNumberCell}
                    onPress={() => confirmDeleteRow(rowIdx)}
                  >
                    <Text style={styles.rowNumberText}>{rowIdx + 1}</Text>
                    <Text style={styles.rowDeleteHint}>×</Text>
                  </Pressable>

                  {/* Cells */}
                  {row.map((cellValue, colIdx) => (
                    <Pressable
                      key={colIdx}
                      style={styles.cell}
                      onPress={() => handleCellPress(rowIdx, colIdx)}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          !cellValue && styles.emptyCellPlaceholder,
                        ]}
                        numberOfLines={2}
                      >
                        {cellValue ? String(cellValue) : '(empty)'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.saveBtn} onPress={handleSaveChanges}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </Pressable>

        <Pressable
          style={styles.continueBtn}
          onPress={() => onContinueExport(data)}
        >
          <Text style={styles.continueBtnText}>Continue to Export →</Text>
        </Pressable>
      </View>

      {/* Cell Edit Modal */}
      <Modal
        visible={Boolean(selectedCell)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCell(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeaderTitle}>
              Edit Cell: {selectedCell?.headerTitle} (Row {(selectedCell?.rowIndex ?? 0) + 1})
            </Text>

            <TextInput
              style={styles.cellInput}
              value={cellInputValue}
              onChangeText={setCellInputValue}
              placeholder="Enter cell value..."
              placeholderTextColor="#94A3B8"
              autoFocus
              selectTextOnFocus
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalClearBtn}
                onPress={() => setCellInputValue('')}
              >
                <Text style={styles.modalClearBtnText}>Clear</Text>
              </Pressable>

              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setSelectedCell(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.modalSaveBtn} onPress={handleSaveCell}>
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header Rename & Column Option Modal */}
      <Modal
        visible={Boolean(editingHeaderIndex)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingHeaderIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeaderTitle}>Rename Column Header</Text>

            <TextInput
              style={styles.cellInput}
              value={headerInputValue}
              onChangeText={setHeaderInputValue}
              placeholder="Enter column name..."
              placeholderTextColor="#94A3B8"
              autoFocus
              selectTextOnFocus
            />

            <View style={styles.modalActions}>
              {editingHeaderIndex !== null && data.headers.length > 1 && (
                <Pressable
                  style={styles.modalDeleteColBtn}
                  onPress={() =>
                    confirmDeleteColumn(editingHeaderIndex.colIndex)
                  }
                >
                  <Text style={styles.modalDeleteColBtnText}>Delete Column</Text>
                </Pressable>
              )}

              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setEditingHeaderIndex(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.modalSaveBtn}
                onPress={handleSaveHeader}
              >
                <Text style={styles.modalSaveBtnText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  titleContainer: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  resetButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
  saveBanner: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  saveBannerText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  toolBtn: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  toolBtnText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '600',
  },
  toolBtnSecondary: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginLeft: 'auto',
  },
  toolBtnSecondaryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  toolBtnActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  toolBtnActiveText: {
    color: '#FFFFFF',
  },
  imageCompareContainer: {
    height: 160,
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageCompare: {
    width: '100%',
    height: '100%',
  },
  gridWrapper: {
    flex: 1,
    margin: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  horizontalScroll: {
    flex: 1,
  },
  verticalScroll: {
    flex: 1,
  },
  table: {
    flexDirection: 'column',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  rowNumberCellHeader: {
    width: 48,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  rowNumberTextHeader: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  headerCell: {
    minWidth: 140,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  editIconHint: {
    color: '#94A3B8',
    fontSize: 11,
    marginLeft: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  rowNumberCell: {
    width: 48,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  rowNumberText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  rowDeleteHint: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  cell: {
    minWidth: 140,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  emptyCellPlaceholder: {
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  continueBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  cellInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  modalClearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 'auto',
  },
  modalClearBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  modalDeleteColBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 'auto',
  },
  modalDeleteColBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
