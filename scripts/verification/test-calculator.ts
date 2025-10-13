// Quick test of multi-dimensional calculator
import { calculateMetricsForStylesMultidim } from './server/lib/receiving-metrics-calculator-multidim';

const testStyles = ['TOMBRA', 'Luck12', 'SANSHARK'];

console.log('🧪 Testing Multi-Dimensional Calculator');
console.log('========================================');
console.log('Test styles:', testStyles);
console.log('');

calculateMetricsForStylesMultidim(testStyles, 'test-user')
  .then(results => {
    console.log('✅ SUCCESS! Got', results.length, 'results');
    console.log('');
    console.log('Sample result:');
    console.log(JSON.stringify(results[0], null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
