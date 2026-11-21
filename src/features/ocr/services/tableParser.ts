import { TableStructure, TextBlock, TextLine } from '../model/types';

/**
 * Reconstructs a 2D structured table (headers & rows) from ML Kit lines and spatial bounding boxes.
 * Runs 100% offline on-device using coordinate geometry.
 */
export function reconstructTableFromBlocks(blocks: TextBlock[], fullText: string): TableStructure {
  if (!blocks || blocks.length === 0) {
    return createFallbackTable(fullText);
  }

  // Flatten all lines across blocks
  const allLines: TextLine[] = [];
  for (const block of blocks) {
    if (block.lines && block.lines.length > 0) {
      allLines.push(...block.lines);
    }
  }

  if (allLines.length === 0) {
    return createFallbackTable(fullText);
  }

  // Sort lines top-to-bottom
  const sortedLines = [...allLines].sort((a, b) => {
    const topA = a.frame?.top ?? 0;
    const topB = b.frame?.top ?? 0;
    return topA - topB;
  });

  // Group lines that are vertically aligned into the same row (within 60% of average line height)
  const rowsGrouped: TextLine[][] = [];
  for (const line of sortedLines) {
    const lineTop = line.frame?.top ?? 0;
    const lineHeight = line.frame?.height ?? 20;

    let placed = false;
    for (const group of rowsGrouped) {
      const groupTop = group[0].frame?.top ?? 0;
      const groupHeight = group[0].frame?.height ?? lineHeight;
      const verticalDiff = Math.abs(lineTop - groupTop);

      // If lines share almost the same vertical baseline, they belong to the same table row
      if (verticalDiff <= Math.max(groupHeight, lineHeight) * 0.65) {
        group.push(line);
        placed = true;
        break;
      }
    }

    if (!placed) {
      rowsGrouped.push([line]);
    }
  }

  // Convert each row group into ordered column cells from left to right
  const rawRows: string[][] = [];
  for (const rowGroup of rowsGrouped) {
    // Sort cells left to right
    const sortedRow = [...rowGroup].sort((a, b) => {
      const leftA = a.frame?.left ?? 0;
      const leftB = b.frame?.left ?? 0;
      return leftA - leftB;
    });

    const cells: string[] = [];
    for (const item of sortedRow) {
      // If line has multiple elements separated horizontally, split them
      if (item.elements && item.elements.length > 1) {
        // Sort elements by left position
        const sortedElements = [...item.elements].sort((a, b) => (a.frame?.left ?? 0) - (b.frame?.left ?? 0));
        for (const el of sortedElements) {
          const trimmed = el.text.trim();
          if (trimmed.length > 0) {
            cells.push(trimmed);
          }
        }
      } else {
        const trimmed = item.text.trim();
        if (trimmed.length > 0) {
          // If the text line contains multiple spaces or tabs, split into columns
          const parts = trimmed.split(/\s{2,}|\t/);
          if (parts.length > 1) {
            cells.push(...parts);
          } else {
            cells.push(trimmed);
          }
        }
      }
    }

    if (cells.length > 0) {
      rawRows.push(cells);
    }
  }

  if (rawRows.length === 0) {
    return createFallbackTable(fullText);
  }

  // Determine max column count
  const maxCols = Math.max(...rawRows.map((r) => r.length));

  // If table has multiple columns
  if (maxCols > 1 && rawRows.length > 1) {
    const headers = rawRows[0].map((h, idx) => (h ? h : `Column ${idx + 1}`));
    // Pad headers if shorter than maxCols
    while (headers.length < maxCols) {
      headers.push(`Column ${headers.length + 1}`);
    }

    // Remaining rows
    const dataRows = rawRows.slice(1).map((row) => {
      const padded = [...row];
      while (padded.length < maxCols) {
        padded.push('-');
      }
      return padded;
    });

    return {
      headers,
      rows: dataRows,
    };
  }

  // Single-column or linear document fallback
  return createFallbackTable(fullText);
}

function createFallbackTable(fullText: string): TableStructure {
  const lines = fullText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      headers: ['Item #', 'Text Content'],
      rows: [['1', 'No text detected']],
    };
  }

  return {
    headers: ['Line #', 'Extracted Content'],
    rows: lines.map((line, idx) => [`${idx + 1}`, line]),
  };
}
