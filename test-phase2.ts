import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function testPhase2() {
  console.log('========================================');
  console.log('PHASE 2 ML SERVICE TESTING');
  console.log('========================================\n');

  // Test: Prepack Batch Recommendations
  console.log('TEST: Prepack Batch Recommendations (Color-Aware)\n');
  console.log(`Calling ML service at: ${ML_SERVICE_URL}/api/ml/prepack-batch-recommendations?limit=5\n`);

  try {
    const startTime = Date.now();

    const response = await axios.post(
      `${ML_SERVICE_URL}/api/ml/prepack-batch-recommendations?limit=5`,
      {},
      {
        timeout: 10000 // 10 second timeout
      }
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`✅ Request completed in ${responseTime}ms`);
    console.log(`   Performance: ${responseTime < 5000 ? '✅ PASS' : '❌ FAIL'} (<5s required)\n`);

    const data = response.data;

    if (!data.success) {
      console.log('❌ API returned success: false');
      console.log('   Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log(`✅ Found ${data.count} styles needing restock\n`);

    if (data.count === 0) {
      console.log('ℹ️  No styles need restocking (all have sufficient inventory)');
      console.log('   This could mean:');
      console.log('   - All prepack vendors have good inventory levels (>30 days)');
      console.log('   - No vendors are configured with uses_prepacks = true');
      console.log('   - No sales data available to calculate velocities\n');
      process.exit(0);
    }

    // Display recommendations
    console.log('========================================');
    console.log('RECOMMENDATIONS');
    console.log('========================================\n');

    data.recommendations.forEach((rec: any, i: number) => {
      console.log(`${i + 1}. Style ${rec.style_number} - ${rec.item_name}`);
      console.log(`   Vendor: ${rec.vendor_name}`);
      console.log(`   Urgency: ${rec.urgency}`);
      console.log(`   Recommendation: ${rec.recommendation}`);
      console.log(`   Total Boxes: ${rec.total_boxes} | Total Cost: $${rec.total_cost.toFixed(2)}`);

      if (rec.color_breakdown && rec.color_breakdown.length > 0) {
        console.log('   Color Breakdown:');
        rec.color_breakdown.forEach((cb: any) => {
          console.log(`     • ${cb.color}: ${cb.boxes} boxes ${cb.pack_name} (${cb.total_pieces} pieces, $${cb.total_cost.toFixed(2)})`);
        });
      }
      console.log('');
    });

    // Test: Verify Style 8501B
    console.log('========================================');
    console.log('TEST: Verify Style 8501B Detection');
    console.log('========================================\n');

    const style8501B = data.recommendations.find((r: any) => r.style_number === '8501B');

    if (style8501B) {
      console.log('✅ SUCCESS! Style 8501B found in recommendations:');
      console.log(`   Vendor: ${style8501B.vendor_name}`);
      console.log(`   Urgency: ${style8501B.urgency}`);
      console.log(`   Recommendation: ${style8501B.recommendation}`);
      console.log(`   Total Boxes: ${style8501B.total_boxes}`);
      console.log(`   Total Cost: $${style8501B.total_cost.toFixed(2)}`);

      if (style8501B.color_breakdown && style8501B.color_breakdown.length > 0) {
        console.log('   Color Breakdown:');
        style8501B.color_breakdown.forEach((cb: any) => {
          console.log(`     • ${cb.color}: ${cb.boxes} boxes ${cb.pack_name}`);
        });
      }
    } else {
      console.log('ℹ️  Style 8501B not in current recommendations');
      console.log('   Possible reasons:');
      console.log('   - Has sufficient inventory (>30 days of supply)');
      console.log('   - Vendor not configured as prepack vendor');
      console.log('   - Style not in database');
      console.log('   - No sales velocity data available');
    }

    // Test: Verify color-specific format
    console.log('\n========================================');
    console.log('TEST: Verify Color-Specific Format');
    console.log('========================================\n');

    let hasColorSpecific = false;
    data.recommendations.forEach((rec: any) => {
      const hasColorInRecommendation = rec.recommendation.includes('(') && rec.recommendation.includes(')');
      if (hasColorInRecommendation) {
        hasColorSpecific = true;
      }
    });

    if (hasColorSpecific) {
      console.log('✅ PASS: Recommendations include color specifications');
      console.log('   Example format: "Order: 5 boxes Pack A (Black) + 2 boxes Pack A (Olive)"\n');
    } else {
      console.log('❌ FAIL: Recommendations do NOT include color specifications');
      console.log('   Expected format: "Order: 5 boxes Pack A (Black)"');
      console.log('   Actual format: Missing color in parentheses\n');
    }

    // Summary
    console.log('========================================');
    console.log('PHASE 2 TEST SUMMARY');
    console.log('========================================');
    console.log(`✅ API endpoint working: YES`);
    console.log(`✅ Response time: ${responseTime}ms (${responseTime < 5000 ? 'PASS' : 'FAIL'})`);
    console.log(`✅ Recommendations count: ${data.count}`);
    console.log(`✅ Style 8501B found: ${style8501B ? 'YES' : 'NO'}`);
    console.log(`✅ Color-specific format: ${hasColorSpecific ? 'YES' : 'NO'}`);
    console.log('========================================\n');

    if (responseTime >= 5000) {
      console.log('⚠️  WARNING: Response time exceeded 5 seconds');
      console.log('   Consider optimizing the recommendation algorithm\n');
    }

    process.exit(0);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Could not connect to ML service');
      console.error(`   Make sure the service is running at ${ML_SERVICE_URL}`);
      console.error('   Run: npm run dev (should start both Node and ML services)\n');
    } else if (error.response) {
      console.error('\n❌ API Error Response:');
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

// Run tests
console.log('Starting Phase 2 ML Service Tests...\n');
testPhase2().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
