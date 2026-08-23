'use strict';

require('dotenv').config();
const { launchReadiness } = require('../src/launch-readiness');

const status = launchReadiness();
console.log(`UltraLaunch AI launch readiness: ${status.requiredPassed}/${status.requiredTotal} required checks passed`);
console.log(status.ready ? 'Status: READY FOR PAID LAUNCH' : 'Status: NOT READY FOR PAID LAUNCH');
console.log('');
for (const item of status.checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.name}: ${item.detail}`);
  if (!item.ok && item.action) console.log(`   action: ${item.action}`);
}
console.log('');
console.log('Next manual actions:');
if (!status.nextManualActions.length) console.log('- None. Run Stripe test checkout and start outreach.');
for (const action of status.nextManualActions) console.log(`- ${action}`);
process.exit(status.ready ? 0 : 1);
