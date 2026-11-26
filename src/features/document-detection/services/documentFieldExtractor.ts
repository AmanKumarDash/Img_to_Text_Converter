import { ExtractedDocumentFields, SupportedDocumentType } from '../model/types';

/**
 * Service for extracting structured identity fields from raw OCR text based on the detected document type.
 * Ensures zero hallucinations, preserves string formats with leading zeros, and leaves missing fields blank.
 */
export class DocumentFieldExtractor {
  /**
   * Main entry point to extract document fields.
   *
   * @param documentType Detected or user-selected document type.
   * @param rawText Full text from OCR.
   * @returns Normalized ExtractedDocumentFields.
   */
  public static extractFields(
    documentType: SupportedDocumentType,
    rawText: string
  ): ExtractedDocumentFields {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return this.createEmptyFields();
    }

    switch (documentType) {
      case 'INDIAN_PASSPORT':
        return this.extractIndianPassportFields(rawText);
      case 'OMAN_ID':
        return this.extractOmanIdFields(rawText);
      case 'OMAN_DL':
        return this.extractOmanDlFields(rawText);
      case 'UNKNOWN':
      default:
        return this.extractGenericFields(rawText);
    }
  }

  /**
   * Extracts and merges fields from both front and back sides of an identity document.
   * If backText is omitted, empty, or null, performs single-sided extraction.
   *
   * @param documentType Detected or user-selected document type.
   * @param frontText OCR text from the front side.
   * @param backText Optional OCR text from the back side.
   * @returns Unified ExtractedDocumentFields.
   */
  public static extractDualSideFields(
    documentType: SupportedDocumentType,
    frontText: string,
    backText?: string | null
  ): ExtractedDocumentFields {
    const frontFields = this.extractFields(documentType, frontText || '');

    if (!backText || typeof backText !== 'string' || backText.trim().length === 0) {
      return frontFields;
    }

    const backFields = this.extractFields(documentType, backText);
    return this.mergeFields(frontFields, backFields, documentType);
  }

  /**
   * Merges fields from front and back sides using document-aware conflict resolution.
   */
  public static mergeFields(
    front: ExtractedDocumentFields,
    back: ExtractedDocumentFields,
    docType: SupportedDocumentType
  ): ExtractedDocumentFields {
    return {
      // Name: Front side is authoritative (MRZ, official header)
      fullName: front.fullName || back.fullName || '',

      // Document Number: Front side is authoritative (Civil No, Passport No, DL No)
      documentNumber: front.documentNumber || back.documentNumber || '',

      // Date of Birth: Either side (prefer front if present)
      dateOfBirth: front.dateOfBirth || back.dateOfBirth || '',

      // Nationality: Prefer specific nationality over empty
      nationality: front.nationality || back.nationality || '',

      // Issue Date: Back side often carries Issue Date on Oman IDs; take whichever is valid
      issueDate: front.issueDate || back.issueDate || '',

      // Expiry Date: Either side
      expiryDate: front.expiryDate || back.expiryDate || '',

      // Gender: Either side
      gender: front.gender || back.gender || '',

      // Address: Back side is authoritative for Indian Passports and Oman IDs
      address: back.address || front.address || '',
    };
  }

  /**
   * Extracts fields from an Indian Passport using MRZ (Machine Readable Zone) when present,
   * falling back to label-based heuristics.
   */
  public static extractIndianPassportFields(rawText: string): ExtractedDocumentFields {
    const fields = this.createEmptyFields();
    fields.nationality = 'Indian';

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 1. Try Machine Readable Zone (MRZ) parsing
    const mrzLines = lines.filter((l) => {
      const clean = l.replace(/\s+/g, '');
      return (
        clean.startsWith('P<IND') ||
        (clean.includes('IND') && clean.length >= 30 && clean.includes('<'))
      );
    });

    if (mrzLines.length >= 2) {
      const line1 = mrzLines[0].replace(/\s+/g, '');
      const line2 = mrzLines[1].replace(/\s+/g, '');

      // Parse Name from Line 1 (P<INDSURNAME<<GIVEN<NAMES...)
      const indIndex = line1.indexOf('IND');
      if (indIndex !== -1) {
        const namePart = line1.slice(indIndex + 3);
        const nameSections = namePart.split('<<');
        const surname = (nameSections[0] || '').replace(/</g, ' ').trim();
        const givenNames = (nameSections[1] || '').replace(/</g, ' ').trim();

        if (givenNames && surname) {
          fields.fullName = `${givenNames} ${surname}`;
        } else if (givenNames || surname) {
          fields.fullName = givenNames || surname;
        }
      }

      // Parse Line 2: Passport No (chars 0-9), DOB (chars 13-19), Sex (char 20), Expiry (chars 21-27)
      if (line2.length >= 28) {
        // Document Number (chars 0-8/9)
        const docNumMatch = line2.match(/^([A-Z][0-9]{7})/);
        if (docNumMatch) {
          fields.documentNumber = docNumMatch[1];
        }

        // DOB (6 digits: YYMMDD)
        const dobMatch = line2.slice(13, 19).match(/^([0-9]{2})([0-9]{2})([0-9]{2})$/);
        if (dobMatch) {
          const yy = parseInt(dobMatch[1], 10);
          const mm = dobMatch[2];
          const dd = dobMatch[3];
          const fullYear = yy > 35 ? `19${dobMatch[1]}` : `20${dobMatch[1]}`;
          fields.dateOfBirth = `${dd}-${mm}-${fullYear}`;
        }

        // Gender (char 20: M or F)
        const sexChar = line2.charAt(20).toUpperCase();
        if (sexChar === 'M') fields.gender = 'Male';
        else if (sexChar === 'F') fields.gender = 'Female';

        // Expiry Date (6 digits: YYMMDD)
        const expMatch = line2.slice(21, 27).match(/^([0-9]{2})([0-9]{2})([0-9]{2})$/);
        if (expMatch) {
          const mm = expMatch[2];
          const dd = expMatch[3];
          fields.expiryDate = `${dd}-${mm}-20${expMatch[1]}`;
        }
      }
    }

    // 2. Visual fields extraction / fallback
    if (!fields.documentNumber) {
      // Look for standard Indian passport number: 1 letter followed by 7 digits
      const passMatch = rawText.match(/\b([A-Z][0-9]{7})\b/);
      if (passMatch) {
        fields.documentNumber = passMatch[1];
      }
    }

    if (!fields.fullName) {
      // Extract from Given Name(s) and Surname
      const givenMatch = rawText.match(
        /(?:Given\s*Name\(?s?\)?|Name)\s*[:\-\.]?\s*([A-Za-z\s]+)/i
      );
      const surMatch = rawText.match(/Surname\s*[:\-\.]?\s*([A-Za-z\s]+)/i);

      if (givenMatch && surMatch) {
        fields.fullName = `${cleanName(givenMatch[1])} ${cleanName(surMatch[1])}`.trim();
      } else if (givenMatch) {
        fields.fullName = cleanName(givenMatch[1]);
      } else {
        // Look for all-caps personal name line
        fields.fullName = findNameInLines(lines, ['REPUBLIC', 'INDIA', 'PASSPORT', 'MINISTRY']);
      }
    }

    if (!fields.dateOfBirth) {
      const dobMatch = rawText.match(
        /(?:Date\s*of\s*Birth|DOB)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
      );
      if (dobMatch) {
        fields.dateOfBirth = normalizeDate(dobMatch[1]);
      }
    }

    if (!fields.issueDate) {
      const issueMatch = rawText.match(
        /(?:Date\s*of\s*Issue|Issue\s*Date)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
      );
      if (issueMatch) {
        fields.issueDate = normalizeDate(issueMatch[1]);
      }
    }

    if (!fields.expiryDate) {
      const expMatch = rawText.match(
        /(?:Date\s*of\s*Expiry|Expiry\s*Date)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
      );
      if (expMatch) {
        fields.expiryDate = normalizeDate(expMatch[1]);
      }
    }

    if (!fields.gender) {
      if (/\b(?:Sex|Gender)\s*[:\-\.]?\s*M(?:ALE)?\b/i.test(rawText)) {
        fields.gender = 'Male';
      } else if (/\b(?:Sex|Gender)\s*[:\-\.]?\s*F(?:EMALE)?\b/i.test(rawText)) {
        fields.gender = 'Female';
      }
    }

    // Address (if available, e.g. on passport back page)
    const addrMatch = rawText.match(/Address\s*[:\-\.]?\s*([^\n\r]+(?:\n[^\n\r]+){0,2})/i);
    if (addrMatch) {
      fields.address = addrMatch[1].replace(/\n+/g, ', ').trim();
    }

    return fields;
  }

  /**
   * Extracts fields from an Oman Identity Card.
   */
  public static extractOmanIdFields(rawText: string): ExtractedDocumentFields {
    const fields = this.createEmptyFields();
    fields.nationality = 'Omani';

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 1. Civil Number (Document Number)
    // Oman Civil number is an 8-digit numeric identifier (e.g. 13808513 or 00123456)
    const civilLabelMatch = rawText.match(
      /(?:Civil\s*No\.?|Civil\s*Number|الرقم\s*المدني)\s*[:\-\.]?\s*(\d{7,9})/i
    );

    if (civilLabelMatch) {
      fields.documentNumber = civilLabelMatch[1].trim();
    } else {
      // Find standalone 8-digit number
      const eightDigitMatch = rawText.match(/\b(\d{8})\b/);
      if (eightDigitMatch) {
        fields.documentNumber = eightDigitMatch[1].trim();
      }
    }

    // 2. Full Name
    const nameLabelMatch = rawText.match(
      /(?:Name|Full\s*Name|الاسم)\s*[:\-\.]?\s*([A-Za-z\s]+)/i
    );
    if (nameLabelMatch) {
      fields.fullName = cleanName(nameLabelMatch[1]);
    } else {
      // Search for English name line in all caps
      fields.fullName = findNameInLines(lines, [
        'SULTANATE',
        'OMAN',
        'IDENTITY',
        'CARD',
        'CIVIL',
        'NUMBER',
        'DIRECTORATE',
      ]);
    }

    // 3. Date of Birth
    const dobMatch = rawText.match(
      /(?:Date\s*of\s*Birth|DOB|تاريخ\s*الميلاد)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
    );
    if (dobMatch) {
      fields.dateOfBirth = normalizeDate(dobMatch[1]);
    }

    // 4. Expiry Date
    const expMatch = rawText.match(
      /(?:Expiry\s*Date|Date\s*of\s*Expiry|Exp\.?\s*Date|تاريخ\s*الانتهاء)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
    );
    if (expMatch) {
      fields.expiryDate = normalizeDate(expMatch[1]);
    }

    // 5. Issue Date
    const issueMatch = rawText.match(
      /(?:Issue\s*Date|Date\s*of\s*Issue|تاريخ\s*الاصدار)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
    );
    if (issueMatch) {
      fields.issueDate = normalizeDate(issueMatch[1]);
    }

    // 6. Nationality
    const natMatch = rawText.match(/(?:Nationality|الجنسية)\s*[:\-\.]?\s*([A-Za-z]+)/i);
    if (natMatch) {
      fields.nationality = natMatch[1].trim();
    }

    // 7. Gender
    if (/\b(?:Sex|Gender|النوع|الجنس)\s*[:\-\.]?\s*(?:M|MALE|ذكر)\b/i.test(rawText)) {
      fields.gender = 'Male';
    } else if (/\b(?:Sex|Gender|النوع|الجنس)\s*[:\-\.]?\s*(?:F|FEMALE|أنثى)\b/i.test(rawText)) {
      fields.gender = 'Female';
    }

    // 8. Address / Wilayat
    const addrMatch = rawText.match(/(?:Address|Wilayat|Governorate)\s*[:\-\.]?\s*([A-Za-z\s]+)/i);
    if (addrMatch) {
      fields.address = addrMatch[1].trim();
    }

    return fields;
  }

  /**
   * Extracts fields from an Oman Driving Licence.
   */
  public static extractOmanDlFields(rawText: string): ExtractedDocumentFields {
    const fields = this.createEmptyFields();
    fields.nationality = 'Omani';

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 1. Driving Licence Number (Document Number)
    const dlMatch = rawText.match(
      /(?:Licence\s*No\.?|License\s*No\.?|D\/L\s*No\.?|رقم\s*الرخصة)\s*[:\-\.]?\s*([A-Z0-9]{5,12})/i
    );
    if (dlMatch) {
      fields.documentNumber = dlMatch[1].trim();
    } else {
      // Find 6-8 digit number or alphanumeric driving licence code
      const numMatch = rawText.match(/\b(DL[0-9]{5,8}|[0-9]{6,8})\b/i);
      if (numMatch) {
        fields.documentNumber = numMatch[1].trim();
      }
    }

    // 2. Full Name
    const nameMatch = rawText.match(/(?:Name|الاسم)\s*[:\-\.]?\s*([A-Za-z\s]+)/i);
    if (nameMatch) {
      fields.fullName = cleanName(nameMatch[1]);
    } else {
      fields.fullName = findNameInLines(lines, [
        'ROYAL',
        'OMAN',
        'POLICE',
        'VEHICLE',
        'DRIVING',
        'LICENCE',
        'LICENSE',
        'TRAFFIC',
      ]);
    }

    // 3. Date of Birth
    const dobMatch = rawText.match(
      /(?:Date\s*of\s*Birth|DOB|تاريخ\s*الميلاد)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
    );
    if (dobMatch) {
      fields.dateOfBirth = normalizeDate(dobMatch[1]);
    }

    // 4. Issue Date
    const issueMatch = rawText.match(
      /(?:Date\s*of\s*Issue|Issue\s*Date|تاريخ\s*الاصدار)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
    );
    if (issueMatch) {
      fields.issueDate = normalizeDate(issueMatch[1]);
    }

    // 5. Expiry Date
    const expMatch = rawText.match(
      /(?:Date\s*of\s*Expiry|Expiry\s*Date|تاريخ\s*الانتهاء)\s*[:\-\.]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
    );
    if (expMatch) {
      fields.expiryDate = normalizeDate(expMatch[1]);
    }

    // 6. Nationality
    const natMatch = rawText.match(/(?:Nationality|الجنسية)\s*[:\-\.]?\s*([A-Za-z]+)/i);
    if (natMatch) {
      fields.nationality = natMatch[1].trim();
    }

    // 7. Gender
    if (/\b(?:Sex|Gender|النوع)\s*[:\-\.]?\s*(?:M|MALE|ذكر)\b/i.test(rawText)) {
      fields.gender = 'Male';
    } else if (/\b(?:Sex|Gender|النوع)\s*[:\-\.]?\s*(?:F|FEMALE|أنثى)\b/i.test(rawText)) {
      fields.gender = 'Female';
    }

    return fields;
  }

  /**
   * Generic fallback extraction for unknown or unclassified documents.
   */
  public static extractGenericFields(rawText: string): ExtractedDocumentFields {
    const fields = this.createEmptyFields();

    // Look for any date pattern
    const dates = rawText.match(/\b([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})\b/g) || [];
    if (dates.length >= 1 && dates[0]) fields.dateOfBirth = normalizeDate(dates[0]);
    if (dates.length >= 2 && dates[1]) fields.expiryDate = normalizeDate(dates[1]);

    // Look for any identifier (alphanumeric 6-12 chars)
    const idMatch = rawText.match(/\b([A-Z0-9]{6,12})\b/);
    if (idMatch) fields.documentNumber = idMatch[1];

    // Search for a candidate name line
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    fields.fullName = findNameInLines(lines, ['DOCUMENT', 'CARD', 'REPUBLIC', 'SULTANATE']);

    return fields;
  }

  /**
   * Creates an empty fields structure with all strings initialized to "".
   */
  public static createEmptyFields(): ExtractedDocumentFields {
    return {
      fullName: '',
      dateOfBirth: '',
      documentNumber: '',
      nationality: '',
      issueDate: '',
      expiryDate: '',
      gender: '',
      address: '',
    };
  }
}

/**
 * Normalizes dates to DD-MM-YYYY format.
 */
function normalizeDate(rawDate?: string): string {
  if (!rawDate) return '';
  const clean = rawDate.replace(/\//g, '-').trim();
  const parts = clean.split('-');

  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];

    if (year.length === 2) {
      const yNum = parseInt(year, 10);
      year = yNum > 40 ? `19${year}` : `20${year}`;
    }

    return `${day}-${month}-${year}`;
  }

  return clean;
}

/**
 * Cleans extracted name string by removing non-alphabetic noise.
 */
function cleanName(raw: string): string {
  return raw
    .replace(/[^A-Za-z\s\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds a suitable name line among OCR text lines by filtering out known document headers.
 */
function findNameInLines(lines: string[], excludedKeywords: string[]): string {
  for (const line of lines) {
    const upper = line.toUpperCase();
    const hasExcluded = excludedKeywords.some((kw) => upper.includes(kw));

    if (!hasExcluded && /^[A-Z][A-Za-z\s\-\.]{4,40}$/.test(line)) {
      // Must contain at least two words (first and last name)
      const words = line.trim().split(/\s+/);
      if (words.length >= 2 && words.length <= 5) {
        return cleanName(line);
      }
    }
  }
  return '';
}
