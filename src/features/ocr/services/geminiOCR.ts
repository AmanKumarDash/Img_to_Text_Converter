import { OCRResult } from '../model/types';

/**
 * Converts a local file URI (from camera or gallery) into a base64 string
 */
export async function uriToBase64(uri: string): Promise<{ base64Data: string; mimeType: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const mimeType = blob.type || 'image/jpeg';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = dataUrl.split(',')[1] || dataUrl;
      resolve({ base64Data, mimeType });
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Calls Gemini Vision API to extract text and structured table data
 */
export async function extractWithGemini(
  imageUri: string,
  apiKey: string
): Promise<OCRResult> {
  const { base64Data, mimeType } = await uriToBase64(imageUri);

  const prompt = `Analyze this image for OCR and document table extraction.
1. Extract all text clearly and accurately as 'rawText'.
2. If the image contains a table, receipt, bill, ledger, or tabular structure, extract it into 'headers' (array of column names) and 'rows' (array of row arrays).
If no clear table exists, create a simple 2-column or 1-column table containing the detected items/lines.

Respond ONLY with valid JSON in this exact structure without markdown backticks:
{
  "rawText": "Extracted text line by line...",
  "table": {
    "headers": ["Item / Description", "Qty", "Price", "Total"],
    "rows": [
      ["Row 1 Col 1", "1", "$10.00", "$10.00"],
      ["Row 2 Col 1", "2", "$20.00", "$40.00"]
    ]
  }
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const textOutput =
    json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Clean output if markdown fences were added
  let cleaned = textOutput.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      rawText: parsed.rawText || textOutput,
      table: parsed.table || {
        headers: ['Line', 'Extracted Content'],
        rows: (parsed.rawText || textOutput)
          .split('\n')
          .filter((l: string) => l.trim().length > 0)
          .map((line: string, idx: number) => [`${idx + 1}`, line]),
      },
      engine: 'gemini',
      timestamp: new Date().toISOString(),
    };
  } catch (parseError) {
    console.warn('Failed to parse Gemini JSON output, falling back to raw text:', parseError);
    return {
      rawText: textOutput,
      table: {
        headers: ['Line', 'Content'],
        rows: textOutput
          .split('\n')
          .filter((l: string) => l.trim().length > 0)
          .map((l: string, i: number) => [`${i + 1}`, l]),
      },
      engine: 'gemini',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Fallback/Test Mock OCR for instant demo & testing without needing an API key upfront
 */
export async function extractWithTestMock(imageUri: string): Promise<OCRResult> {
  // Simulate network/OCR latency for realistic feel
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    rawText: `INVOICE #INV-2026-0042\nDate: 21-Nov-2026\nVendor: Global Tech Supplies Ltd.\n\nDescription           Qty    Rate       Total\n---------------------------------------------\nWireless Barcode Scanner  2   $145.00   $290.00\nThermal Receipt Rolls    10    $4.50     $45.00\nUSB-C Docking Station     1   $89.99     $89.99\nExport Quality Cable Set  3   $12.50     $37.50\n---------------------------------------------\nSubtotal:                                $462.49\nTax (8%):                                 $37.00\nTotal Due:                               $499.49\n\nThank you for your business!`,
    table: {
      headers: ['Description', 'Qty', 'Rate', 'Total'],
      rows: [
        ['Wireless Barcode Scanner', '2', '$145.00', '$290.00'],
        ['Thermal Receipt Rolls', '10', '$4.50', '$45.00'],
        ['USB-C Docking Station', '1', '$89.99', '$89.99'],
        ['Export Quality Cable Set', '3', '$12.50', '$37.50'],
        ['Tax (8%)', '1', '$37.00', '$37.00'],
        ['Total Balance Due', '-', '-', '$499.49'],
      ],
    },
    engine: 'mock-test',
    timestamp: new Date().toISOString(),
  };
}
