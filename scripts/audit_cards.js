/**
 * Audit all cards for formatting issues:
 *   - Leading/trailing whitespace
 *   - Markdown artifacts (#, ---, ```)
 *   - Answer/Question prefix labels
 *   - Excessive blank lines
 *   - Inconsistent line endings
 */
const fs = require('fs');
const cards = JSON.parse(fs.readFileSync('scripts/exported_cards.json', 'utf-8'));

const issues = [];

for (const c of cards) {
  const problems = [];

  const q = c.question || '';
  const a = c.answer || '';

  // Question checks
  if (q !== q.trim()) {
    if (q !== q.trimStart()) problems.push('Q_LEADING_WS');
    if (q !== q.trimEnd()) problems.push('Q_TRAILING_WS');
  }
  if (/^(Q[:：]|Question[:：]|问[:：]|问题[:：])\s*/i.test(q)) problems.push('Q_PREFIX_LABEL');
  if (q.includes('\n\n\n')) problems.push('Q_EXCESSIVE_NEWLINES');
  if (q.includes('---')) problems.push('Q_HRULE');
  if (q.includes('```')) problems.push('Q_CODEBLOCK');
  if (q.startsWith('#')) problems.push('Q_MD_HEADING');

  // Answer checks
  if (a !== a.trim()) {
    if (a !== a.trimStart()) problems.push('A_LEADING_WS');
    if (a !== a.trimEnd()) problems.push('A_TRAILING_WS');
  }
  if (/^(A[:：]|Answer[:：]|答[:：]|答案[:：])\s*/i.test(a)) problems.push('A_PREFIX_LABEL');
  if (a.includes('\n\n\n')) problems.push('A_EXCESSIVE_NEWLINES');
  if (a.includes('---')) problems.push('A_HRULE');
  if (a.includes('```')) problems.push('A_CODEBLOCK');
  if (a.startsWith('#')) problems.push('A_MD_HEADING');
  if (a.match(/\r\n|\r/)) problems.push('A_WINDOWS_NEWLINES');

  // Content quality
  if (a.length < 25) problems.push('A_TOO_SHORT');
  if (q.length < 10) problems.push('Q_TOO_SHORT');
  if (q.endsWith('?')) problems.push('Q_ENDS_QMARK');

  if (problems.length > 0) {
    issues.push({
      id: c.id,
      topic: c.topic,
      question: q.slice(0, 80),
      answerPreview: a.slice(0, 80),
      problems,
    });
  }
}

// Summarize
const counts = {};
for (const iss of issues) {
  for (const p of iss.problems) {
    counts[p] = (counts[p] || 0) + 1;
  }
}

console.log('=== 问题统计 ===');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

console.log(`\n=== 涉及卡片: ${issues.length}/${cards.length} ===\n`);

// Group by problem type
const groups = {};
for (const iss of issues) {
  for (const p of iss.problems) {
    if (!groups[p]) groups[p] = [];
    groups[p].push(iss);
  }
}

for (const [problem, items] of Object.entries(groups)) {
  console.log(`\n--- ${problem} (${items.length}) ---`);
  for (const item of items.slice(0, 5)) {
    console.log(`  [${item.topic}] ${item.question}`);
    console.log(`    答: ${item.answerPreview}`);
  }
  if (items.length > 5) console.log(`  ... 还有 ${items.length - 5} 条`);
}
