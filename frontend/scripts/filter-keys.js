import fs from 'fs';
import path from 'path';

const filePath = 'C:\\Users\\phina\\.gemini\\antigravity\\brain\\df764a91-5cc0-4b7e-b365-90d908c05467\\scratch\\missing-keys.json';
const fileContent = fs.readFileSync(filePath, 'utf8');

// Strip the prefix
const jsonPart = fileContent.substring(fileContent.indexOf('{'));
const data = JSON.parse(jsonPart);

const filteredKeys = [];
for (const key in data) {
  // Filter for actual nested or flat translation keys (e.g. word.word or word)
  // Exclude database queries, SQL columns, commas, spaces, etc.
  if (/^[a-zA-Z0-9\._\-]+$/.test(key) && 
      !/^(id|select|from|where|order|by|created_at|player_id|overall_rating|bounce|notes|surface|bsi|tags)$/.test(key) &&
      !key.includes(',') && !key.includes(' ') && !key.includes('*')) {
    filteredKeys.push({ key, files: data[key] });
  }
}

console.log(JSON.stringify(filteredKeys, null, 2));
