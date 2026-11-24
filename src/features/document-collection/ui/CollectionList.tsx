import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DocumentRecord } from '../model/types';

interface CollectionListProps {
  records: DocumentRecord[];
  onEditRecord: (record: DocumentRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export default function CollectionList({
  records,
  onEditRecord,
  onDeleteRecord,
}: CollectionListProps) {
  if (records.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Text style={styles.emptyIcon}>📋</Text>
        </View>
        <Text style={styles.emptyTitle}>Collection is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Scan identity documents to automatically detect, extract, and collect records in one continuous Excel sheet.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <View style={styles.recordCard}>
          {/* Top Row: Index Badge & Document Type */}
          <View style={styles.cardHeader}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>#{item.index}</Text>
            </View>

            <View
              style={[
                styles.typeTag,
                item.documentType === 'OMAN_ID' && styles.typeOmanId,
                item.documentType === 'OMAN_DL' && styles.typeOmanDl,
                item.documentType === 'INDIAN_PASSPORT' && styles.typePassport,
              ]}
            >
              <Text style={styles.typeText}>{item.documentTypeLabel}</Text>
            </View>
          </View>

          {/* Main Info */}
          <Text style={styles.nameText}>
            {item.fullName || 'Unnamed Individual'}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Doc #:</Text>
              <Text style={[styles.infoValue, styles.monoValue]}>
                {item.documentNumber || '—'}
              </Text>
            </View>

            {item.dateOfBirth ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>DOB:</Text>
                <Text style={styles.infoValue}>{item.dateOfBirth}</Text>
              </View>
            ) : null}

            {item.expiryDate ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expiry:</Text>
                <Text style={styles.infoValue}>{item.expiryDate}</Text>
              </View>
            ) : null}

            {item.nationality ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nationality:</Text>
                <Text style={styles.infoValue}>{item.nationality}</Text>
              </View>
            ) : null}
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <Pressable
              style={styles.actionBtnEdit}
              onPress={() => onEditRecord(item)}
            >
              <Text style={styles.actionBtnEditText}>✏️ Edit</Text>
            </Pressable>

            <Pressable
              style={styles.actionBtnDelete}
              onPress={() => onDeleteRecord(item.id)}
            >
              <Text style={styles.actionBtnDeleteText}>🗑️ Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 12,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  indexBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  typeOmanId: {
    backgroundColor: '#DCFCE7',
  },
  typeOmanDl: {
    backgroundColor: '#FEF3C7',
  },
  typePassport: {
    backgroundColor: '#E0E7FF',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  infoGrid: {
    gap: 4,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  monoValue: {
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionBtnEdit: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnEditText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  actionBtnDelete: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionBtnDeleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
