# Documentation Index

This directory contains all project documentation organized by category.

**Last Updated:** January 2025

---

## 📁 Directory Structure

```
docs/
├── deployment/              # Deployment & hosting guides
├── implementation-status/   # Implementation progress tracking
├── integrations/           # Feature integration guides
├── reports/                # Data analysis & discrepancy reports
├── technical-guides/       # Technical documentation & fixes
├── planning/               # Project planning documents
├── multi-dimensional-segmentation/  # Multi-dimensional feature docs
├── Quickbooks POS Reports/ # QuickBooks POS report templates
└── [vendor-prepack docs]   # Vendor configuration system docs

scripts/
├── analysis/               # Data analysis scripts (14 files)
├── verification/           # Testing & validation scripts (17 files)
└── debugging/              # Debugging utilities (12 files)

test-data/
└── test-vendors-import.csv # Sample test data
```

---

## 🚀 Deployment

**Location:** `deployment/`

| File | Description |
|------|-------------|
| **DEPLOYMENT.md** | Complete deployment guide with ML service |
| **GITHUB_DEPLOYMENT_QUICKSTART.md** | Quick deploy to GitHub/Vercel/Netlify |
| **ML_SERVICE_DEPLOYMENT_LOG.md** | ML service deployment history & issues |
| **RAILWAY_SETTINGS_CHECKLIST.md** | Railway.app deployment checklist |
| **REPLIT_SETUP.md** | Replit-specific setup instructions |
| **replit.md** | Replit configuration guide |

**Start Here:** `DEPLOYMENT.md` for comprehensive deployment guide

---

## 📊 Implementation Status

**Location:** `implementation-status/`

| File | Description |
|------|-------------|
| **IMPLEMENTATION_STATUS.md** | Multi-dimensional segmentation status (80% complete) |
| **IMPLEMENTATION_PLAN.md** | Overall project implementation roadmap |
| **PHASE_2_IMPLEMENTATION_SUMMARY.md** | Phase 2 completion summary |
| **PROGRESS_UPDATE.md** | General progress updates |
| **ML_SETUP_COMPLETE.md** | ML integration completion status |
| **MULTI_DIMENSIONAL_COMPLETE.md** | Multi-dimensional calculator completion |

**Current Status:** Backend complete, frontend UI updates pending

---

## 🔗 Integrations

**Location:** `integrations/`

| File | Description |
|------|-------------|
| **ML_INTEGRATION_GUIDE.md** | Complete TabPFN ML integration guide (55+ pages) |
| **ML_GOOGLE_MARKETING_IMPLEMENTATION.md** | Google Marketing analytics integration |
| **INTERACTIVE_ANOMALY_REVIEW_IMPLEMENTATION.md** | Interactive anomaly detection feature |

**Start Here:** `ML_INTEGRATION_GUIDE.md` for AI-powered transfer predictions

---

## 📈 Reports & Analysis

**Location:** `reports/`

| File | Description | Status |
|------|-------------|--------|
| **QUICK_SUMMARY.md** | Sales discrepancy quick reference | ✅ Resolved |
| **SALES_DISCREPANCY_INVESTIGATION_REPORT.md** | Complete 40-page discrepancy analysis | ✅ Resolved |
| **DATA_DISCREPANCY_REPORT.md** | General data validation report | ✅ Complete |
| **RECEIVING_DISCREPANCY_REPORT.md** | Receiving data analysis | ✅ Complete |

**Key Finding:** QuickBooks excludes promotional discounts ($104K difference explained)

---

## 🔧 Technical Guides

**Location:** `technical-guides/`

| File | Description |
|------|-------------|
| **ITEM_LIST_FORMATTING_RULES.md** | Excel item list processing rules |
| **VISUAL_FORMATTING_EXAMPLE.md** | Visual guide to data formatting |
| **FILTER_FIX_SUMMARY.md** | Sales transaction filter bug fixes |
| **FIXES_APPLIED.md** | History of technical fixes |

**Use Cases:** Understanding data processing, troubleshooting imports

---

## 📅 Planning

**Location:** `planning/`

| File | Description |
|------|-------------|
| **INVENTORY_INSIGHTS_PLANNING.md** | Future inventory insights features |

---

## 📦 Vendor Prepack System

**Location:** Root level docs

