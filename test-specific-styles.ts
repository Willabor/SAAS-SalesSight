// Test specific styles that might be failing
import { calculateMetricsForStylesMultidim } from './server/lib/receiving-metrics-calculator-multidim';

const testStyles = ['504 4-Stripe', 'SHAWLNECK', '00501-2089', 'HOUTX', '194950005'];

console.log('🧪 Testing Potentially Failing Styles');
console.log('=====================================');
console.log('Test styles:', testStyles);
console.log('');

calculateMetricsForStylesMultidim(testStyles, 'test-user')
  .then(results => {
    console.log('✅ SUCCESS! Got', results.length, 'results out of', testStyles.length, 'styles');
    console.log('');

    if (results.length < testStyles.length) {
      console.log('⚠️ Some styles had no results (likely no receiving history)');
    }

    console.log('Sample results:');
    results.slice(0, 2).forEach((r, i) => {
      console.log(`\n--- Result ${i + 1} ---`);
      console.log(JSON.stringify(r, null, 2));
    });

    process.exit(0);
  })
  .catch(error => {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
