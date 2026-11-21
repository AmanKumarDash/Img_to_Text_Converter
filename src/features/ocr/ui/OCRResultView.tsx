import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OCRResult } from '../model/types';
import { OCRService } from '../services/ocrService';

interface OCRResultViewProps {
  imageUri: string;
  result: OCRResult;
  onRetake: () => void;
  onReExtract: () => void;
}

export default function OCRResultView({
  imageUri,
  result,
  onRetake,
  onReExtract,
}: OCRResultViewProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'raw'>('table');
  const [showImage, setShowImage] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(OCRService.getApiKey() || '');

  const hasTable = result.table && result.table.rows && result.table.rows.length > 0;
  const isMock = result.engine === 'mock-test';

  const handleSaveApiKey = () => {
    OCRService.setApiKey(apiKeyInput);
    setShowKeyModal(false);
    onReExtract();
  };

  return (
    <View style={styles.container}>
      {/* Engine & Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            {isMock ? '🧪 Test OCR Engine' : '✨ Gemini Vision OCR'}
          </Text>
        </View>

        <Pressable
          style={styles.keyButton}
          onPress={() => setShowKeyModal(true)}
        >
          <Text style={styles.keyButtonText}>
            {OCRService.hasApiKey() ? '🔑 API Key Set' : '⚙️ Setup API Key'}
          </Text>
        </Pressable>
      </View>

      {/* Collapsible Source Image Preview */}
      <View style={styles.imageHeader}>
        <Pressable
          style={styles.toggleImageButton}
          onPress={() => setShowImage(!showImage)}
        >
          <Text style={styles.toggleImageText}>
            {showImage ? '▲ Hide Original Image' : '▼ View Original Image'}
          </Text>
        </Pressable>
      </View>

      {showImage && (
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'table' && styles.activeTab]}
          onPress={() => setActiveTab('table')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'table' && styles.activeTabText,
            ]}
          >
            Structured Table ({result.table?.rows?.length || 0} rows)
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'raw' && styles.activeTab]}
          onPress={() => setActiveTab('raw')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'raw' && styles.activeTabText,
            ]}
          >
            Raw Extracted Text
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'table' ? (
          hasTable ? (
            <ScrollView horizontal style={styles.horizontalScroll}>
              <ScrollView style={styles.verticalScroll}>
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableRowHeader}>
                    {result.table?.headers.map((header, idx) => (
                      <View key={idx} style={styles.tableCellHeader}>
                        <Text style={styles.headerText}>{header}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Table Rows */}
                  {result.table?.rows.map((row, rowIdx) => (
                    <View
                      key={rowIdx}
                      style={[
                        styles.tableRow,
                        rowIdx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                      ]}
                    >
                      {row.map((cell, cellIdx) => (
                        <View key={cellIdx} style={styles.tableCell}>
                          <Text style={styles.cellText}>{cell}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No table detected. Check the Raw Extracted Text tab.
              </Text>
            </View>
          )
        ) : (
          <ScrollView style={styles.rawTextContainer}>
            <Text style={styles.rawText} selectable>
              {result.rawText}
            </Text>
          </ScrollView>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <Pressable style={styles.retakeButton} onPress={onRetake}>
          <Text style={styles.retakeButtonText}>Scan Another</Text>
        </Pressable>

        <Pressable style={styles.reExtractButton} onPress={onReExtract}>
          <Text style={styles.reExtractButtonText}>Re-extract</Text>
        </Pressable>
      </View>

      {/* API Key Modal */}
      <Modal visible={showKeyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Gemini Vision API Key</Text>
            <Text style={styles.modalDescription}>
              Enter your Google AI Studio Gemini API key to enable live cloud OCR and table extraction from any photo:
            </Text>

            <TextInput
              style={styles.keyInput}
              placeholder="Paste AIzaSy... key here"
              placeholderTextColor="#94A3B8"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowKeyModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.modalSave}
                onPress={handleSaveApiKey}
              >
                <Text style={styles.modalSaveText}>Save & Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  statusBadgeText: {
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '600',
  },
  keyButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  keyButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
  },
  imageHeader: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  toggleImageButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  toggleImageText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    height: 180,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1E293B',
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  horizontalScroll: {
    flex: 1,
  },
  verticalScroll: {
    flex: 1,
  },
  table: {
    padding: 8,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 6,
    marginBottom: 4,
  },
  tableCellHeader: {
    minWidth: 130,
    padding: 10,
    justifyContent: 'center',
  },
  headerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    minWidth: 130,
    padding: 10,
    justifyContent: 'center',
  },
  cellText: {
    color: '#334155',
    fontSize: 13,
  },
  rawTextContainer: {
    flex: 1,
    padding: 16,
  },
  rawText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
    color: '#1E293B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  reExtractButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  reExtractButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  keyInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSave: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
