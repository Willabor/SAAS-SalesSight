# Profit Analysis Dashboard - UI Design & Implementation

**Date**: October 12, 2025
**Component**: Profit Analysis Dashboard (New Feature)
**Status**: DESIGN APPROVED - Ready for Implementation

---

## 🎨 **UI Overview**

### **Purpose**
A dedicated dashboard page for analyzing profit opportunities across all SKUs, with:
- Real-time profit opportunity tracking
- Historical trend visualization
- Manual recalculation capability
- Drill-down analysis by vendor/color/size

### **Route**
```
/profit-analysis
```

---

## 📐 **Page Layout**

### **Header Section**
```
┌────────────────────────────────────────────────────────────┐
│  Profit Analysis Dashboard                                 │
│  ══════════════════════════════════════                   │
│                                                            │
│  [Last Updated: Oct 12, 2025 2:00 AM]                     │
│  [↻ Recalculate Now] ← MANUAL TRIGGER BUTTON             │
│                                                            │
│  Summary Cards:                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Total    │  │ Critical │  │ SKUs     │  │ Avg ROI  │ │
│  │ $15,473  │  │ $8,450   │  │ 47       │  │ 125%     │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└────────────────────────────────────────────────────────────┘
```

### **Filters Section**
```
┌────────────────────────────────────────────────────────────┐
│  Filters:                                                  │
│  [Vendor ▼] [Color ▼] [Urgency ▼] [Date Range ▼]        │
│  [Show Only Profitable] [Clear Filters]                   │
└────────────────────────────────────────────────────────────┘
```

### **Main Content - Tabs**
```
┌────────────────────────────────────────────────────────────┐
│  [Top Opportunities] [Trends] [By Vendor] [By Color]      │
│  ════════════════════════════════════════════════════════  │
│                                                            │
│  [Content area - see detailed designs below]              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Tab 1: Top Opportunities**

### **Design**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Top Profit Opportunities                                           │
│  ═══════════════════════                                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ SKU      Style  Color  Size      Profit  Urgency  Days Stock│  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ 42806    8501B  Black  38W X 32L $1,136  🔴 CRITICAL   11  │  │
│  │ 42803    8501B  Black  34W X 32L $1,053  🔴 CRITICAL   13  │  │
│  │ 42798    8501B  Black  36W X 32L $  947  🔴 CRITICAL   15  │  │
│  │ 42800    8501B  Black  30W X 32L $  810  🟡 LOW        22  │  │
│  │ ...                                                         │  │
│  │                                                             │  │
│  │ [← Prev]  Page 1 of 3  [Next →]                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Click any row for detailed analysis ↓                             │
└─────────────────────────────────────────────────────────────────────┘
```

### **Expandable Row Detail**

