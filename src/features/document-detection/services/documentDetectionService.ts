import {
  DocumentDetectionResult,
  DocumentTypeIndicator,
  SupportedDocumentType,
} from '../model/types';

interface TypeScore {
  type: SupportedDocumentType;
  label: string;
  totalScore: number;
  maxScore: number;
  matchedCount: number;
  indicators: DocumentTypeIndicator[];
}

/**
 * Service for automatically classifying identity documents from raw OCR text.
 * Completely offline, privacy-preserving, and heuristic-based.
 */
export class DocumentDetectionService {
  public static readonly DOCUMENT_LABELS: Record<SupportedDocumentType, string> = {
    OMAN_ID: 'Oman ID',
    OMAN_DL: 'Oman Driving Licence',
    INDIAN_PASSPORT: 'Indian Passport',
    UNKNOWN: 'Unknown Document',
  };

  /**
   * Minimum confidence threshold to accept an automatic document classification.
   * Below this, 'UNKNOWN' is returned so user is prompted to select or confirm.
   */
  public static readonly CONFIDENCE_THRESHOLD = 0.45;

  /**
   * Detects the document type from raw OCR text or text lines.
   *
   * @param rawText Full text extracted from OCR.
   * @returns DocumentDetectionResult containing type, label, confidence, and indicators.
   */
  public static detectDocumentType(rawText: string): DocumentDetectionResult {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return {
        documentType: 'UNKNOWN',
        label: this.DOCUMENT_LABELS.UNKNOWN,
        confidence: 0,
        indicators: [],
        rawText: '',
      };
    }

    const cleanText = rawText.toUpperCase();

    // 1. Evaluate Indian Passport
    const passportScore = this.evaluateIndianPassport(cleanText);

    // 2. Evaluate Oman Identity Card
    const omanIdScore = this.evaluateOmanID(cleanText);

    // 3. Evaluate Oman Driving Licence
    const omanDlScore = this.evaluateOmanDL(cleanText);

    const candidates = [passportScore, omanIdScore, omanDlScore];

    // Sort by confidence ratio (totalScore / maxScore)
    candidates.sort((a, b) => {
      const confA = a.maxScore > 0 ? a.totalScore / a.maxScore : 0;
      const confB = b.maxScore > 0 ? b.totalScore / b.maxScore : 0;
      return confB - confA;
    });

    const topCandidate = candidates[0];
    const topConfidence =
      topCandidate.maxScore > 0
        ? Math.min(topCandidate.totalScore / topCandidate.maxScore, 1.0)
        : 0;

    // Must exceed confidence threshold AND have at least 2 indicators (or 1 definitive indicator with weight >= 40)
    const hasDefinitiveMatch = topCandidate.indicators.some(
      (ind) => ind.matched && ind.weight >= 40
    );

    if (
      topConfidence >= this.CONFIDENCE_THRESHOLD &&
      (topCandidate.matchedCount >= 2 || hasDefinitiveMatch)
    ) {
      return {
        documentType: topCandidate.type,
        label: topCandidate.label,
        confidence: Math.round(topConfidence * 100) / 100,
        indicators: topCandidate.indicators,
        rawText,
      };
    }

