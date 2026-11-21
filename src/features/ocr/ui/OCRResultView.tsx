import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { OfflineOCRResult } from '../model/types';

interface OCRResultViewProps {
  imageUri: string;
  result: OfflineOCRResult;
  onRetake: () => void;
  onReExtract: () => void;
}

export default function OCRResultView({
  imageUri,
  result,
  onRetake,
  onReExtract,
}: OCRResultViewProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'raw' | 'blocks'>('table');
  const [showImage, setShowImage] = useState(false);

  const hasTable = result.table && result.table.rows && result.table.rows.length > 0;

  return (
    <View style={styles.container}>
      {/* Engine & Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            ⚡ Google ML Kit (On-Device & Offline)
          </Text>
        </View>

        <View style={styles.offlinePill}>
          <Text style={styles.offlinePillText}>🔒 100% Private</Text>
        </View>
      </View>

      {/* Summary Chips */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricChip}>
          <Text style={styles.metricLabel}>Blocks</Text>
          <Text style={styles.metricValue}>{result.blockCount}</Text>
        </View>
        <View style={styles.metricChip}>
          <Text style={styles.metricLabel}>Lines</Text>
          <Text style={styles.metricValue}>{result.lineCount}</Text>
        </View>
        <View style={styles.metricChip}>
          <Text style={styles.metricLabel}>Table Rows</Text>
          <Text style={styles.metricValue}>{result.table?.rows?.length || 0}</Text>
        </View>
      </View>

      {/* Collapsible Source Image Preview */}
      <View style={styles.imageHeader}>
        <Pressable
          style={styles.toggleImageButton}
          onPress={() => setShowImage(!showImage)}
        >
          <Text style={styles.toggleImageText}>
            {showImage ? '▲ Hide Original Image' : '▼ View Original Image for Comparison'}
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

      {/* Navigation Tabs */}
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
            Structured Table
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
            Full Text
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'blocks' && styles.activeTab]}
          onPress={() => setActiveTab('blocks')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'blocks' && styles.activeTabText,
            ]}
          >
            Blocks ({result.blocks.length})
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'table' && (
          hasTable ? (
            <ScrollView horizontal style={styles.horizontalScroll}>
              <ScrollView style={styles.verticalScroll}>
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableRowHeader}>
                    {result.table?.headers.map((header, idx) => (
                      <View key={idx} style={styles.tableCellHeader}>
                        <Text style={styles.headerText}>{String(header ?? '')}</Text>
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
                          <Text style={styles.cellText}>
                            {typeof cell === 'object' ? JSON.stringify(cell) : String(cell ?? '')}
                          </Text>
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
                No table detected. Check the Full Text tab.
              </Text>
            </View>
          )
        )}

        {activeTab === 'raw' && (
          <ScrollView style={styles.rawTextContainer}>
            <Text style={styles.rawText} selectable>
              {result.rawText}
            </Text>
          </ScrollView>
        )}

        {activeTab === 'blocks' && (
          <ScrollView style={styles.blocksContainer}>
            {result.blocks.map((block, bIdx) => (
              <View key={bIdx} style={styles.blockCard}>
                <View style={styles.blockHeader}>
                  <Text style={styles.blockTitle}>Block #{bIdx + 1}</Text>
                  {block.frame && (
                    <Text style={styles.blockFrame}>
                      Top: {Math.round(block.frame.top)} Left: {Math.round(block.frame.left)}
                    </Text>
                  )}
                </View>
                <Text style={styles.blockContent}>{block.text}</Text>
                <Text style={styles.blockLineCount}>{block.lines.length} lines detected</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <Pressable style={styles.retakeButton} onPress={onRetake}>
          <Text style={styles.retakeButtonText}>Scan Another</Text>
        </Pressable>

        <Pressable style={styles.reExtractButton} onPress={onReExtract}>
          <Text style={styles.reExtractButtonText}>Retry OCR</Text>
        </Pressable>
      </View>
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
    paddingBottom: 4,
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusBadgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  offlinePill: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  offlinePillText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  metricChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
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
    fontSize: 13,
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
  blocksContainer: {
    flex: 1,
    padding: 12,
  },
  blockCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  blockTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: '#2563EB',
  },
  blockFrame: {
    fontSize: 11,
    color: '#94A3B8',
  },
  blockContent: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  blockLineCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
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
});
