// Direct database refresh script for community updates
const { execSync } = require('child_process');

console.log('Starting global community database refresh...');

try {
  // Execute the community refresh via TypeScript
  execSync('npx tsx -e "' +
    'import { communityRefreshService } from \'./server/community-refresh\'; ' +
    'communityRefreshService.regenerateAllUserCommunities().then(() => {' +
    '  console.log(\'Community refresh completed successfully\');' +
    '  process.exit(0);' +
    '}).catch((error) => {' +
    '  console.error(\'Community refresh failed:\', error);' +
    '  process.exit(1);' +
    '})"', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('Failed to execute community refresh:', error);
  process.exit(1);
}