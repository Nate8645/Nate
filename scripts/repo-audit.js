'use strict';

const fs = require('fs');
const path = require('path');
const { repositoryExtensionAudit } = require('../src/repository-intelligence');

const audit = repositoryExtensionAudit();
const outputPath = process.argv.includes('--write')
  ? path.join(process.cwd(), 'GITHUB_SKILLS_INTEGRATION_AUDIT.generated.json')
  : null;

if (outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));
  console.log(`Wrote ${outputPath}`);
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log('UltraLaunch AI repository extension audit');
  console.log(`Scanned at: ${audit.scannedAt}`);
  console.log(`Total records: ${audit.summary.total}`);
  console.log(`Integrated adapters: ${audit.summary.integrated}`);
  console.log(`Adapter-only assets: ${audit.summary.adapters}`);
  console.log(`Not present/skipped: ${audit.summary.notPresent}`);
  console.log(`Review required: ${audit.summary.reviewRequired}`);
  console.log('\nRecords by type:');
  const groups = audit.records.reduce((acc, record) => {
    acc[record.type] = (acc[record.type] || 0) + 1;
    return acc;
  }, {});
  for (const [type, count] of Object.entries(groups)) console.log(`- ${type}: ${count}`);
  console.log('\nUse --json to print full JSON or --write to create GITHUB_SKILLS_INTEGRATION_AUDIT.generated.json');
}
