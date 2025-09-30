// Inventory Turnover Settings Configuration

export interface InventorySettings {
  // Display & Export Limits
  slowMovingLimit: number;        // Max items to show in slow moving table
  stockAnalysisLimit: number;     // Max items to show in stock analysis table

  // Dead Stock Thresholds (days)
  deadStockDays: number;          // Items not sold in X days = "Dead Stock" (default: 180)
  slowMovingDays: number;         // Items not sold in X days = "Slow Moving" (default: 90)

  // Stock Analysis Thresholds
  salesAnalysisDays: number;      // Days of sales data to analyze (default: 30)
  overstockDays: number;          // Days of supply = "Overstock" (default: 90)
  understockDays: number;         // Days of supply = "Understock" (default: 7)

  // Category Analysis
  categoryAnalysisDays: number;   // Days for turnover calculation (default: 30)
}

export const DEFAULT_SETTINGS: InventorySettings = {
  // Display & Export Limits
  slowMovingLimit: 100,
  stockAnalysisLimit: 100,

  // Dead Stock Thresholds
  deadStockDays: 180,
  slowMovingDays: 90,

  // Stock Analysis
  salesAnalysisDays: 30,
  overstockDays: 90,
  understockDays: 7,

  // Category Analysis
  categoryAnalysisDays: 30,
};

const STORAGE_KEY = 'inventory-turnover-settings';

/**
 * Load settings from localStorage
 */
export function loadSettings(): InventorySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: InventorySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): InventorySettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Validate settings values
 */
export function validateSettings(settings: Partial<InventorySettings>): string[] {
  const errors: string[] = [];

  if (settings.slowMovingLimit !== undefined && (settings.slowMovingLimit < 1 || settings.slowMovingLimit > 1000)) {
    errors.push('Slow Moving Limit must be between 1 and 1000');
  }

  if (settings.stockAnalysisLimit !== undefined && (settings.stockAnalysisLimit < 1 || settings.stockAnalysisLimit > 1000)) {
    errors.push('Stock Analysis Limit must be between 1 and 1000');
  }

  if (settings.deadStockDays !== undefined && (settings.deadStockDays < 1 || settings.deadStockDays > 365)) {
    errors.push('Dead Stock Days must be between 1 and 365');
  }

  if (settings.slowMovingDays !== undefined && (settings.slowMovingDays < 1 || settings.slowMovingDays > 365)) {
    errors.push('Slow Moving Days must be between 1 and 365');
  }

  if (settings.salesAnalysisDays !== undefined && (settings.salesAnalysisDays < 1 || settings.salesAnalysisDays > 365)) {
    errors.push('Sales Analysis Days must be between 1 and 365');
  }

  if (settings.overstockDays !== undefined && (settings.overstockDays < 1 || settings.overstockDays > 365)) {
    errors.push('Overstock Days must be between 1 and 365');
  }

  if (settings.understockDays !== undefined && (settings.understockDays < 1 || settings.understockDays > 90)) {
    errors.push('Understock Days must be between 1 and 90');
  }

  if (settings.categoryAnalysisDays !== undefined && (settings.categoryAnalysisDays < 1 || settings.categoryAnalysisDays > 365)) {
    errors.push('Category Analysis Days must be between 1 and 365');
  }

  return errors;
}
