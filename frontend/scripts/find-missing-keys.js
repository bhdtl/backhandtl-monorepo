import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');
const enLocFile = path.join(srcDir, 'locales/en.json');
const outputFile = 'C:\\Users\\phina\\.gemini\\antigravity\\brain\\df764a91-5cc0-4b7e-b365-90d908c05467\\scratch\\filtered-missing-keys.json';

// Read and flatten en.json
const enData = JSON.parse(fs.readFileSync(enLocFile, 'utf8'));
function flatten(obj, prefix = '') {
  let result = {};
  for (let key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}
const enKeys = new Set(Object.keys(flatten(enData)));

// Regex to find t('key', 'default') or t("key", "default")
const tCallRegex = /t\(\s*(['"`])(.*?)\1/g;

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walkDir(filePath, callback);
      }
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      callback(filePath);
    }
  }
}

const missingKeys = {};

walkDir(srcDir, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  tCallRegex.lastIndex = 0;
  while ((match = tCallRegex.exec(content)) !== null) {
    const key = match[2];
    
    // Ignore dynamic variables, sql-looking strings, and delimiters
    if (key.includes('${') || key.includes(',') || key.includes(' ') || key.includes('*') || key.includes('\n')) {
      continue;
    }
    
    // Ignore standard DB columns and names
    if (/^(id|select|from|where|order|by|created_at|player_id|overall_rating|bounce|notes|surface|bsi|tags)$/.test(key)) {
      continue;
    }
    
    // Ignore dynamic namespaces that are translated programmatically
    if (key.startsWith('skills.') || key.startsWith('playStyle.') || key.startsWith('surfaces.')) {
      continue;
    }
    
    if (!enKeys.has(key)) {
      if (!missingKeys[key]) {
        missingKeys[key] = [];
      }
      if (!missingKeys[key].includes(path.relative(srcDir, filePath))) {
        missingKeys[key].push(path.relative(srcDir, filePath));
      }
    }
  }
});

fs.writeFileSync(outputFile, JSON.stringify(missingKeys, null, 2), 'utf8');
console.log(`Successfully wrote missing keys to ${outputFile}`);
