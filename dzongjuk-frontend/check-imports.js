const fs = require('fs');
const path = require('path');

const srcDir = 'src';

function findFiles(dir) {
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findFiles(fullPath));
    } else if (item.endsWith('.jsx') || item.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findFiles(srcDir);
const broken = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const importRe = /import\s+.*?\s+from\s+['"](\.[^'"]+)['"]/g;
  let match;
  while ((match = importRe.exec(content)) !== null) {
    const importPath = match[1];
    const dir = path.dirname(file);
    const resolved = path.join(dir, importPath);
    const extensions = ['', '.js', '.jsx', '/index.js', '/index.jsx'];
    const exists = extensions.some(function(ext) {
      try { return fs.existsSync(resolved + ext); } catch(e) { return false; }
    });
    if (!exists) {
      broken.push({ file: file, importPath: importPath, resolved: resolved });
    }
  }
}

if (broken.length === 0) {
  console.log('All local imports resolved OK!');
} else {
  broken.forEach(function(b) { console.log('BROKEN: ' + b.file + ' imports ' + b.importPath); });
}
