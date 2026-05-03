#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'public', 'templates');
const templateFiles = ['twenties.json', 'thirties.json', 'forties.json', 'fifties.json'];

let allValid = true;

templateFiles.forEach(fileName => {
  const filePath = path.join(templatesDir, fileName);
  console.log(`\n========== Validating ${fileName} ==========`);

  try {
    // 1. JSON構文チェック
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    console.log(`✓ JSON syntax valid`);

    // 2. items と entries の整合性チェック
    const items = data.financialDetail?.items || [];
    const entries = data.financialDetail?.entries || [];

    // itemId のマップを作成
    const validItemIds = new Set(items.map(item => item.id));
    console.log(`  - Total items: ${items.length}`);
    console.log(`  - Total entries: ${entries.length}`);

    // entries の itemId が有効か確認
    let invalidEntries = [];
    entries.forEach((entry, index) => {
      if (!validItemIds.has(entry.itemId)) {
        invalidEntries.push({ index, itemId: entry.itemId, yearMonth: entry.yearMonth });
      }
    });

    if (invalidEntries.length > 0) {
      console.log(`✗ Found ${invalidEntries.length} invalid itemId(s) in entries:`);
      invalidEntries.slice(0, 5).forEach(e => {
        console.log(`    - Entry ${e.index}: itemId="${e.itemId}" (yearMonth: ${e.yearMonth})`);
      });
      if (invalidEntries.length > 5) {
        console.log(`    ... and ${invalidEntries.length - 5} more`);
      }
      allValid = false;
    } else {
      console.log(`✓ All entries have valid itemIds`);
    }

    // 3. 必須フィールドチェック
    const requiredFields = ['id', 'title', 'financial', 'happiness', 'financialDetail'];
    const missingFields = requiredFields.filter(field => !(field in data));

    if (missingFields.length > 0) {
      console.log(`✗ Missing required fields: ${missingFields.join(', ')}`);
      allValid = false;
    } else {
      console.log(`✓ All required fields present`);
    }

    // 4. 月次データの期間チェック (2026-05 ～ 2029-04 のはず)
    if (entries.length > 0) {
      const yearMonths = [...new Set(entries.map(e => e.yearMonth))].sort();
      console.log(`  - Date range: ${yearMonths[0]} to ${yearMonths[yearMonths.length - 1]}`);
      if (yearMonths[0] !== '2026-05' || yearMonths[yearMonths.length - 1] !== '2029-04') {
        console.log(`  ⚠ Warning: Expected 2026-05 to 2029-04`);
      }
    }

  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    allValid = false;
  }
});

console.log(`\n========== Summary ==========`);
if (allValid) {
  console.log(`✓ All templates are valid!`);
  process.exit(0);
} else {
  console.log(`✗ Some validation errors found`);
  process.exit(1);
}
