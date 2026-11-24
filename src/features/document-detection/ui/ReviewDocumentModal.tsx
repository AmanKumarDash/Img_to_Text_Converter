import React, { useEffect, useState } from 'react';
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

import {
  DocumentDetectionResult,
  ExtractedDocumentFields,
  SupportedDocumentType,
} from '../model/types';
import { DocumentDetectionService } from '../services/documentDetectionService';
import { DocumentFieldExtractor } from '../services/documentFieldExtractor';
import { NewDocumentRecordInput } from '../../document-collection/model/types';

interface ReviewDocumentModalProps {
  visible: boolean;
  imageUri: string | null;
  detectionResult: DocumentDetectionResult | null;
  nextIndex: number;
  onSaveToCollection: (record: NewDocumentRecordInput) => void;
  onDiscard: () => void;
}

const DOCUMENT_OPTIONS: { type: SupportedDocumentType; label: string }[] = [
  { type: 'OMAN_ID', label: 'Oman ID' },
  { type: 'OMAN_DL', label: 'Oman Driving Licence' },
  { type: 'INDIAN_PASSPORT', label: 'Indian Passport' },
  { type: 'UNKNOWN', label: 'Unknown Document' },
];

export default function ReviewDocumentModal({
  visible,
  imageUri,
  detectionResult,
  nextIndex,
  onSaveToCollection,
  onDiscard,
}: ReviewDocumentModalProps) {
  const [selectedType, setSelectedType] = useState<SupportedDocumentType>('UNKNOWN');
  const [fields, setFields] = useState<ExtractedDocumentFields>({
    fullName: '',
    dateOfBirth: '',
    documentNumber: '',
    nationality: '',
    issueDate: '',
    expiryDate: '',
    gender: '',
    address: '',
  });
  const [showImage, setShowImage] = useState(false);

  // Initialize fields when detection result changes
  useEffect(() => {
    if (detectionResult) {
      const detected = detectionResult.documentType;
      setSelectedType(detected);
      const extracted = DocumentFieldExtractor.extractFields(
        detected,
        detectionResult.rawText
      );
      setFields(extracted);
    }
  }, [detectionResult]);

  // When user switches document type manually, re-extract fields
  const handleTypeChange = (newType: SupportedDocumentType) => {
    setSelectedType(newType);
    if (detectionResult) {
      const reExtracted = DocumentFieldExtractor.extractFields(
        newType,
        detectionResult.rawText
      );
      // Keep any user-typed values that are non-empty
      setFields((prev) => ({
        fullName: prev.fullName || reExtracted.fullName,
        dateOfBirth: prev.dateOfBirth || reExtracted.dateOfBirth,
        documentNumber: prev.documentNumber || reExtracted.documentNumber,
        nationality: reExtracted.nationality || prev.nationality,
        issueDate: prev.issueDate || reExtracted.issueDate,
        expiryDate: prev.expiryDate || reExtracted.expiryDate,
        gender: prev.gender || reExtracted.gender,
        address: prev.address || reExtracted.address,
      }));
    }
  };

  const handleSave = () => {
    const typeOption =
      DOCUMENT_OPTIONS.find((opt) => opt.type === selectedType) || DOCUMENT_OPTIONS[3];

    onSaveToCollection({
      documentType: selectedType,
      documentTypeLabel: typeOption.label,
      fullName: fields.fullName.trim(),
      dateOfBirth: fields.dateOfBirth.trim(),
      documentNumber: fields.documentNumber.trim(),
      nationality: fields.nationality.trim(),
      issueDate: fields.issueDate.trim(),
      expiryDate: fields.expiryDate.trim(),
      gender: fields.gender.trim(),
      address: fields.address.trim(),
      imageUri: imageUri || undefined,
    });
  };

  if (!visible || !detectionResult) return null;

  const confidencePct = Math.round(detectionResult.confidence * 100);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDiscard}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Review Scanned Document</Text>
          <Text style={styles.subtitle}>
            Record #{nextIndex} • Verify extracted data before adding to collection
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Document Type Selector */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>DETECTED DOCUMENT TYPE</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{confidencePct}% Match</Text>
              </View>
            </View>

            <View style={styles.typeSelectorRow}>
              {DOCUMENT_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type;
                return (
                  <Pressable
                    key={opt.type}
                    style={[styles.typePill, isSelected && styles.typePillSelected]}
                    onPress={() => handleTypeChange(opt.type)}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        isSelected && styles.typePillTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Collapsible Original Image Comparison */}
          {imageUri && (
            <View style={styles.imageCard}>
              <Pressable
                style={styles.toggleImageRow}
                onPress={() => setShowImage(!showImage)}
              >
                <Text style={styles.toggleImageText}>
                  {showImage ? '▲ Hide Original Photo' : '▼ Compare with Original Photo'}
                </Text>
              </Pressable>
              {showImage && (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
          )}

          {/* Extracted Fields Form */}
          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>EXTRACTED IDENTITY FIELDS</Text>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fields.fullName}
                onChangeText={(val) => setFields((f) => ({ ...f, fullName: val }))}
                placeholder="Enter Full Name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Document Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>
                Document Number (Civil No / Passport No / DL No)
              </Text>
              <TextInput
                style={[styles.input, styles.monoInput]}
                value={fields.documentNumber}
                onChangeText={(val) => setFields((f) => ({ ...f, documentNumber: val }))}
                placeholder="Document / Civil Number"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />
            </View>

            {/* Two Column Row: DOB & Expiry */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  value={fields.dateOfBirth}
                  onChangeText={(val) => setFields((f) => ({ ...f, dateOfBirth: val }))}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.fieldLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={fields.expiryDate}
                  onChangeText={(val) => setFields((f) => ({ ...f, expiryDate: val }))}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Two Column Row: Nationality & Gender */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.fieldLabel}>Nationality</Text>
                <TextInput
                  style={styles.input}
                  value={fields.nationality}
                  onChangeText={(val) => setFields((f) => ({ ...f, nationality: val }))}
                  placeholder="e.g. Omani, Indian"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={[styles.inputGroup, styles.col]}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <TextInput
                  style={styles.input}
                  value={fields.gender}
                  onChangeText={(val) => setFields((f) => ({ ...f, gender: val }))}
                  placeholder="Male / Female"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Issue Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Issue Date</Text>
              <TextInput
                style={styles.input}
                value={fields.issueDate}
                onChangeText={(val) => setFields((f) => ({ ...f, issueDate: val }))}
                placeholder="DD-MM-YYYY (if available)"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Address / Wilayat</Text>
              <TextInput
                style={styles.input}
                value={fields.address}
                onChangeText={(val) => setFields((f) => ({ ...f, address: val }))}
                placeholder="Address (if available)"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>
              ✓ Add to Collection (Record #{nextIndex})
            </Text>
          </Pressable>

          <Pressable style={styles.discardBtn} onPress={onDiscard}>
            <Text style={styles.discardBtnText}>Discard & Scan Again</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  confidenceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  typePillSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  typePillTextSelected: {
    color: '#FFFFFF',
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleImageRow: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  toggleImageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  imageWrapper: {
    height: 180,
    backgroundColor: '#0F172A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  inputGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#F8FAFC',
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
    letterSpacing: 0.5,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  discardBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  discardBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
