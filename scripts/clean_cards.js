/**
 * clean_cards.js
 * 批量清理卡片格式问题，生成修复 SQL
 *
 * 清理规则:
 *   1. 统一换行符 \r\n → \n
 *   2. 去除首尾空白
 *   3. 合并多余空行（3+ → 2）
 *   4. 删除答案中的 "---" 分隔线残留
 *   5. 删除 "「小番薯资料铺」" 水印
 *   6. 删除 A:/答案:/答: 等答案前缀
 *   7. 英文 ? 改中文 ？（仅题目）
 */

const fs = require('fs');
const cards = JSON.parse(fs.readFileSync('scripts/exported_cards.json', 'utf-8'));

// Track cleaned question texts to avoid creating duplicates
const cleanedQuestions = new Map(); // questionLower → cardId

function wouldDuplicate(originalCard, newQuestion, map) {
  const key = newQuestion.trim().toLowerCase();
  const existing = map.get(key);
  if (existing && existing !== originalCard.id) {
    return true; // would create duplicate
  }
  map.set(key, originalCard.id);
  return false;
}

// Pre-populate with original questions so we detect conflicts
for (const c of cards) {
  const key = (c.question || '').trim().toLowerCase();
  if (!cleanedQuestions.has(key)) {
    cleanedQuestions.set(key, c.id);
  }
}

function esc(s) {
  if (s == null || s === '') return '';
  return s.replace(/'/g, "''");
}

const updates = [];
const skipped = [];

for (const c of cards) {
  let q = c.question || '';
  let a = c.answer || '';
  const changes = [];

  // 1. Normalize line endings
  if (a.includes('\r\n') || a.includes('\r')) {
    const before = a;
    a = a.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (a !== before) changes.push('fix_newlines');
  }

  // 2. Trim whitespace
  if (q !== q.trim()) { q = q.trim(); changes.push('trim_question'); }
  if (a !== a.trim()) { a = a.trim(); changes.push('trim_answer'); }

  // 3. Collapse excessive newlines (3+ consecutive → 2)
  if (a.includes('\n\n\n')) {
    const before = a;
    a = a.replace(/\n{3,}/g, '\n\n');
    if (a !== before) changes.push('collapse_newlines');
  }

  // 4. Remove horizontal rule artifacts
  if (a.includes('---') || a.includes('---')) {
    const before = a;
    // Remove lines that are ONLY dashes
    a = a.replace(/^[-—]{3,}\s*$/gm, '');
    // Collapse resulting empty lines
    a = a.replace(/\n{3,}/g, '\n\n').trim();
    if (a !== before) changes.push('remove_hrules');
  }

  // 5. Remove watermarks and lingering suffixes
  if (a.includes('小番薯资料铺') || a.includes('追问应对')) {
    a = a.replace(/[「『]?小番薯资料铺[」『]?/g, '');
    a = a.replace(/[「『]?追问应对[」『]?/g, '');
    a = a.trim();
    a = a.replace(/\n{3,}/g, '\n\n');
    changes.push('remove_watermark');
  }

  // 6. Remove answer prefix labels
  if (/^(A[:：]|Answer[:：]|答[:：]|答案[:：]|标准答案\s*A[:：]?)\s*/i.test(a)) {
    a = a.replace(/^(A[:：]|Answer[:：]|答[:：]|答案[:：]|标准答案\s*A[:：]?)\s*/i, '');
    changes.push('remove_answer_prefix');
  }

  // 7. Normalize question marks (English ? → Chinese ？)
  if (q.includes('?') && /[一-鿿]/.test(q)) {
    const candidate = q.replace(/\?/g, '？');
    if (!wouldDuplicate(c, candidate, cleanedQuestions)) {
      q = candidate;
      changes.push('normalize_qmark');
    } else {
      // Skip: would create a duplicate hash
    }
  }

  if (changes.length > 0) {
    updates.push({ card: c, question: q, answer: a, changes });
  } else {
    skipped.push(c.id);
  }
}

// Generate SQL (individual statements, no transaction — each stands alone)
let sql = `-- Auto-generated card cleanup: ${updates.length} cards fixed\n`;
sql += `-- Rules: newlines, trim, hrule removal, watermark removal, qmark normalize\n`;
sql += `-- Each UPDATE is independent; failures skip without blocking others\n\n`;

for (const u of updates) {
  const c = u.card;
  sql += `-- [${c.topic}] ${c.question?.slice(0, 60)}...\n`;
  sql += `-- Changes: ${u.changes.join(', ')}\n`;
  sql += `UPDATE cards SET\n`;
  sql += `  question = '${esc(u.question)}',\n`;
  sql += `  answer   = '${esc(u.answer)}',\n`;
  sql += `  updated_at = NOW()\n`;
  sql += `WHERE id = '${esc(c.id)}';\n\n`;
}

// Summary
const changeCounts = {};
for (const u of updates) {
  for (const ch of u.changes) {
    changeCounts[ch] = (changeCounts[ch] || 0) + 1;
  }
}

console.log(`=== 清理结果 ===`);
console.log(`总卡片: ${cards.length}`);
console.log(`需修复: ${updates.length}`);
console.log(`无需修复: ${skipped.length}`);
console.log();
for (const [ch, n] of Object.entries(changeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${ch}: ${n}`);
}

fs.writeFileSync('scripts/clean_cards.sql', sql);
console.log(`\n✅ SQL 已写入 scripts/clean_cards.sql（${updates.length} 条独立 UPDATE）`);
console.log(`\n执行导入:`);
console.log(`  docker compose -f docker-compose.yml exec -T postgres psql -U postgres -d agent_notes < scripts/clean_cards.sql`);

// Show sample diffs
console.log(`\n=== 修改示例 ===`);
for (const u of updates.slice(0, 5)) {
  console.log(`\n[${u.card.topic}] ${u.card.id}`);
  console.log(`  改动: ${u.changes.join(', ')}`);
  if (u.question !== u.card.question) {
    console.log(`  题目: "${u.card.question}" → "${u.question}"`);
  }
  if (u.answer !== u.card.answer) {
    const old = u.card.answer.slice(0, 60).replace(/\n/g, '\\n');
    const nu = u.answer.slice(0, 60).replace(/\n/g, '\\n');
    console.log(`  答案: "${old}" → "${nu}"`);
  }
}
