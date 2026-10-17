import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, 'dist');
const indexFile = path.join(dist, 'index.html');
const demoDir = path.join(dist, 'demo');

if (fs.existsSync(indexFile)) {
  fs.mkdirSync(demoDir, { recursive: true });
  fs.copyFileSync(indexFile, path.join(demoDir, 'index.html'));
  console.log('✓ Successfully created dist/demo/index.html for direct static routing');
}