When user clicks a row:
```
┌─────────────────────────────────────────────────────────────────────┐
│  42806 - 8501B Black 38W X 32L                                     │
│  ═══════════════════════════════════════════                       │
│                                                                     │
│  Current State:                     Profit Analysis:                │
│  ├─ Inventory: 6 units             ├─ Shortage: 42 units          │
│  ├─ Days Supply: 11 days           ├─ Profit Opp: $1,136.10       │
│  ├─ Velocity: 0.53/day             ├─ Lost/Day: $14.34            │
│  └─ Target: 48 units               └─ 30d Risk: $430.20           │
│                                                                     │
│  Velocity Trend:                    Recommendation:                 │
│  ├─ 30d:  0.53/day                 ├─ Action: ORDER               │
│  ├─ 90d:  0.48/day                 ├─ Boxes: 4                    │
│  ├─ 365d: 0.52/day                 ├─ Pack: Pack A (Black)        │
│  └─ Trend: STABLE                  └─ Tier: UNPROFITABLE (-$674)  │
│                                                                     │
│  [View 30-Day History] [View Style Dashboard]                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📈 **Tab 2: Trends**

### **Design**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Profit Opportunity Trends                                          │
│  ═══════════════════════                                           │
│                                                                     │
│  Select SKU: [42806 - 8501B Black 38W X 32L ▼]                    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                                                             │  │
│  │  $1,200 ┤                                              ●   │  │
│  │         │                                          ●       │  │
│  │  $1,000 ┤                                      ●           │  │
│  │         │                                  ●               │  │
│  │    $800 ┤                              ●                   │  │
│  │         │                          ●                       │  │
│  │    $600 ┤                      ●                           │  │
│  │         │                  ●                               │  │
│  │    $400 ┤              ●                                   │  │
│  │         ├───────────────────────────────────────────────  │  │
│  │         Sep 12    Sep 22    Oct 2    Oct 12              │  │
│  │                                                             │  │
│  │  Legend: ● Profit Opportunity                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Metrics Over Time                                           │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ Date       Profit Opp  Days Supply  Velocity  Urgency      │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ Oct 12     $1,136      11           0.53      CRITICAL     │  │
│  │ Oct 11     $1,108      12           0.53      CRITICAL     │  │
│  │ Oct 10     $1,081      13           0.52      CRITICAL     │  │
│  │ Sep 12     $  450      42           0.10      MONITOR      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [Download CSV]                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏢 **Tab 3: By Vendor**

### **Design**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Profit Opportunities by Vendor                                     │
│  ═══════════════════════════════                                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Vendor            Styles  SKUs  Profit Opp   Avg ROI  ⚠️    │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ Argonaut Nations    12     47   $15,473     125%     12    │  │
│  │ Ethika               8     23   $ 8,210      98%      5    │  │
│  │ True Religion        5     18   $ 5,632      87%      3    │  │
│  │ ...                                                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Click vendor to expand ↓                                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ ▼ Argonaut Nations                                          │  │
│  │   ┌───────────────────────────────────────────────────────┐ │  │
│  │   │ Style  Color  SKUs  Profit Opp  Recommendation       │ │  │
│  │   ├───────────────────────────────────────────────────────┤ │  │
│  │   │ 8501B  Black   12   $8,450      4 boxes Pack A       │ │  │
│  │   │ 8501B  Olive    8   $3,210      2 boxes Pack A       │ │  │
│  │   │ S8502  Bone     6   $2,150      2 boxes Pack C       │ │  │
│  │   │ ...                                                   │ │  │
│  │   └───────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 **Tab 4: By Color**

### **Design**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Profit Opportunities by Color                                      │
│  ═══════════════════════════                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Color         SKUs  Profit Opp   Avg Margin   Shortage      │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ ⬛ Black       47   $15,473       65.90%       342 units    │  │
│  │ 🟤 Olive       23   $ 8,210       64.20%       185 units    │  │
│  │ 🟦 Ice Blue    18   $ 5,632       66.10%       142 units    │  │
│  │ ⬜ White       15   $ 4,328       66.34%       108 units    │  │
│  │ ...                                                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Visual Breakdown:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                                                             │  │
│  │   █████████████████████████ Black ($15,473)               │  │
│  │   █████████████ Olive ($8,210)                            │  │
│  │   ██████████ Ice Blue ($5,632)                            │  │
│  │   ████████ White ($4,328)                                 │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Manual Recalculation Feature**

### **Button Design**

```
┌────────────────────────────────────┐
│  [↻ Recalculate Profit Analysis]  │
│                                    │
│  Last sync: 2 hours ago            │
│  Next scheduled: 6 hours           │
└────────────────────────────────────┘
```

### **Click Flow**

**Step 1: User clicks button**
```
┌──────────────────────────────────────────────┐
│  Recalculate Profit Analysis?               │
│  ─────────────────────────────               │
│                                              │
│  This will recalculate profit opportunities  │
│  for all active SKUs (500+ items).          │
│                                              │
│  Estimated time: 30-60 seconds              │
│                                              │
│  [Cancel]  [Recalculate Now]                │
└──────────────────────────────────────────────┘
```

**Step 2: Processing**
```
┌──────────────────────────────────────────────┐
│  ⟳ Recalculating...                         │
│  ─────────────────                          │
│                                              │
│  Progress: 342 / 523 SKUs                   │
│                                              │
│  [████████████░░░░░░] 65%                   │
│                                              │
│  Please wait...                             │
└──────────────────────────────────────────────┘
```

**Step 3: Complete**
```
┌──────────────────────────────────────────────┐
│  ✓ Recalculation Complete!                  │
│  ─────────────────────────                  │
│                                              │
│  Updated 523 SKUs                           │
│  Found 47 profit opportunities              │
│  Total profit potential: $15,473            │
│                                              │
│  [View Results]                             │
└──────────────────────────────────────────────┘
```

### **Implementation Details**

**API Endpoint**:
```typescript
POST /api/profit-analysis/recalculate

