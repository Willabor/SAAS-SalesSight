import { storage } from './server/storage';

async function testPhase1() {
  console.log('========================================');
  console.log('PHASE 1 BACKEND API TESTING');
  console.log('========================================\n');

  // Test 1: Transfer Recommendations with SKUs
  console.log('TEST 1: Transfer Recommendations with SKU Details\n');
  console.log('Fetching recommendations...');

  const transferRecs = await storage.getTransferRecommendationsWithSKUs(3);

  console.log(`✅ Found ${transferRecs.length} transfer recommendations\n`);

  transferRecs.forEach((rec, i) => {
    console.log(`${i + 1}. Style ${rec.styleNumber} - ${rec.itemName}`);
    console.log(`   Category: ${rec.category || 'N/A'}`);
    console.log(`   From: ${rec.fromStore} → To: ${rec.toStore}`);
    console.log(`   Quantities: ${rec.fromStoreQty} → ${rec.toStoreQty}`);
    console.log(`   Daily Sales: ${rec.fromStoreDailySales}/day → ${rec.toStoreDailySales}/day`);
    console.log(`   Recommended Transfer: ${rec.recommendedQty} units`);
    console.log(`   Priority: ${rec.priority} | Margin: ${rec.avgMarginPercent}%`);
    console.log(`   SKU Details: ${rec.skuDetails.length} SKUs`);

    // Show first 3 SKUs
    rec.skuDetails.slice(0, 3).forEach(sku => {
      console.log(`     • ${sku.sku}: ${sku.color || 'N/A'} / Size ${sku.size || 'N/A'}`);
      console.log(`       From Store: ${sku.fromStoreQty} | To Store: ${sku.toStoreQty}`);
    });
    console.log('');
  });

  // Test 2: Prepack Restocking Recommendations
  console.log('\n========================================');
  console.log('TEST 2: Prepack Restocking Recommendations\n');
  console.log('Fetching styles needing restock from prepack vendors...');

  const restockRecs = await storage.getStylesNeedingRestock(10);

  console.log(`✅ Found ${restockRecs.length} styles needing restock\n`);

  if (restockRecs.length === 0) {
    console.log('ℹ️  No styles currently need restocking (all have sufficient inventory)');
    console.log('   This could mean:');
    console.log('   - All prepack vendors have good inventory levels (>30 days)');
    console.log('   - No vendors are configured with uses_prepacks = true');
    console.log('   - No sales data available to calculate velocities\n');
  } else {
    restockRecs.forEach((rec, i) => {
      console.log(`${i + 1}. Style ${rec.styleNumber} - ${rec.itemName}`);
      console.log(`   Vendor: ${rec.vendorName} (Prepack Vendor: ${rec.usesPrepacks})`);
      console.log(`   Category: ${rec.category || 'N/A'}`);
      console.log(`   Current Stock: ${rec.totalActiveQty} units`);
      console.log(`   Avg Daily Sales: ${rec.avgDailySales} units/day`);
      console.log(`   Days of Supply: ${rec.daysOfSupply} days`);
      console.log(`   Urgency: ${rec.urgency}`);
      console.log(`   Recommended Order: ${rec.recommendedOrderQty} units`);

      if (rec.lastReceived) {
        console.log(`   Last Received: ${rec.lastReceived} (${rec.daysSinceLastReceive} days ago)`);
      } else {
        console.log(`   Last Received: Never`);
      }
      console.log('');
    });
  }

  // Test 3: Check for Style 8501B
  console.log('\n========================================');
  console.log('TEST 3: Verify Style 8501B Detection\n');

  const style8501B = restockRecs.find(r => r.styleNumber === '8501B');

  if (style8501B) {
    console.log('✅ SUCCESS! Style 8501B found in restock recommendations:');
    console.log(`   Vendor: ${style8501B.vendorName}`);
    console.log(`   Days of Supply: ${style8501B.daysOfSupply}`);
    console.log(`   Urgency: ${style8501B.urgency}`);
    console.log(`   Recommended Order: ${style8501B.recommendedOrderQty} units`);
  } else {
    console.log('ℹ️  Style 8501B not in current restock list');
    console.log('   Possible reasons:');
    console.log('   - Has sufficient inventory (>30 days of supply)');
    console.log('   - Vendor not configured as prepack vendor');
    console.log('   - Style not in database');
    console.log('   - No sales velocity data available');
  }

  console.log('\n========================================');
  console.log('PHASE 1 TESTING COMPLETE');
  console.log('========================================');

  process.exit(0);
}

// Run tests
testPhase1().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