    return {
      documentType: 'UNKNOWN',
      label: this.DOCUMENT_LABELS.UNKNOWN,
      confidence: Math.round(topConfidence * 100) / 100,
      indicators: topCandidate.indicators,
      rawText,
    };
  }

  /**
   * Evaluates indicators for Indian Passport.
   */
  private static evaluateIndianPassport(text: string): TypeScore {
    const indicators: DocumentTypeIndicator[] = [];

    // Indicator 1: MRZ code with P<IND (Definitive Indian Passport indicator)
    const hasMRZInd = /P<IND/i.test(text) || /P<[A-Z0-9<]*IND/i.test(text);
    indicators.push({
      name: 'MRZ code with P<IND',
      matched: hasMRZInd,
      weight: 50,
    });

    // Indicator 2: REPUBLIC OF INDIA or BHARAT SARKAR
    const hasRepublic =
      text.includes('REPUBLIC OF INDIA') ||
      text.includes('REPUBLIC OF') ||
      text.includes('BHARAT SARKAR') ||
      text.includes('भारत गणराज्य');
    indicators.push({
      name: 'Republic of India Header',
      matched: hasRepublic,
      weight: 25,
    });

    // Indicator 3: Keyword PASSPORT
    const hasPassportKeyword =
      text.includes('PASSPORT') ||
      text.includes('PASSPORT NO') ||
      text.includes('PASSPORT NUMBER');
    indicators.push({
      name: 'Keyword PASSPORT',
      matched: hasPassportKeyword,
      weight: 20,
    });

    // Indicator 4: Indian Passport Number format: 1 Letter followed by 7 digits
    const hasPassportNumberPattern = /\b[A-Z][0-9]{7}\b/.test(text);
    indicators.push({
      name: 'Passport Number Format (e.g. P1234567)',
      matched: hasPassportNumberPattern,
      weight: 15,
    });

    // Indicator 5: Common passport fields (GIVEN NAME, SURNAME, PLACE OF BIRTH)
    const hasPassportFields =
      (text.includes('GIVEN NAME') || text.includes('SURNAME')) &&
      (text.includes('PLACE OF BIRTH') || text.includes('DATE OF ISSUE'));
    indicators.push({
      name: 'Passport Specific Fields',
      matched: hasPassportFields,
      weight: 10,
    });

    const maxScore = indicators.reduce((acc, ind) => acc + ind.weight, 0);
    const totalScore = indicators.reduce(
      (acc, ind) => acc + (ind.matched ? ind.weight : 0),
      0
    );
    const matchedCount = indicators.filter((ind) => ind.matched).length;

    return {
      type: 'INDIAN_PASSPORT',
      label: this.DOCUMENT_LABELS.INDIAN_PASSPORT,
      totalScore,
      maxScore,
      matchedCount,
      indicators,
    };
  }

  /**
   * Evaluates indicators for Oman Identity Card.
   */
  private static evaluateOmanID(text: string): TypeScore {
    const indicators: DocumentTypeIndicator[] = [];

    // Indicator 1: SULTANATE OF OMAN
    const hasSultanate =
      text.includes('SULTANATE OF OMAN') ||
      text.includes('SULTANATE') ||
      text.includes('سلطنة عمان') ||
      text.includes('سلطنة عُمان');
    indicators.push({
      name: 'Sultanate of Oman Header',
      matched: hasSultanate,
      weight: 30,
    });

    // Indicator 2: IDENTITY CARD / ID CARD
    const hasIdentityCard =
      text.includes('IDENTITY CARD') ||
      text.includes('ID CARD') ||
      text.includes('RESIDENT CARD') ||
      text.includes('بطاقة شخصية') ||
      text.includes('بطاقة هوية') ||
      text.includes('بطاقة مقيم');
    indicators.push({
      name: 'Identity Card Title',
      matched: hasIdentityCard,
      weight: 30,
    });

    // Indicator 3: CIVIL NUMBER / CIVIL NO
    const hasCivilNumber =
      text.includes('CIVIL NUMBER') ||
      text.includes('CIVIL NO') ||
      text.includes('الرقم المدني') ||
      text.includes('CARD NO');
    indicators.push({
      name: 'Civil Number Label',
      matched: hasCivilNumber,
      weight: 25,
    });

    // Indicator 4: 8-digit numeric Civil Number pattern (standard Omani civil number)
    const hasCivilPattern = /\b\d{8}\b/.test(text);
    indicators.push({
      name: '8-Digit Civil Number Pattern',
      matched: hasCivilPattern,
      weight: 15,
    });

    // Exclude if it explicitly mentions Driving Licence or Police
    const hasPoliceOrDL =
      text.includes('DRIVING LICENCE') ||
      text.includes('DRIVING LICENSE') ||
      text.includes('ROYAL OMAN POLICE');

    const maxScore = indicators.reduce((acc, ind) => acc + ind.weight, 0);
    let totalScore = indicators.reduce(
      (acc, ind) => acc + (ind.matched ? ind.weight : 0),
      0
    );

    // Negative weight if DL keywords are present
    if (hasPoliceOrDL) {
      totalScore = Math.max(0, totalScore - 40);
    }

    const matchedCount = indicators.filter((ind) => ind.matched).length;

    return {
      type: 'OMAN_ID',
      label: this.DOCUMENT_LABELS.OMAN_ID,
      totalScore,
      maxScore,
      matchedCount,
      indicators,
    };
  }

  /**
   * Evaluates indicators for Oman Driving Licence.
   */
  private static evaluateOmanDL(text: string): TypeScore {
    const indicators: DocumentTypeIndicator[] = [];

    // Indicator 1: ROYAL OMAN POLICE / ROP
    const hasROP =
      text.includes('ROYAL OMAN POLICE') ||
      text.includes('ROYAL OMAN') ||
      text.includes('ROP') ||
      text.includes('شرطة عمان السلطانية');
    indicators.push({
      name: 'Royal Oman Police Header',
      matched: hasROP,
      weight: 35,
    });

    // Indicator 2: VEHICLE DRIVING LICENCE / DRIVING LICENCE
    const hasDrivingLicence =
      text.includes('VEHICLE DRIVING LICENCE') ||
      text.includes('VEHICLE DRIVING LICENSE') ||
      text.includes('DRIVING LICENCE') ||
      text.includes('DRIVING LICENSE') ||
      text.includes('DRIVER LICENCE') ||
      text.includes('رخصة سياقة') ||
      text.includes('رخصة قيادة');
    indicators.push({
      name: 'Driving Licence Title',
      matched: hasDrivingLicence,
      weight: 40,
    });

    // Indicator 3: SULTANATE OF OMAN
    const hasSultanate =
      text.includes('SULTANATE OF OMAN') ||
      text.includes('سلطنة عمان') ||
      text.includes('سلطنة عُمان');
    indicators.push({
      name: 'Sultanate of Oman Mention',
      matched: hasSultanate,
      weight: 15,
    });

    // Indicator 4: Directorate / Traffic indicators
    const hasTraffic =
      text.includes('TRAFFIC') ||
      text.includes('DIRECTORATE') ||
      text.includes('LICENCE NO') ||
      text.includes('LICENSE NO') ||
      text.includes('D/L NO') ||
      text.includes('VEHICLE');
    indicators.push({
      name: 'Traffic/Licence Terminology',
      matched: hasTraffic,
      weight: 10,
    });

    const maxScore = indicators.reduce((acc, ind) => acc + ind.weight, 0);
    const totalScore = indicators.reduce(
      (acc, ind) => acc + (ind.matched ? ind.weight : 0),
      0
    );
    const matchedCount = indicators.filter((ind) => ind.matched).length;

    return {
      type: 'OMAN_DL',
      label: this.DOCUMENT_LABELS.OMAN_DL,
      totalScore,
      maxScore,
      matchedCount,
      indicators,
    };
  }
}