Request:
{
  "force": true,
  "scope": "all" // or "vendor", "style", "sku"
}

Response:
{
  "status": "processing",
  "job_id": "recalc_20251012_145623",
  "estimated_time": 45,
  "total_skus": 523
}

// Poll for status:
GET /api/profit-analysis/recalculate/status/:job_id

Response:
{
  "status": "completed",
  "progress": 100,
  "skus_processed": 523,
  "opportunities_found": 47,
  "total_opportunity": 15473.50,
  "completed_at": "2025-10-12T14:57:15Z"
}
```

---

## 💎 **Component Structure**

### **File Organization**

```
client/src/
├── pages/
│   └── profit-analysis-dashboard.tsx          ← Main page
├── components/
│   └── profit-analysis/
│       ├── SummaryCards.tsx                   ← Top summary cards
│       ├── RecalculateButton.tsx              ← Manual trigger button
│       ├── TopOpportunitiesTable.tsx          ← Tab 1: Table
│       ├── OpportunityDetailPanel.tsx         ← Expandable row detail
│       ├── TrendsChart.tsx                    ← Tab 2: Line chart
│       ├── VendorAnalysisTable.tsx            ← Tab 3: Vendor view
│       ├── ColorAnalysisChart.tsx             ← Tab 4: Color bar chart
│       ├── FiltersBar.tsx                     ← Filters section
│       └── RecalculateModal.tsx               ← Confirmation modal
└── hooks/
    └── useProfitAnalysis.ts                   ← Data fetching hook
