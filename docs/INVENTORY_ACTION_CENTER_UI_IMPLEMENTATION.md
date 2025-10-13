# Inventory Action Center UI Implementation Plan

**Document Version**: 1.0
**Created**: October 10, 2025
**Status**: PLANNING - Ready for Implementation Approval
**Estimated Effort**: 3-5 days development + 2 days testing

---

## 📋 Executive Summary

This document outlines the implementation plan for enhancing the existing **Inventory Turnover Dashboard** into a comprehensive **Inventory Action Center** with color-aware prepack restocking recommendations and SKU-level transfer details.

**Key Design Decision**: **Evolution, not revolution** - We enhance the existing component rather than creating a new page.

**Critical Business Requirements Addressed**:
- ✅ Color-specific prepack optimization (each box = one color)
- ✅ Warehouse distribution workflow (boxes → warehouse → unpack → distribute)
- ✅ SKU-level granularity (item_number, not style_number aggregation)
- ✅ Network-wide optimization (minimize waste across all stores)

---

## 🎯 Implementation Overview

### **What We're Building**

1. **Enhanced Transfer Recommendations** - Add expandable SKU-level details with color/size breakdown
2. **New Prepack Restocking Section** - Color-aware prepack ordering recommendations
3. **Updated Page Branding** - Rename to "Inventory Action Center" with AI-enhanced badge
4. **Backend API Extensions** - New endpoints for prepack recommendations and SKU details
5. **ML Service Activation** - Enable draft prepack endpoints with color-awareness

### **What We're NOT Changing**

- ❌ Existing page routing structure
- ❌ Current API contracts for existing endpoints
- ❌ Database schema (no migrations needed)
- ❌ Authentication/authorization logic
- ❌ Existing slow-moving, overstock, or sale recommendation sections

---

## 📊 Technical Architecture

### **Component Location**
- **File**: `/client/src/components/inventory-turnover-dashboard.tsx`
- **Current Size**: 1,436 lines
- **Route**: `/inventory-turnover` (via App.tsx routing)
- **Parent Page**: Accessed from main dashboard navigation

### **Data Flow**
```
User Request
    ↓
Inventory Turnover Dashboard Component
    ↓
Backend API (/server/routes.ts)
    ↓
ML Service (/ml_service/main.py)
    ↓
Database (PostgreSQL via Drizzle ORM)
    ↓
Response → UI Rendering
```

---

## ✅ Implementation Checklist

### **PHASE 1: Backend Foundation**

#### **Task 1.1: Database Functions** ✅ NO CHANGES NEEDED
- [ ] ~~Add new database queries~~ (Existing schema supports all requirements)
- [x] Verify `item_list` table has all needed fields
- [x] Verify `sales_transactions` table structure
- [x] Verify `receiving_vouchers` and `receiving_lines` tables

**Status**: ✅ Complete - No database changes required

---

#### **Task 1.2: Storage Layer Enhancements**
**File**: `/server/storage.ts`

**Add New Functions**:

- [ ] **Function 1**: `getTransferRecommendationsWithSKUs(limit: number)`
  - **Purpose**: Return style-level transfers WITH SKU breakdown
  - **Returns**:
    ```typescript
    {
      styleNumber: string,
      itemName: string,
      transfers: Transfer[],
      skuDetails: Array<{
        itemNumber: string,
        color: string,
        size: string,
        fromStore: string,
        fromQty: number,
        toStore: string,
        toQty: number,
        recommendedQty: number
      }>
    }
    ```
  - **SQL Logic**:
    - Group by `style_number` for summary
    - Include `item_number` for SKU details
    - Parse color from `attribute` field
    - Parse size from `size` field
  - **Estimated Lines**: ~150 lines
  - **Complexity**: Medium

- [ ] **Function 2**: `getStylesNeedingRestock(limit: number)`
  - **Purpose**: Identify styles with low days of supply that need restocking
  - **Returns**:
    ```typescript
    Array<{
      styleNumber: string,
      vendorName: string,
      daysOfSupply: number,
      totalActiveQty: number,
      avgDailySales: number
    }>
    ```
  - **SQL Logic**:
    - Calculate days of supply from inventory and sales velocity
    - Filter WHERE `days_of_supply < 30`
    - ORDER BY `days_of_supply ASC, avg_daily_sales DESC`
  - **Estimated Lines**: ~100 lines
  - **Complexity**: Medium

**Acceptance Criteria**:
- [ ] Functions compile without TypeScript errors
- [ ] Returns correct data structure matching interface definitions
- [ ] Handles null/undefined values gracefully
- [ ] Performance: Queries execute in <500ms for typical dataset

---

#### **Task 1.3: API Route Extensions**
**File**: `/server/routes.ts`

**Add New Endpoints**:

- [ ] **Endpoint 1**: `GET /api/inventory/transfer-recommendations-sku`
  - **Location**: Insert after line 950 (after existing transfer-recommendations-ml)
  - **Parameters**:
    - `limit` (query param, default: 20)
  - **Handler Logic**:
    ```typescript
    app.get("/api/inventory/transfer-recommendations-sku", isAuthenticated, async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 20;
        const recommendations = await storage.getTransferRecommendationsWithSKUs(limit);
        res.json(recommendations);
      } catch (error) {
        console.error('Error fetching SKU transfer recommendations:', error);
        res.status(500).json({ error: "Failed to fetch transfer recommendations" });
      }
    });
    ```
  - **Estimated Lines**: ~15 lines
  - **Complexity**: Low

