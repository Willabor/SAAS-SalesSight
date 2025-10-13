/**
 * Size Type Auto-Detection System
 * Phase 0: Vendor Prepack Configuration
 *
 * Analyzes size patterns from existing inventory to automatically detect
 * the size type for a vendor (jeans, apparel, shoes, numeric, onesize).
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export type SizeType = 'jeans' | 'apparel' | 'shoes' | 'numeric' | 'onesize';

export interface SizeTypeDetectionResult {
  detectedType: SizeType;
  confidence: number; // 0.0 to 1.0
  samplesAnalyzed: number;
  matchedSamples: number;
  explanation: string;
  sizeBreakdown: {
    jeans: number;
    apparel: number;
    shoes: number;
    numeric: number;
    onesize: number;
  };
}

/**
 * Size Type Patterns
 * These regex patterns identify different size types from the database
 */
const SIZE_PATTERNS = {
  // Jeans: "30W×32L", "32W×34L", "28W", "36×32", etc.
  jeans: [
    /^\d{2,3}W\s*[×x]\s*\d{2,3}L$/i,  // 30W×32L, 32W×34L
    /^\d{2,3}W$/i,                      // 30W, 32W
    /^\d{2,3}\s*[×x]\s*\d{2,3}$/,       // 30×32, 32×34
    /^\d{2,3}\/\d{2,3}$/,               // 30/32, 32/34
  ],

  // Apparel: "S", "M", "L", "XL", "2XL", "Small", "Medium", "Large", "X-Large", etc.
  apparel: [
    /^(XXS|XS|S|M|L|XL|XXL|XXXL|\dXL)$/i,                           // S, M, L, XL, 2XL, 3XL
    /^(XXS|XS|S|M|L|XL|XXL)\/(XXS|XS|S|M|L|XL|XXL)$/i,             // S/M, L/XL
    /^(Small|Medium|Large)$/i,                                       // Small, Medium, Large
    /^X{1,3}-(Small|Large)$/i,                                       // X-Small, XX-Small, X-Large, XX-Large, XXX-Large
    /^X{1,3}(Small|Large)$/i,                                        // XSmall, XXSmall, XLarge, XXLarge, XXXLarge
  ],

  // Shoes: "8", "8.5", "9", "10.5", "7-8", etc. (more strict to avoid matching small numbers)
  shoes: [
    /^\d{1,2}\.\d$/,                    // 8.5, 10.5 (must have decimal)
    /^\d{1,2}-\d{1,2}$/,                // 7-8, 9-10
    /^US\s*\d{1,2}(\.\d)?$/i,           // US 8, US 10.5
  ],

  // Numeric: Plain numbers for non-shoe items (e.g., "24", "28", "32" for waist-only, or sizes like 10, 12, 14)
  numeric: [
    /^\d{1,2}$/,                        // Single/double digit: 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36
  ],

  // One Size: "OS", "ONE SIZE", "OSFA", "Free", etc.
  onesize: [
    /^(OS|OSFA|ONE\s*SIZE|FREE|N\/?A)$/i,
  ],
};

/**
 * Analyzes a single size value and returns which type it matches
 */
function classifySizeValue(size: string | null): SizeType | null {
  if (!size || size.trim() === '') return null;

  const normalized = size.trim();

  // Check each pattern type
  for (const pattern of SIZE_PATTERNS.jeans) {
    if (pattern.test(normalized)) return 'jeans';
  }

  for (const pattern of SIZE_PATTERNS.apparel) {
    if (pattern.test(normalized)) return 'apparel';
  }

  for (const pattern of SIZE_PATTERNS.shoes) {
    if (pattern.test(normalized)) return 'shoes';
  }

  for (const pattern of SIZE_PATTERNS.onesize) {
    if (pattern.test(normalized)) return 'onesize';
  }

  for (const pattern of SIZE_PATTERNS.numeric) {
    if (pattern.test(normalized)) return 'numeric';
  }

  return null;
}

/**
 * Auto-detect size type for a vendor by analyzing their inventory
 *
 * @param vendorName - The vendor name to analyze
 * @returns Detection result with confidence score
 */
export async function detectSizeType(vendorName: string): Promise<SizeTypeDetectionResult> {
  // Query all unique sizes for this vendor
  const result = await db.execute(sql`
    SELECT DISTINCT size
    FROM item_list
    WHERE vendor_name = ${vendorName}
      AND size IS NOT NULL
      AND size != ''
    LIMIT 1000
  `);

  const sizes = result.rows.map((row: any) => row.size);
  const samplesAnalyzed = sizes.length;

  if (samplesAnalyzed === 0) {
    return {
      detectedType: 'numeric', // Default fallback
      confidence: 0.0,
      samplesAnalyzed: 0,
      matchedSamples: 0,
      explanation: 'No size data found for this vendor',
      sizeBreakdown: {
        jeans: 0,
        apparel: 0,
        shoes: 0,
        numeric: 0,
        onesize: 0,
      },
    };
  }

  // Classify each size
  const breakdown: Record<SizeType, number> = {
    jeans: 0,
    apparel: 0,
    shoes: 0,
    numeric: 0,
    onesize: 0,
  };

  let matchedCount = 0;

  for (const size of sizes) {
    const classification = classifySizeValue(size);
    if (classification) {
      breakdown[classification]++;
      matchedCount++;
    }
  }

  // Find the dominant type
  const entries = Object.entries(breakdown) as [SizeType, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const [detectedType, maxCount] = sorted[0];

  // Calculate confidence
  // High confidence if >70% of samples match the detected type
  // Medium confidence if 40-70% match
  // Low confidence if <40% match
  const confidence = matchedCount > 0 ? maxCount / samplesAnalyzed : 0.0;

  // Generate explanation
  let explanation = '';
  if (confidence >= 0.7) {
    explanation = `High confidence (${(confidence * 100).toFixed(1)}%): ${maxCount} of ${samplesAnalyzed} sizes match ${detectedType} pattern.`;
  } else if (confidence >= 0.4) {
    explanation = `Medium confidence (${(confidence * 100).toFixed(1)}%): ${maxCount} of ${samplesAnalyzed} sizes match ${detectedType} pattern. Manual review recommended.`;
  } else if (matchedCount > 0) {
    explanation = `Low confidence (${(confidence * 100).toFixed(1)}%): Only ${maxCount} of ${samplesAnalyzed} sizes match ${detectedType} pattern. Manual review required.`;
  } else {
    explanation = `No recognizable size patterns found. Defaulting to ${detectedType}. Manual configuration required.`;
  }

  return {
    detectedType,
    confidence: parseFloat(confidence.toFixed(2)),
    samplesAnalyzed,
    matchedSamples: matchedCount,
    explanation,
    sizeBreakdown: breakdown,
  };
}

/**
 * Get sample sizes for a vendor (for debugging/verification)
 */
export async function getVendorSizeSamples(vendorName: string, limit: number = 20): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT size
    FROM item_list
    WHERE vendor_name = ${vendorName}
      AND size IS NOT NULL
      AND size != ''
    ORDER BY size
    LIMIT ${limit}
  `);

  return result.rows.map((row: any) => row.size);
}

/**
 * Get all vendors that need size type detection
 */
export async function getVendorsNeedingSizeDetection(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT vendor_name
    FROM item_list
    WHERE vendor_name IS NOT NULL
      AND vendor_name != ''
    ORDER BY vendor_name
  `);

  return result.rows.map((row: any) => row.vendor_name);
}
