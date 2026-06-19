import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurations
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// Use a high-quality free model or a super cheap one
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'; 
const BATCH_SIZE = 50; // Translate 50 keys at a time to prevent token limits

const localesDir = path.join(__dirname, '../src/locales');
const sourceFile = path.join(localesDir, 'en.json');
const targetLanguages = ['de', 'es', 'fr', 'it'];

// Helper to flatten nested JSON
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

// Helper to unflatten JSON
function unflatten(flatObj) {
  let result = {};
  for (let key in flatObj) {
    const keys = key.split('.');
    keys.reduce((acc, part, idx) => {
      if (idx === keys.length - 1) {
        acc[part] = flatObj[key];
      } else {
        acc[part] = acc[part] || {};
      }
      return acc[part];
    }, result);
  }
  return result;
}

async function translateBatch(batch, targetLang) {
  if (!OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const prompt = `You are a professional tennis analytics application translator. Translate the following key-value pairs from English to the target language: "${targetLang}".
Return ONLY a valid JSON object matching the input structure, with keys unchanged and values translated. Do not include markdown code block formatting (such as \`\`\`json), explanations, or notes.

Input JSON to translate:
${JSON.stringify(batch, null, 2)}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://backhandtl.com',
        'X-Title': 'Backhand DTL Translation'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Strip markdown formatting if any
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(content);
  } catch (error) {
    console.error(`Error translating batch to ${targetLang}:`, error);
    return null;
  }
}

async function main() {
  if (!fs.existsSync(sourceFile)) {
    console.error(`Source locale file not found: ${sourceFile}`);
    return;
  }

  if (!OPENROUTER_API_KEY) {
    console.log('--- DRY RUN: OPENROUTER_API_KEY is not set. Run this command with OPENROUTER_API_KEY=your_key to translate. ---');
  }

  const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  const flatSource = flatten(sourceData);

  for (const lang of targetLanguages) {
    const targetFile = path.join(localesDir, `${lang}.json`);
    let targetData = {};
    if (fs.existsSync(targetFile)) {
      targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    }

    const flatTarget = flatten(targetData);
    const missingKeys = {};

    for (const key in flatSource) {
      if (flatTarget[key] === undefined || flatTarget[key] === '') {
        missingKeys[key] = flatSource[key];
      }
    }

    const missingKeysCount = Object.keys(missingKeys).length;
    console.log(`\nLanguage [${lang.toUpperCase()}]: Found ${missingKeysCount} missing/empty keys.`);

    if (missingKeysCount === 0) {
      continue;
    }

    if (!OPENROUTER_API_KEY) {
      console.log(`[DRY RUN] Would translate ${missingKeysCount} keys:`, Object.keys(missingKeys));
      continue;
    }

    // Process in batches
    const keys = Object.keys(missingKeys);
    let translatedCount = 0;

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batchKeys = keys.slice(i, i + BATCH_SIZE);
      const batchObj = {};
      batchKeys.forEach(k => batchObj[k] = missingKeys[k]);

      console.log(`  Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(keys.length / BATCH_SIZE)} (${batchKeys.length} keys)...`);
      const translatedBatch = await translateBatch(batchObj, lang);

      if (translatedBatch) {
        for (const k in translatedBatch) {
          flatTarget[k] = translatedBatch[k];
          translatedCount++;
        }
      }
    }

    if (translatedCount > 0) {
      const newTargetObj = unflatten(flatTarget);
      fs.writeFileSync(targetFile, JSON.stringify(newTargetObj, null, 2), 'utf8');
      console.log(`  Successfully updated ${targetFile} with ${translatedCount} translated keys.`);
    }
  }

  console.log('\nTranslation process completed.');
}

main();
