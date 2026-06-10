const fs = require('fs');

const cards = JSON.parse(fs.readFileSync('scripts/exported_cards.json', 'utf-8'));

function esc(s) {
  if (s == null || s === '') return '';
  return s.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function arr(a) {
  if (!a || a.length === 0) return "'{}'";
  return "ARRAY['" + a.map(x => esc(x)).join("','") + "']";
}

function val(v, fallback) {
  if (v != null) return String(v);
  return fallback != null ? String(fallback) : 'NULL';
}

let sql = 'BEGIN;\n\n';
sql += "-- Delete existing cards and re-insert from Supabase Cloud\n";
sql += "DELETE FROM cards;\n\n";

for (const c of cards) {
  const ts = c.created_at || 'NOW()';
  const uts = c.updated_at || 'NOW()';

  sql += "INSERT INTO cards (" +
    "id,question_hash,topic,question,answer," +
    "personal_notes,extended_notes,interview_script," +
    "common_mistakes,references_links," +
    "difficulty,frequency,mastery," +
    "review_count,last_review,next_review_date," +
    "probability_weight,review_priority,manual_boost," +
    "tags,source,ai_summary,created_at,updated_at" +
    ") VALUES (" +
    "'" + esc(c.id) + "', " +
    (c.question_hash ? "'" + esc(c.question_hash) + "'" : "NULL") + ", " +
    "'" + esc(c.topic) + "', " +
    "'" + esc(c.question) + "', " +
    "'" + esc(c.answer) + "', " +
    "'" + esc(c.personal_notes || '') + "', " +
    "'" + esc(c.extended_notes || '') + "', " +
    "'" + esc(c.interview_script || '') + "', " +
    "'" + esc(c.common_mistakes || '') + "', " +
    "'" + esc(c.references_links || '') + "', " +
    "'" + esc(c.difficulty || '中级') + "', " +
    "'" + esc(c.frequency || '中频') + "', " +
    val(c.mastery, 0.2) + ", " +
    val(c.review_count, 0) + ", " +
    (c.last_review ? "'" + c.last_review + "'" : "NULL") + ", " +
    (c.next_review_date ? "'" + c.next_review_date + "'" : "NULL") + ", " +
    val(c.probability_weight, 0) + ", " +
    val(c.review_priority, 0) + ", " +
    val(c.manual_boost, 0) + ", " +
    arr(c.tags) + ", " +
    "'" + esc(c.source || 'manual') + "', " +
    "'" + esc(c.ai_summary || '') + "', " +
    (c.created_at ? "'" + c.created_at + "'" : "NOW()") + ", " +
    (c.updated_at ? "'" + c.updated_at + "'" : "NOW()") +
    ");\n";
}

sql += "\nCOMMIT;\n";

fs.writeFileSync('scripts/import_cards.sql', sql);
console.log(`✅ 生成 ${cards.length} 条 INSERT，写入 scripts/import_cards.sql`);