```

---

## 🎨 **Visual Design System**

### **Color Coding**

**Profitability Tiers**:
```
EXCELLENT      → Green (#10b981)
GOOD           → Blue (#3b82f6)
MARGINAL       → Yellow (#f59e0b)
UNPROFITABLE   → Red (#ef4444)
```

**Urgency Levels**:
```
CRITICAL  → 🔴 Red badge
LOW       → 🟡 Yellow badge
MONITOR   → 🔵 Blue badge
GOOD      → 🟢 Green badge
HEALTHY   → ⚪ Gray badge
```

### **Typography**

```
Page Title:     text-3xl font-bold
Section Title:  text-xl font-semibold
Card Value:     text-2xl font-bold
Card Label:     text-sm text-gray-500
Table Header:   text-xs font-medium uppercase
Table Cell:     text-sm
```

### **Spacing**

```
Page Padding:   p-6
Card Spacing:   gap-4
Section Gap:    space-y-6
Table Padding:  p-4
```

---

## 📱 **Responsive Design**

### **Desktop (≥1024px)**
- 4-column summary cards
- Full table with all columns
- Side-by-side charts

### **Tablet (768px - 1023px)**
- 2-column summary cards
- Table with horizontal scroll
- Stacked charts

### **Mobile (<768px)**
- 1-column summary cards
- Card-based list view (no table)
- Full-width charts

---

## 🔌 **API Integration**

### **Endpoints Needed**

```typescript
// Get current profit opportunities
GET /api/profit-analysis/opportunities
Query params: ?vendor=X&color=Y&urgency=Z&limit=20&offset=0

// Get historical data for a SKU
GET /api/profit-analysis/history/:sku
Query params: ?days=30

// Get vendor summary
GET /api/profit-analysis/by-vendor

// Get color summary
GET /api/profit-analysis/by-color

// Trigger manual recalculation
POST /api/profit-analysis/recalculate

// Check recalculation status
GET /api/profit-analysis/recalculate/status/:job_id

// Get summary stats
GET /api/profit-analysis/summary
```

---

## 🧪 **User Interaction Flows**

### **Flow 1: View Top Opportunities**
1. User navigates to `/profit-analysis`
2. Page loads with latest data from `sku_profit_analysis` table
3. Shows top 20 opportunities by default
4. User can filter by vendor, color, urgency
5. User clicks a row to see detailed analysis

### **Flow 2: Manual Recalculation**
1. User clicks "Recalculate Now" button
2. System shows confirmation modal
3. User confirms
4. System triggers background job
5. Progress indicator shows status
6. Page auto-refreshes when complete

### **Flow 3: Historical Trend Analysis**
1. User switches to "Trends" tab
2. Selects a SKU from dropdown
3. Chart displays 30-day history
4. Table shows daily snapshots
5. User can download CSV

### **Flow 4: Vendor Analysis**
1. User switches to "By Vendor" tab
2. Sees aggregated profit by vendor
3. Clicks a vendor to expand
4. Views style-level breakdown
5. Can drill down to SKU level

---

## ⚡ **Performance Considerations**

### **Data Loading Strategy**

```typescript
// Use React Query for caching
const { data, isLoading } = useQuery(
  ['profit-opportunities', filters],
  () => fetchProfitOpportunities(filters),
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000 // 30 minutes
  }
);
```

### **Pagination**

```typescript
// Server-side pagination
const [page, setPage] = useState(1);
const pageSize = 20;

// Load only current page
GET /api/profit-analysis/opportunities?limit=20&offset=0
```

### **Lazy Loading Charts**

```typescript
// Only load chart data when tab is active
const TrendsTab = () => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isActive) {
      fetchTrendData();
    }
  }, [isActive]);
};
```

---

## 🚀 **Implementation Timeline**

### **Phase 1: Core Dashboard** (2-3 days)

**Day 1**:
- [ ] Create page structure
- [ ] Implement summary cards
- [ ] Add basic table view
- [ ] Set up routing

**Day 2**:
- [ ] Add filters
- [ ] Implement pagination
- [ ] Add expandable rows
- [ ] Style with Tailwind

**Day 3**:
- [ ] Add tabs navigation
- [ ] Implement vendor view
- [ ] Add color analysis
- [ ] Polish UI

### **Phase 2: Manual Recalculation** (1-2 days)

**Day 4**:
- [ ] Create recalculate button
- [ ] Add confirmation modal
- [ ] Implement progress tracking
- [ ] Add API endpoints

**Day 5**:
- [ ] Add WebSocket for real-time updates (optional)
- [ ] Test with large datasets
- [ ] Add error handling
- [ ] Polish UX

### **Phase 3: Historical Trends** (1-2 days)

**Day 6**:
- [ ] Implement trend chart
- [ ] Add date range picker
- [ ] Create historical table
- [ ] Add CSV export

**Day 7**:
- [ ] Test all features
- [ ] Fix bugs
- [ ] Add loading states
- [ ] Final polish

---

## ✅ **Acceptance Criteria**

**Functionality**:
- [ ] ✅ Shows top 20 profit opportunities
- [ ] ✅ Manual recalculation works
- [ ] ✅ Progress indicator shows during recalc
- [ ] ✅ Filters work (vendor, color, urgency)
- [ ] ✅ Expandable rows show details
- [ ] ✅ Historical trends display correctly
- [ ] ✅ Vendor/color analysis views work

**Performance**:
- [ ] ✅ Page loads in <2 seconds
- [ ] ✅ Table pagination smooth
- [ ] ✅ Recalculation completes in <60 seconds
- [ ] ✅ Charts render without lag

**UX**:
- [ ] ✅ Responsive on mobile
- [ ] ✅ Clear loading states
- [ ] ✅ Error messages helpful
- [ ] ✅ Tooltips explain metrics
- [ ] ✅ Keyboard navigation works

---

## 📚 **Related Documents**

- `/docs/SKU_PROFIT_ANALYSIS_TABLE_DESIGN.md` - Database design
- `/docs/PROFIT_OPTIMIZER_FORMULA_AGREED.md` - Profit calculations
- `/docs/MASTER_INDEX_AND_IMPLEMENTATION_PLAN.md` - Overall plan

---

**Document Status**: ✅ DESIGN COMPLETE - Ready for Implementation
**Priority**: MEDIUM (After profit optimizer core)
**Timeline**: 5-7 days implementation

---

**END OF UI DESIGN DOCUMENT**