| File | Description |
|------|-------------|
| **VENDOR_PREPACK_CONFIGURATION_SYSTEM.md** | Original system design |
| **STYLE_FIRST_PREPACK_ARCHITECTURE.md** | Architecture design |
| **STYLE_FIRST_IMPLEMENTATION_PLAN.md** | Implementation plan |
| **PREPACK_SYSTEM_ANALYSIS.md** | Why prepacks matter (70% of vendors) |
| **VENDOR_CLASSIFICATIONS.md** | Vendor type reference |
| **VENDOR_TYPE_DISTINCTION_UX_ISSUE.md** | UX design decisions |
| **VENDOR_UX_IMPLEMENTATION_TEST_SUMMARY.md** | Testing results |
| **BACKEND_IMPLEMENTATION_COMPLETE.md** | Backend status (100% complete) |
| **POS_VENDOR_CONFIGURATION_GUIDE.md** | **PRIMARY DOC FOR POS TEAM** |

**Package:** All files packaged in `/vendor-prepack-system-package/`

**For POS Team:** Share `POS_VENDOR_CONFIGURATION_GUIDE.md` (55 pages, standalone)

---

## 🎯 Quick Reference

### I want to...

**Deploy the application:**
→ `deployment/DEPLOYMENT.md`

**Understand ML integration:**
→ `integrations/ML_INTEGRATION_GUIDE.md`

**Check implementation status:**
→ `implementation-status/IMPLEMENTATION_STATUS.md`

**Investigate sales data:**
→ `reports/QUICK_SUMMARY.md`

**Configure vendor prepacks:**
→ `VENDOR_PREPACK_CONFIGURATION_SYSTEM.md`

**Share vendor guide with POS team:**
→ `/vendor-prepack-system-package/documentation/POS_VENDOR_CONFIGURATION_GUIDE.md`

**Understand data formatting:**
→ `technical-guides/ITEM_LIST_FORMATTING_RULES.md`

**See project roadmap:**
→ `implementation-status/IMPLEMENTATION_PLAN.md`

**Run analysis scripts:**
→ `/scripts/analysis/` (14 scripts)

**Verify functionality:**
→ `/scripts/verification/` (17 scripts)

**Debug issues:**
→ `/scripts/debugging/` (12 scripts)

---

## 📂 Project Root Files

These files remain in the project root:

- **README.md** - Project overview and setup
- **CLAUDE.md** - Project guidance for Claude Code AI

---

## 🗂️ Archive

**Location:** `/vendor-prepack-system-package/`

Complete vendor prepack system packaged for sharing:
- 9 documentation files
- 3 frontend components
- 4 backend files
- Database migration script
- ML service files
- Compressed archive (124 KB)

---

## 🔬 Scripts & Utilities

**Location:** `/scripts/`

Utility scripts for analysis, verification, and debugging organized by purpose.

### Analysis Scripts (14 files)

**Location:** `scripts/analysis/`

| File | Description |
|------|-------------|
| **analyze-csv-file.sh** | Bash script for CSV file analysis |
| **analyze-sales-data.ts** | Sales data analysis utility |
| **analyze-item-list.ts** | Item list data analysis |
| **check-sales-structure.ts** | Sales data structure validator |
| **test-flat-sales.ts** | Flat sales data testing |
| **test-sales-import.ts** | Sales import functionality test |
| **analyze-sales-fix.ts** | Sales data fix analyzer |
| **analyze-store-filters.ts** | Store filter analysis |
| **debug-data-processing.ts** | Data processing debugger |
| **analyze-date-logic.ts** | Date calculation logic analysis |
| **analyze-sales-transactions.ts** | Transaction analysis utility |
| **test-sales-flat.ts** | Sales flat structure test |
| **analyze-receiving.ts** | Receiving data analysis |
| **test-sales-grouping.ts** | Sales grouping test |

**Use Cases:** Data analysis, performance testing, structure validation

### Verification Scripts (17 files)

**Location:** `scripts/verification/`