- [ ] **Endpoint 2**: `GET /api/inventory/prepack-restocking-recommendations`
  - **Location**: Insert after line 1014 (after existing restocking-recommendations)
  - **Parameters**:
    - `limit` (query param, default: 20)
  - **Handler Logic**: Proxy to ML service with fallback
    ```typescript
    app.get("/api/inventory/prepack-restocking-recommendations", isAuthenticated, async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 20;
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

        const mlResponse = await fetch(`${mlServiceUrl}/api/ml/prepack-batch-recommendations?limit=${limit}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!mlResponse.ok) {
          throw new Error(`ML service error: ${mlResponse.statusText}`);
        }

        const mlData = await mlResponse.json();
        res.json(mlData.recommendations);

      } catch (error) {
        console.error('Prepack recommendation error:', error);
        // Fallback: return empty array or basic recommendations
        res.json([]);
      }
    });
    ```
  - **Estimated Lines**: ~25 lines
  - **Complexity**: Low

**Acceptance Criteria**:
- [ ] Endpoints respond with HTTP 200 on success
- [ ] Returns valid JSON matching TypeScript interfaces
- [ ] Handles authentication via `isAuthenticated` middleware
- [ ] Graceful error handling with HTTP 500 on failure
- [ ] Logs errors to console for debugging

---

### **PHASE 2: ML Service Enhancement**

#### **Task 2.1: Prepack Data Utilities Enhancement**
**File**: `/ml_service/utils/prepack_data.py`

**Current Status**: Draft functions exist, need color-awareness

- [ ] **Function 1**: `get_style_inventory_needs_by_color(style_number, target_days_supply)`
  - **Purpose**: Get inventory needs broken down BY COLOR
  - **Returns**:
    ```python
    {
      'Black': {
        '30W×32L': 15,  # Need 15 pieces
        '34W×32L': 8,
        '38W×32L': 5
      },
      'Olive': {
        '30W×32L': 3,
        '34W×32L': 5,
        '36W×32L': 2
      },
      'Navy': {
        '30W×32L': 2,
        '32W×32L': 2
      }
    }
    ```
  - **Data Source**: Query `item_list` and `sales_transactions`
  - **Logic**:
    1. Get all SKUs (item_numbers) for this style
    2. For each SKU, parse color from `attribute` field
    3. Calculate need = (avg_daily_sales × target_days_supply) - current_qty
    4. Group by color, then by size
  - **Estimated Lines**: ~80 lines
  - **Complexity**: Medium

- [ ] **Function 2**: `get_styles_needing_restock(limit)`
  - **Purpose**: Identify top N styles needing prepack restocking
  - **Returns**:
    ```python
    [
      {
        'style_number': '8501B',
        'vendor_name': 'Argonaut Nations',
        'days_of_supply': 12.5,
        'total_active_qty': 45,
        'avg_daily_sales': 3.6,
        'uses_prepacks': True
      }
    ]
    ```
  - **Logic**:
    1. Calculate days of supply for all styles
    2. Filter WHERE `uses_prepacks = True`
    3. Filter WHERE `days_of_supply < 30`
    4. ORDER BY `days_of_supply ASC`
    5. LIMIT to N results
  - **Estimated Lines**: ~60 lines
  - **Complexity**: Medium

**Acceptance Criteria**:
- [ ] Functions return correct data structures
- [ ] Color parsing handles variations (e.g., "BLK", "Black", "BLACK")
- [ ] Handles missing/null attribute fields gracefully
- [ ] Unit tests pass for sample data

---

#### **Task 2.2: Prepack Optimizer Color-Awareness**
**File**: `/ml_service/models/prepack_optimizer.py`

**Current Status**: Draft implementation exists (lines 12-25 have warning about missing color-awareness)

- [ ] **Add Method**: `optimize_color_aware(needs_by_color, available_prepacks)`
  - **Purpose**: Optimize prepack ordering PER COLOR, then aggregate
  - **Input**:
    ```python
    needs_by_color = {
      'Black': {'30W×32L': 15, '34W×32L': 8},
      'Olive': {'30W×32L': 3, '34W×32L': 5}
    }
    available_prepacks = [
      PrepackContents(
        prepack_name='Pack A',
        color='Black',  # NEW: Color-specific
        size_assortment={'30W×32L': 30, '32W×32L': 20, '34W×32L': 20, ...}
      )
    ]
    ```
  - **Algorithm**:
    ```python
    recommendations = {}

    for color, size_needs in needs_by_color.items():
        # Skip colors with very low demand
        if sum(size_needs.values()) < 5:
            continue

        # Find prepacks for this color
        color_prepacks = [p for p in available_prepacks if p.color == color]

        if not color_prepacks:
            continue

        # Optimize for THIS color
        solution = self._optimize_single_color(size_needs, color_prepacks)
        recommendations[color] = solution

    # Aggregate across colors
    return self._aggregate_recommendations(recommendations)
    ```
  - **Returns**:
    ```python
    PrepackSolution(
      recommendation="Order 5 boxes Pack A (Black) + 2 boxes Pack A (Olive) + 1 box Pack A (Navy)",
      total_boxes=8,
      total_pieces=96,
      total_cost=2400.00,
      coverage_pct=0.92,
      waste_pct=0.08,
      score=87.5,
      prepack_breakdown=[
        {
          'name': 'Pack A',
          'color': 'Black',
          'boxes': 5,
          'total_pieces': 60,
          'cost': 1500.00
        },
        {
          'name': 'Pack A',
          'color': 'Olive',
          'boxes': 2,
          'total_pieces': 24,
          'cost': 600.00
        }
      ],
      distribution_plan=[
        {
          'store': 'NM',
          'skus': [
            {'item_number': '8501B-BLK-30W', 'color': 'Black', 'size': '30W×32L', 'qty': 8},
            {'item_number': '8501B-OLV-30W', 'color': 'Olive', 'size': '30W×32L', 'qty': 2}
          ]
        },
        {
          'store': 'WAREHOUSE',
          'skus': [...]
        }
      ]
    )
    ```
  - **Estimated Lines**: ~200 lines
  - **Complexity**: High

**Acceptance Criteria**:
- [ ] Correctly optimizes per color
- [ ] Returns color-specific recommendations
- [ ] Aggregates across colors correctly
- [ ] Generates warehouse distribution plan
- [ ] Handles edge cases (no prepacks for a color, very low demand)
- [ ] Unit tests pass for Style 8501B test case

---

#### **Task 2.3: Main API Endpoint**
**File**: `/ml_service/main.py`

**Current Status**: Draft endpoint exists at lines 641-780

- [ ] **Activate Endpoint**: `/api/ml/prepack-recommendations` (single style)
  - **Status**: Already implemented, just needs color-awareness integration
  - **Action**: Update to use `optimize_color_aware()` method
  - **Testing**: Verify with Style 8501B

- [ ] **Add New Endpoint**: `/api/ml/prepack-batch-recommendations` (multiple styles)
  - **Location**: Insert after line 780
  - **Handler Logic**:
    ```python
    @app.post("/api/ml/prepack-batch-recommendations")
    async def get_batch_prepack_recommendations(limit: int = 20):
        """
        Generate prepack recommendations for top N styles needing restocking.

        Returns color-specific recommendations for multiple styles.
        """
        try:
            # Step 1: Get styles needing restock
            styles = get_styles_needing_restock(limit)

            recommendations = []

            for style in styles:
                # Step 2: Get needs BY COLOR
                needs_by_color = get_style_inventory_needs_by_color(
                    style['style_number'],
                    target_days_supply=90
                )

                # Step 3: Get vendor prepacks
                vendor = style['vendor_name']
                prepacks = get_vendor_prepacks(vendor, style['style_number'])

                # Step 4: Optimize PER COLOR
                solution = prepack_optimizer.optimize_color_aware(
                    needs_by_color=needs_by_color,
                    available_prepacks=prepacks
                )

                # Step 5: Calculate urgency
                urgency = calculate_urgency(style['days_of_supply'])

                recommendations.append({
                    "styleNumber": style['style_number'],
                    "vendorName": vendor,
                    "urgency": urgency,
                    "recommendation": solution.recommendation,
                    "totalBoxes": solution.total_boxes,
                    "totalPieces": solution.total_pieces,
                    "totalCost": solution.total_cost,
                    "wastePct": solution.waste_pct,
                    "coveragePct": solution.coverage_pct,
                    "prepackBreakdown": solution.prepack_breakdown,
                    "distributionPlan": solution.distribution_plan
                })

            return {
                "success": True,
                "count": len(recommendations),
                "recommendations": recommendations
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Batch optimization failed: {str(e)}")
    ```
  - **Estimated Lines**: ~80 lines
  - **Complexity**: Medium

**Acceptance Criteria**:
- [ ] Endpoint returns HTTP 200 on success
- [ ] Returns valid JSON with color-specific recommendations
- [ ] Handles errors gracefully with HTTP 500
- [ ] Logs errors for debugging
- [ ] Performance: Completes in <5s for 20 styles

---

### **PHASE 3: Frontend Implementation**

#### **Task 3.1: TypeScript Interfaces**
**File**: `/client/src/components/inventory-turnover-dashboard.tsx`

**Add New Interfaces** (insert after line 184):

- [ ] **Interface 1**: `SKUTransferDetail`
  ```typescript
  interface SKUTransferDetail {
    itemNumber: string;
    color: string | null;
    size: string | null;
    fromStore: string;
    fromStoreQty: number;
    toStore: string;
    toStoreQty: number;
    recommendedQty: number;
  }
  ```

- [ ] **Interface 2**: `TransferRecommendationWithSKUs`
  ```typescript
  interface TransferRecommendationWithSKUs extends TransferRecommendation {
    skuDetails?: SKUTransferDetail[];
    totalSKUs?: number;
  }
  ```

- [ ] **Interface 3**: `PrepackBreakdownItem`
  ```typescript
  interface PrepackBreakdownItem {
    name: string;
    color: string;
    boxes: number;
    totalPieces: number;
    cost: number;
  }
  ```

- [ ] **Interface 4**: `DistributionPlanStore`
  ```typescript
  interface DistributionPlanStore {
    store: string;
    skus: Array<{
      itemNumber: string;
      color: string;
      size: string;
      qty: number;
    }>;
  }
  ```

- [ ] **Interface 5**: `PrepackRecommendation`
  ```typescript
  interface PrepackRecommendation {
    styleNumber: string;
    vendorName: string | null;
    urgency: 'critical' | 'high' | 'medium' | 'low' | 'good';
    recommendation: string;
    totalBoxes: number;
    totalPieces: number;
    totalCost: number;
    wastePct: number;
    coveragePct: number;
    score: number;
    prepackBreakdown: PrepackBreakdownItem[];
    distributionPlan: DistributionPlanStore[];
    warehouseReserve: number;
  }
  ```

**Acceptance Criteria**:
- [ ] All interfaces compile without TypeScript errors
- [ ] Interfaces match backend API response structures
- [ ] Optional fields marked with `?` as needed

---

#### **Task 3.2: State Management**
**File**: `/client/src/components/inventory-turnover-dashboard.tsx`

**Add State Variables** (insert after line 193):

- [ ] **State 1**: SKU expansion toggle
  ```typescript
  const [showSKUDetails, setShowSKUDetails] = useState(false);
  ```

- [ ] **State 2**: Transfer row expansion
  ```typescript
  const [expandedTransfers, setExpandedTransfers] = useState<Set<string>>(new Set());
  ```

- [ ] **State 3**: Prepack row expansion
  ```typescript
  const [expandedPrepacks, setExpandedPrepacks] = useState<Set<number>>(new Set());
  ```

**Helper Functions**:

- [ ] **Function 1**: `toggleTransferExpansion(styleNumber: string)`
  ```typescript
  const toggleTransferExpansion = (styleNumber: string) => {
    setExpandedTransfers(prev => {
      const next = new Set(prev);
      if (next.has(styleNumber)) {
        next.delete(styleNumber);
      } else {
        next.add(styleNumber);
      }
      return next;
    });
  };
  ```

- [ ] **Function 2**: `togglePrepackExpansion(index: number)`
  ```typescript
  const togglePrepackExpansion = (index: number) => {
    setExpandedPrepacks(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  ```

**Acceptance Criteria**:
- [ ] State updates trigger re-renders correctly
- [ ] Expansion state persists during component lifecycle
- [ ] No console errors or warnings

---

#### **Task 3.3: Data Fetching**
**File**: `/client/src/components/inventory-turnover-dashboard.tsx`

**Add React Query Hooks** (insert after line 290):

- [ ] **Query 1**: Prepack recommendations
  ```typescript
  const { data: prepackRecommendations, isLoading: prepackLoading } = useQuery<PrepackRecommendation[]>({
    queryKey: ["inventory", "prepack-restocking-recommendations", 20],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/prepack-restocking-recommendations?limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch prepack recommendations");
      return response.json();
    },
  });
  ```

**Modify Existing Query** (line 255):

- [ ] **Query 2**: Update transfer recommendations to fetch SKU details
  ```typescript
  const { data: transferRecommendations, isLoading: transferLoading } = useQuery<TransferRecommendationWithSKUs[]>({
    queryKey: ["inventory", "transfer-recommendations", useMLPredictions, showSKUDetails, 20],
    queryFn: async () => {
      const baseEndpoint = useMLPredictions
        ? '/api/inventory/transfer-recommendations-ml'
        : '/api/inventory/transfer-recommendations';

      const endpoint = showSKUDetails
        ? `${baseEndpoint}-sku`  // NEW: Fetch with SKU details
        : baseEndpoint;

      const response = await fetch(`${endpoint}?limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch transfer recommendations");
      return response.json();
    },
  });
  ```

**Acceptance Criteria**:
- [ ] Queries fetch data successfully
- [ ] Loading states display correctly
- [ ] Error states handled gracefully
- [ ] Query invalidation works on data changes

---

#### **Task 3.4: Enhanced Transfer Recommendations Section**
**File**: `/client/src/components/inventory-turnover-dashboard.tsx`

**Location**: Replace existing Transfer Recommendations card (lines 1147-1267)

**Changes**:

- [ ] **Add SKU Details Toggle** (in CardHeader)
  ```typescript
  <div className="flex items-center gap-4">
    {/* Existing ML Toggle */}
    <div className="flex items-center gap-2">
      <Label htmlFor="ml-toggle" className="text-sm">Use AI</Label>
      <Switch
        id="ml-toggle"
        checked={useMLPredictions}
        onCheckedChange={setUseMLPredictions}
      />
    </div>

    {/* NEW: SKU Details Toggle */}
    <div className="flex items-center gap-2">
      <Label htmlFor="sku-toggle" className="text-sm">Show SKU Details</Label>
      <Switch
        id="sku-toggle"
        checked={showSKUDetails}
        onCheckedChange={setShowSKUDetails}
      />
    </div>
  </div>
  ```

- [ ] **Add Expandable Row Logic** (in TableBody)
  ```typescript
  <TableBody>
    {transferRecommendations.map((item, index) => (
      <>
        {/* Main Row - Style Level */}
        <TableRow key={`${item.styleNumber}-${item.fromStore}-${item.toStore}-${index}`}>
          <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
          <TableCell className="max-w-xs truncate">{item.itemName}</TableCell>
          <TableCell>
            <Badge variant="outline" className="font-mono">{item.fromStore}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="font-mono bg-blue-50">{item.toStore}</Badge>
          </TableCell>
          <TableCell className="text-right font-semibold">{formatNumber(item.recommendedQty)}</TableCell>
          <TableCell className="text-right">{formatNumber(item.fromStoreQty)}</TableCell>
          <TableCell className="text-right">{formatNumber(item.toStoreQty)}</TableCell>
          <TableCell className="text-right">{item.fromStoreDailySales.toFixed(2)}</TableCell>
          <TableCell className="text-right text-blue-600 font-semibold">{item.toStoreDailySales.toFixed(2)}</TableCell>

          {/* NEW: Expand Button */}
          {showSKUDetails && item.skuDetails && item.skuDetails.length > 0 && (
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleTransferExpansion(item.styleNumber)}
              >
                {expandedTransfers.has(item.styleNumber) ? '▼' : '►'} {item.totalSKUs} SKUs
              </Button>
            </TableCell>
          )}

          <TableCell>
            <Badge variant={item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'secondary'}>
              {item.priority}
            </Badge>
          </TableCell>
        </TableRow>

        {/* Expanded Row - SKU Details */}
        {showSKUDetails && expandedTransfers.has(item.styleNumber) && item.skuDetails && (
          <>
            {item.skuDetails.map((sku, skuIndex) => (
              <TableRow key={`${sku.itemNumber}-${skuIndex}`} className="bg-muted/30">
                <TableCell className="pl-8 font-mono text-xs">{sku.itemNumber}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {sku.color && <Badge variant="outline" className="text-xs">{sku.color}</Badge>}
                    {sku.size && <Badge variant="secondary" className="text-xs">{sku.size}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">{formatNumber(sku.fromStoreQty)}</TableCell>
                <TableCell className="text-right text-sm">{formatNumber(sku.toStoreQty)}</TableCell>
                <TableCell className="text-right text-sm font-semibold text-blue-600">
                  Transfer {formatNumber(sku.recommendedQty)}
                </TableCell>
                <TableCell colSpan={4}></TableCell>
              </TableRow>
            ))}
          </>
        )}
      </>
    ))}
  </TableBody>
  ```

**Acceptance Criteria**:
- [ ] Toggle switches work correctly
- [ ] Rows expand/collapse smoothly
- [ ] SKU details display with correct formatting
- [ ] Color and size badges render correctly
- [ ] No layout shifts when toggling

---

#### **Task 3.5: New Prepack Restocking Section**
**File**: `/client/src/components/inventory-turnover-dashboard.tsx`

**Location**: Insert after existing Restocking Recommendations section (after line 1346)

**Implementation**:

- [ ] **Create Section Card**
  ```typescript
  {/* NEW SECTION: Prepack Restocking Recommendations */}
  <Card data-testid="card-prepack-restocking">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Prepack Restocking Recommendations</CardTitle>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                🎨 Color-Aware
              </Badge>
            </div>
            <CardDescription>
              Vendor prepacked boxes optimized for network-wide needs (showing top 20)
            </CardDescription>
          </div>
        </div>
        <Button
          onClick={handleExportPrepackRecommendations}
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="button-export-prepack-recommendations"
        >
          <Download className="w-3 h-3" />
          Export
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      {/* Content implementation below */}
    </CardContent>
  </Card>
  ```

- [ ] **Add Table Structure**
  ```typescript
  <CardContent>
    {prepackLoading ? (
      <p className="text-center text-muted-foreground py-8">Loading prepack recommendations...</p>
    ) : prepackRecommendations && prepackRecommendations.length > 0 ? (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Style #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Recommendation</TableHead>
              <TableHead className="text-right">Total Boxes</TableHead>
              <TableHead className="text-right">Total Pieces</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Waste %</TableHead>
              <TableHead className="text-right">Coverage %</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Row implementation below */}
          </TableBody>
        </Table>
      </div>
    ) : (
      <p className="text-center text-muted-foreground py-8">No prepack recommendations at this time</p>
    )}
  </CardContent>
  ```

- [ ] **Add Collapsed Row (Style-Level Summary)**
  ```typescript
  {prepackRecommendations.map((item, index) => (
    <>
      {/* Main Row */}
      <TableRow key={`prepack-${item.styleNumber}-${index}`} data-testid={`row-prepack-${index}`}>
        <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
        <TableCell className="max-w-xs truncate">{item.vendorName || 'Unknown'}</TableCell>
        <TableCell>
          <Badge variant={
            item.urgency === 'critical' ? 'destructive' :
            item.urgency === 'high' ? 'default' :
            item.urgency === 'medium' ? 'secondary' :
            'outline'
          }>
            {item.urgency.toUpperCase()}
          </Badge>
        </TableCell>
        <TableCell className="font-semibold max-w-md">
          {item.recommendation}
          {/* Example: "Order 5 boxes Pack A (Black) + 2 boxes Pack A (Olive)" */}
        </TableCell>
        <TableCell className="text-right">{formatNumber(item.totalBoxes)}</TableCell>
        <TableCell className="text-right">{formatNumber(item.totalPieces)}</TableCell>
        <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
        <TableCell className="text-right">
          <span className={item.wastePct < 0.10 ? 'text-green-600' : item.wastePct < 0.20 ? 'text-yellow-600' : 'text-orange-600'}>
            {(item.wastePct * 100).toFixed(1)}%
          </span>
        </TableCell>
        <TableCell className="text-right">
          <span className={item.coveragePct > 0.90 ? 'text-green-600' : item.coveragePct > 0.75 ? 'text-yellow-600' : 'text-orange-600'}>
            {(item.coveragePct * 100).toFixed(0)}%
          </span>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => togglePrepackExpansion(index)}
          >
            {expandedPrepacks.has(index) ? '▼ Hide' : '► Details'}
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded Row - Details */}
      {expandedPrepacks.has(index) && (
        <TableRow className="bg-muted/50">
          <TableCell colSpan={10} className="p-6">
            {/* Expanded content implementation below */}
          </TableCell>
        </TableRow>
      )}
    </>
  ))}
  ```

- [ ] **Add Expanded Row Content (2-Column Layout)**
  ```typescript
  <TableCell colSpan={10} className="p-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT COLUMN: Prepack Order Breakdown */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Prepack Order Breakdown
        </h4>
        <div className="space-y-2">
          {item.prepackBreakdown.map((pack, packIndex) => (
            <div key={`pack-${packIndex}`} className="flex justify-between items-center p-3 bg-background rounded border">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50">
                  {pack.color}
                </Badge>
                <span className="font-medium">
                  {pack.boxes}× {pack.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {pack.totalPieces} pieces
                </div>
                <div className="font-semibold">
                  {formatCurrency(pack.cost)}
                </div>
              </div>
            </div>
          ))}
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center font-bold">
              <span>Total Order:</span>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {item.totalBoxes} boxes • {item.totalPieces} pieces
                </div>
                <div className="text-lg">
                  {formatCurrency(item.totalCost)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Distribution Plan */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4" />
          Warehouse Distribution Plan
        </h4>
        <div className="space-y-2">
          {item.distributionPlan.map((store, storeIndex) => (
            <div key={`store-${storeIndex}`} className={`p-3 rounded border ${
              store.store === 'WAREHOUSE' ? 'bg-yellow-50 border-yellow-200' : 'bg-background'
            }`}>
              <div className="font-semibold mb-2 flex items-center gap-2">
                {store.store === 'WAREHOUSE' ? '🏢' : '🏪'} {store.store}
              </div>
              <div className="ml-4 space-y-1">
                {store.skus.map((sku, skuIndex) => (
                  <div key={`sku-${skuIndex}`} className="text-sm flex justify-between">
                    <span>
                      <Badge variant="outline" className="mr-2 text-xs">{sku.color}</Badge>
                      {sku.size}
                    </span>
                    <span className="font-medium">× {sku.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {item.warehouseReserve > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-sm">
              <strong>💡 Warehouse Reserve:</strong> {item.warehouseReserve} pieces
              ({((item.warehouseReserve / item.totalPieces) * 100).toFixed(0)}%)
              held for future distribution
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Prepack Configuration Reference */}
    <details className="mt-4 pt-4 border-t">
      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
        📋 View prepack size assortments
      </summary>
      <div className="mt-3 p-4 bg-muted/50 rounded space-y-2 text-sm">
        <div>
          <strong>Pack A (Standard):</strong> 30W (30%), 32W (20%), 34W (20%), 36W (10%), 38W (10%), 40W+ (10%)
        </div>
        <div>
          <strong>Pack B (Slim):</strong> 28W (10%), 30W (20%), 32W (30%), 34W (20%), 36W (20%)
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          * Each box contains one color in assorted sizes
        </div>
      </div>
    </details>
  </TableCell>
  ```

**Acceptance Criteria**:
- [ ] Section renders without errors
- [ ] Expandable rows work correctly
- [ ] Color badges display correctly
- [ ] Two-column layout responsive on different screen sizes
- [ ] Warehouse reserve calculation displays correctly
- [ ] Details section provides helpful context

---

#### **Task 3.6: Export Functionality**
**File**: `/client/src/components/inventory-turnover-dashboard.tsx`

**Add Export Handler** (after line 510):

- [ ] **Function**: `handleExportPrepackRecommendations()`
  ```typescript
  const handleExportPrepackRecommendations = () => {
    if (!prepackRecommendations || prepackRecommendations.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = formatDataForExport(prepackRecommendations, {
      styleNumber: 'Style Number',
      vendorName: 'Vendor',
      urgency: 'Urgency Level',
      recommendation: 'Recommendation',
      totalBoxes: 'Total Boxes',
      totalPieces: 'Total Pieces',
      totalCost: 'Total Cost',
      wastePct: 'Waste %',
      coveragePct: 'Coverage %',
      score: 'Optimization Score',
    });

    exportToExcel(exportData, 'prepack-restocking-recommendations', 'Prepack Recommendations');
  };
  ```

**Acceptance Criteria**:
- [ ] Export button triggers download
- [ ] Excel file contains all recommendations
- [ ] Column headers formatted correctly
- [ ] Numbers formatted as numbers (not text)
- [ ] Percentages displayed with % symbol

---

#### **Task 3.7: Page Title and Branding**
**File**: `/client/src/components/inventory-turnover-dashboard.tsx`

**Location**: Add new header section at the beginning of the return statement (before line 831)

- [ ] **Add Page Header**
  ```typescript
  return (
    <div className="space-y-6">
      {/* NEW: Page Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Inventory Action Center</h1>
            <Badge variant="outline" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-900 border-purple-200">
              🤖 AI-Enhanced
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            ML-powered transfers, color-aware prepack restocking, and clearance recommendations
          </p>
        </div>

        {/* Existing toolbar buttons */}
        <div className="flex gap-2">
          <InventorySettingsDialog
            settings={settings}
            onSave={handleSaveSettings}
            onReset={handleResetSettings}
          />
          <Button
            onClick={handleExportGoogleMarketing}
            variant="default"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export Google Marketing Report
          </Button>
          <Button
            onClick={handleExportAll}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export All to Excel
          </Button>
        </div>
      </div>

      {/* Existing toolbar section (delete old one at line 833-859) */}

      {/* Rest of existing content... */}
    </div>
  );
  ```

**Acceptance Criteria**:
- [ ] New header displays at top of page
- [ ] AI-Enhanced badge renders with gradient
- [ ] Description text is clear and concise
- [ ] Toolbar buttons aligned correctly
- [ ] Responsive layout on mobile devices

---

### **PHASE 4: Testing & Quality Assurance**

#### **Task 4.1: Unit Testing**

- [ ] **Backend Tests**:
  - [ ] Test `getTransferRecommendationsWithSKUs()` returns correct structure
  - [ ] Test `getStylesNeedingRestock()` filters correctly
  - [ ] Test API endpoints return HTTP 200 on success
  - [ ] Test API endpoints return HTTP 500 on error
  - [ ] Test authentication middleware blocks unauthenticated requests

- [ ] **ML Service Tests**:
  - [ ] Test `get_style_inventory_needs_by_color()` with Style 8501B
  - [ ] Test `optimize_color_aware()` with sample data
  - [ ] Test color parsing handles variations (BLK, Black, BLACK)
  - [ ] Test edge cases (no prepacks, zero inventory, missing data)

- [ ] **Frontend Tests**:
  - [ ] Test expansion state toggles correctly
  - [ ] Test data fetching with React Query
  - [ ] Test loading states display
  - [ ] Test error states display
  - [ ] Test export functionality downloads file

**Tools**:
- Backend: Jest or Node's built-in test runner
- ML Service: pytest
- Frontend: Vitest or React Testing Library

---

#### **Task 4.2: Integration Testing**

- [ ] **End-to-End Flow Tests**:
  - [ ] User views Inventory Action Center page
  - [ ] Transfer recommendations load successfully
  - [ ] User toggles "Show SKU Details" switch
  - [ ] SKU details expand/collapse correctly
  - [ ] Prepack recommendations load successfully
  - [ ] User expands prepack details
  - [ ] Distribution plan displays correctly
  - [ ] User exports recommendations to Excel
  - [ ] Excel file downloads with correct data

**Test Data**:
- Use Style 8501B as primary test case
- Verify with real database data
- Test with empty data (no recommendations)
- Test with partial data (only transfers, no prepacks)

---

#### **Task 4.3: Performance Testing**

- [ ] **Backend Performance**:
  - [ ] `getTransferRecommendationsWithSKUs()` executes in <500ms
  - [ ] `/api/inventory/prepack-restocking-recommendations` responds in <2s
  - [ ] Database queries optimized with proper indexes
  - [ ] No N+1 query problems

- [ ] **ML Service Performance**:
  - [ ] Batch optimization completes in <5s for 20 styles
  - [ ] Color-aware optimization <1s per style
  - [ ] Memory usage stays under 512MB

- [ ] **Frontend Performance**:
  - [ ] Initial page load <3s
  - [ ] Smooth animations (60fps)
  - [ ] No layout shift when expanding rows
  - [ ] Responsive on slower connections (3G)

**Tools**:
- Backend: Artillery or k6 for load testing
- Frontend: Lighthouse, Chrome DevTools
- Database: EXPLAIN ANALYZE for query optimization

---

#### **Task 4.4: User Acceptance Testing (UAT)**

- [ ] **Test Scenarios**:
  - [ ] Scenario 1: User needs to restock Style 8501B
    - [ ] Verify recommendation shows color-specific breakdown
    - [ ] Verify warehouse distribution plan is clear
    - [ ] Verify urgency level is appropriate

  - [ ] Scenario 2: User wants SKU-level transfer details
    - [ ] Toggle "Show SKU Details" switch
    - [ ] Expand style to see individual SKUs
    - [ ] Verify color and size display correctly

  - [ ] Scenario 3: User exports recommendations
    - [ ] Export prepack recommendations to Excel
    - [ ] Open Excel file and verify data
    - [ ] Verify formatting is professional

- [ ] **Usability Checks**:
  - [ ] Is the UI intuitive without training?
  - [ ] Are color-specific recommendations clear?
  - [ ] Is the warehouse distribution plan understandable?
  - [ ] Are urgency levels helpful for prioritization?
  - [ ] Is the page responsive on different screen sizes?

---

### **PHASE 5: Documentation & Deployment**

#### **Task 5.1: Code Documentation**

- [ ] **Add JSDoc Comments** to new functions:
  - [ ] `getTransferRecommendationsWithSKUs()`
  - [ ] `getStylesNeedingRestock()`
  - [ ] `toggleTransferExpansion()`
  - [ ] `togglePrepackExpansion()`
  - [ ] `handleExportPrepackRecommendations()`

- [ ] **Add Python Docstrings** to new functions:
  - [ ] `get_style_inventory_needs_by_color()`
  - [ ] `get_styles_needing_restock()`
  - [ ] `optimize_color_aware()`

- [ ] **Update README Files**:
  - [ ] `/docs/README.md` - Add link to this implementation doc
  - [ ] `/ml_service/README_PREPACK_DRAFT.md` - Update status to "ACTIVE"

---

#### **Task 5.2: User Documentation**

- [ ] **Create User Guide**: `/docs/USER_GUIDE_INVENTORY_ACTION_CENTER.md`
  - [ ] Section 1: Overview of Inventory Action Center
  - [ ] Section 2: Understanding Transfer Recommendations
  - [ ] Section 3: Using SKU Details View
  - [ ] Section 4: Understanding Prepack Recommendations
  - [ ] Section 5: Reading the Distribution Plan
  - [ ] Section 6: Urgency Levels Explained
  - [ ] Section 7: Exporting Recommendations
  - [ ] Section 8: FAQ

- [ ] **Create Screenshots**:
  - [ ] Screenshot 1: Main page overview
  - [ ] Screenshot 2: Transfer recommendations with SKU details expanded
  - [ ] Screenshot 3: Prepack recommendation expanded view
  - [ ] Screenshot 4: Distribution plan example

---

#### **Task 5.3: Deployment Preparation**

- [ ] **Environment Configuration**:
  - [ ] Verify `ML_SERVICE_URL` environment variable set
  - [ ] Verify database connection string configured
  - [ ] Verify all API endpoints accessible

- [ ] **Database Preparation**:
  - [ ] Verify `item_list` table populated
  - [ ] Verify `sales_transactions` table populated
  - [ ] Verify `receiving_vouchers` table populated
  - [ ] Run `db:push` to sync schema if needed

- [ ] **Prepack Data Setup**:
  - [ ] Add vendor prepack configurations to database
  - [ ] Verify Argonaut Nations Pack A and Pack B configurations
  - [ ] Test with real vendor data

- [ ] **Build and Deploy**:
  - [ ] Run `npm run build` successfully
  - [ ] Test production build locally
  - [ ] Deploy to staging environment
  - [ ] Run smoke tests on staging
  - [ ] Deploy to production

---

#### **Task 5.4: Monitoring and Observability**

- [ ] **Add Logging**:
  - [ ] Backend: Log prepack recommendation requests
  - [ ] ML Service: Log optimization performance metrics
  - [ ] Frontend: Log component errors to console

- [ ] **Add Metrics**:
  - [ ] Track API response times
  - [ ] Track ML optimization success rate
  - [ ] Track user engagement with new features

- [ ] **Set Up Alerts**:
  - [ ] Alert if prepack API fails repeatedly
  - [ ] Alert if optimization takes >10s
  - [ ] Alert if error rate exceeds 5%

---

## 📈 Success Criteria

### **Functionality**
- [ ] All new API endpoints return valid responses
- [ ] ML service generates color-aware recommendations
- [ ] Frontend displays recommendations correctly
- [ ] Expandable rows work smoothly
- [ ] Export functionality produces valid Excel files

### **Performance**
- [ ] Page loads in <3 seconds
- [ ] API responses in <2 seconds
- [ ] ML optimization completes in <5 seconds for 20 styles
- [ ] No memory leaks or performance degradation

### **User Experience**
- [ ] UI is intuitive and easy to navigate
- [ ] Color-specific recommendations are clear
- [ ] Warehouse distribution plan is understandable
- [ ] Urgency levels help prioritization
- [ ] Responsive on mobile devices

### **Code Quality**
- [ ] TypeScript compiles without errors
- [ ] No console errors or warnings
- [ ] Code follows existing patterns
- [ ] Functions are documented
- [ ] Tests pass

### **Business Value**
- [ ] Users can optimize prepack orders by color
- [ ] Waste reduction from 20-30% to 0-5%
- [ ] Faster decision-making with clear recommendations
- [ ] Better inventory distribution across stores

---

## 🚨 Risks and Mitigations

### **Risk 1: Prepack Data Not Available**
- **Impact**: Cannot generate recommendations
- **Probability**: Medium
- **Mitigation**:
  - Start with manual vendor data entry
  - Build data import tool later
  - Use dummy data for testing

### **Risk 2: ML Service Performance Issues**
- **Impact**: Slow page loads, poor UX
- **Probability**: Low
- **Mitigation**:
  - Implement caching (Redis)
  - Add timeout fallbacks
  - Optimize algorithms

### **Risk 3: User Confusion with New UI**
- **Impact**: Low adoption, support tickets
- **Probability**: Medium
- **Mitigation**:
  - Create user guide with screenshots
  - Add tooltips/help text
  - Provide training session

### **Risk 4: Backend API Overload**
- **Impact**: System slowdown
- **Probability**: Low
- **Mitigation**:
  - Add rate limiting
  - Implement pagination
  - Use database indexes

---

## 📝 Notes for Developers

### **Key Design Patterns Used**

1. **Progressive Disclosure**: Collapsed by default, expand for details
2. **Consistent Styling**: Follow existing Card/Table patterns
3. **Graceful Degradation**: Fallback to empty state if ML service fails
4. **Separation of Concerns**: Backend handles data, ML service handles optimization, frontend handles display

### **Important Files**

- `/client/src/components/inventory-turnover-dashboard.tsx` - Main UI component (1,436 lines)
- `/server/routes.ts` - API endpoints (1,920 lines)
- `/ml_service/main.py` - ML service endpoints (795 lines)
- `/ml_service/models/prepack_optimizer.py` - Optimization logic (needs color-awareness)

### **Color Parsing Strategy**

Colors are stored in `item_list.attribute` field with variations:
- "BLK", "Black", "BLACK" → normalize to "Black"
- "OLV", "Olive", "OLIVE" → normalize to "Olive"
- Use regex or lookup table for normalization

### **Testing with Style 8501B**

Style 8501B (Argonaut Nations jeans) is the reference test case:
- Has Pack A and Pack B configurations
- Multiple colors: Black (80%), Olive (15%), Navy (5%)
- Size range: 28W-44W × 30L-34L
- Use this for all testing and validation

---

## 🎉 Implementation Timeline

**Total Estimated Time**: 5-7 days

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1 | Backend Foundation | 1-2 days | HIGH |
| Phase 2 | ML Service Enhancement | 2-3 days | HIGH |
| Phase 3 | Frontend Implementation | 2-3 days | HIGH |
| Phase 4 | Testing & QA | 1-2 days | MEDIUM |
| Phase 5 | Documentation & Deployment | 1 day | MEDIUM |

**Recommended Sequence**:
1. Complete Phase 1 (Backend) first
2. Complete Phase 2 (ML Service) second
3. Complete Phase 3 (Frontend) third
4. Run Phase 4 (Testing) throughout
5. Finalize Phase 5 (Documentation) before deployment

---

## ✅ Sign-Off Checklist

Before marking this implementation as complete:

- [ ] All checkboxes in this document are checked
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code review completed and approved
- [ ] Documentation is complete and reviewed
- [ ] User guide created with screenshots
- [ ] Deployed to staging and tested
- [ ] Performance meets success criteria
- [ ] User acceptance testing completed
- [ ] Production deployment successful
- [ ] Monitoring and alerts configured

---

**Document Status**: ✅ READY FOR IMPLEMENTATION

**Approval Required From**:
- [ ] Product Owner
- [ ] Technical Lead
- [ ] UX Designer (optional)

**Next Steps**:
1. Review this document with the team
2. Assign tasks to developers
3. Set up project tracking (Jira/Linear/etc.)
4. Begin Phase 1 implementation

---

**END OF IMPLEMENTATION PLAN**