| File | Description |
|------|-------------|
| **verify-sales-data.sql** | SQL queries for sales data verification |
| **test-calculator.ts** | Calculator functionality tests |
| **test-cost-calc.ts** | Cost calculation verification |
| **test-ml-transfer-styles.ts** | ML transfer styles testing |
| **test-vendor-config.ts** | Vendor configuration tests |
| **quick-verify.sh** | Quick verification bash script |
| **test-pack-cost.ts** | Pack cost calculation test |
| **verify-pack-cost-priority.ts** | Pack cost priority verification |
| **test-style-grouping.ts** | Style grouping functionality test |
| **test-style-search.ts** | Style search functionality test |
| **check-database-receiving.ts** | Database receiving data check |
| **verify-receiving-schema.ts** | Receiving schema verification |
| **test-receiving-calculations.ts** | Receiving calculations test |
| **verify-duplicate-check.ts** | Duplicate detection verification |
| **test-date-range.ts** | Date range functionality test |
| **check-item-list-schema.ts** | Item list schema verification |
| **verify-uploads.ts** | Upload functionality verification |

**Use Cases:** Testing, validation, quality assurance

### Debugging Scripts (12 files)

**Location:** `scripts/debugging/`

| File | Description |
|------|-------------|
| **debug-receiving-database.ts** | Database debugging for receiving |
| **investigate-receiving-discrepancy.ts** | Receiving data discrepancy investigation |
| **debug-sales-data.ts** | Sales data debugging utility |
| **debug-sales-structure.ts** | Sales structure debugger |
| **debug-flat-sales.ts** | Flat sales debugging |
| **debug-item-list-structure.ts** | Item list structure debugger |
| **debug-receiving-metrics.ts** | Receiving metrics debugger |
| **debug-settings.ts** | Settings debugging utility |
| **debug-receiving-calculations.ts** | Receiving calculations debugger |
| **inspect-receiving.ts** | Receiving data inspector |
| **debug-receiving-dashboard.ts** | Dashboard debugging for receiving |
| **check-receiving-data.ts** | Receiving data checker |

**Use Cases:** Troubleshooting, issue investigation, data inspection

### Test Data (1 file)

**Location:** `test-data/`

| File | Description |
|------|-------------|
| **test-vendors-import.csv** | Sample vendor import data for testing |

---

## 📝 Document Categories

### By Type:
- **Guides** (12 files): Step-by-step instructions
- **Status** (6 files): Progress tracking
- **Reports** (4 files): Analysis and findings
- **Technical** (4 files): Implementation details
- **Planning** (1 file): Future roadmap

### By Priority:
- **High Priority**: Deployment, ML Integration, Implementation Status
- **Medium Priority**: Reports, Technical Guides
- **Low Priority**: Planning docs (future features)

### By Audience:
- **Developers**: All implementation-status/, technical-guides/, integrations/
- **DevOps**: deployment/
- **Business/Finance**: reports/
- **POS Team**: vendor-prepack-system-package/
- **Management**: planning/, status summaries

---

## 🔍 Search Tips

**Finding specific topics:**

```bash
# Search all docs for a keyword
grep -r "keyword" docs/

# List all files in a category
ls docs/deployment/

# Find recently modified docs
find docs/ -name "*.md" -mtime -7
```

---

## 📊 Documentation Statistics

- **Total Documentation Files**: 32 MD files
- **Total Script Files**: 44 utility scripts (14 analysis + 17 verification + 12 debugging + 1 test data)
- **Total Size**: ~2.5 MB (docs) + ~180 KB (scripts)
- **Categories**: 6 documentation directories + 4 script directories
- **Status**: Well-organized and indexed
- **Last Major Update**: January 2025

---

## ✅ Documentation Maintenance

**When adding new docs:**
1. Place in appropriate category directory
2. Update this README.md
3. Add to Quick Reference if important
4. Use descriptive filenames

**Naming Convention:**
- `FEATURE_NAME_TYPE.md` (e.g., `ML_INTEGRATION_GUIDE.md`)
- All caps for major documents
- Underscores for spaces
- Descriptive and searchable

---

## 📞 Need Help?

**Can't find what you're looking for?**

1. Check this README's Quick Reference section
2. Search documentation: `grep -r "your search" docs/`
3. Search scripts: `grep -r "your search" scripts/`
4. Check the vendor-prepack-system-package for vendor-specific docs
5. Review implementation-status/ for current progress
6. Browse scripts/ for utilities and test files

---

**Documentation Status**: ✅ Complete and Organized
**Scripts Status**: ✅ Organized and Indexed
**Last Updated**: January 2025
**Total Documentation**: 32 MD files across 6 categories
**Total Scripts**: 44 utility scripts across 3 categories + 1 test data file

---

**END OF DOCUMENTATION INDEX**
