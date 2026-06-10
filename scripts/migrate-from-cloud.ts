/**
 * migrate-from-cloud.ts
 * 从 Supabase 云项目导出数据 → 导入到 Docker 本地 PostgreSQL
 *
 * 用法: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-from-cloud.ts
 * 或在 Docker 容器中执行
 */

// Cloud Supabase (source)
const CLOUD_URL = "https://byjnmlttprfllchyjwka.supabase.co";
const CLOUD_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5am5tbHR0cHJmbGxjaHlqd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDI3MjQsImV4cCI6MjA5NjIxODcyNH0.t07Mq8DAf2zxNr5c7hPKvcEPtuBxmRIKBxbtKPi6Afk";

async function migrate() {
  // Step 1: Fetch all cards from cloud Supabase
  console.log("📥 从 Supabase 云读取卡片...");
  const cloudRes = await fetch(
    `${CLOUD_URL}/rest/v1/cards?select=*&limit=500`,
    {
      headers: {
        apikey: CLOUD_ANON_KEY,
        Authorization: `Bearer ${CLOUD_ANON_KEY}`,
      },
    }
  );

  if (!cloudRes.ok) {
    const err = await cloudRes.text();
    throw new Error(`Cloud fetch failed: ${cloudRes.status} ${err}`);
  }

  const cards = await cloudRes.json();
  console.log(`   ✅ 读取到 ${cards.length} 张卡片`);

  // Step 2: Show summary
  const topics: Record<string, number> = {};
  for (const c of cards) {
    topics[c.topic] = (topics[c.topic] || 0) + 1;
  }
  console.log("\n📊 题目分布:");
  for (const [t, n] of Object.entries(topics).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`   ${t}: ${n}`);
  }

  // Step 3: Save to JSON file for manual review/import
  const fs = require("fs");
  const outPath = "./scripts/exported_cards.json";
  fs.writeFileSync(outPath, JSON.stringify(cards, null, 2), "utf-8");
  console.log(`\n💾 已导出到 ${outPath}`);
  console.log(`   共 ${cards.length} 题`);

  // Step 4: Generate SQL INSERT for direct import
  console.log("\n📝 生成 SQL 导入脚本...");
  const sqlLines: string[] = [
    "-- Auto-generated migration from Supabase Cloud",
    `-- ${cards.length} cards exported at ${new Date().toISOString()}`,
    "",
    "BEGIN;",
    "",
    "-- Clear existing seed data (keep table structure)",
    "DELETE FROM cards WHERE source = 'manual';",
    "",
  ];

  for (const c of cards) {
    const escape = (s: string) =>
      (s ?? "").replace(/'/g, "''").replace(/\\/g, "\\\\");
    const arr = (a: string[] | null) =>
      a && a.length > 0
        ? `ARRAY[${a.map((x) => `'${escape(x)}'`).join(",")}]`
        : "'{}'";

    sqlLines.push(
      `INSERT INTO cards (` +
        `id, question_hash, topic, question, answer, ` +
        `personal_notes, extended_notes, interview_script, ` +
        `common_mistakes, references_links, ` +
        `difficulty, frequency, mastery, ` +
        `review_count, last_review, next_review_date, ` +
        `probability_weight, review_priority, manual_boost, ` +
        `tags, source, ai_summary, created_at, updated_at` +
        `) VALUES (` +
        `'${escape(c.id)}', ` +
        `${c.question_hash ? "'" + escape(c.question_hash) + "'" : "NULL"}, ` +
        `'${escape(c.topic)}', ` +
        `'${escape(c.question)}', ` +
        `'${escape(c.answer)}', ` +
        `'${escape(c.personal_notes)}', ` +
        `'${escape(c.extended_notes)}', ` +
        `'${escape(c.interview_script)}', ` +
        `'${escape(c.common_mistakes)}', ` +
        `'${escape(c.references_links)}', ` +
        `'${escape(c.difficulty)}', ` +
        `'${escape(c.frequency)}', ` +
        `${c.mastery ?? 0.2}, ` +
        `${c.review_count ?? 0}, ` +
        `${c.last_review ? "'" + c.last_review + "'" : "NULL"}, ` +
        `${c.next_review_date ? "'" + c.next_review_date + "'" : "NULL"}, ` +
        `${c.probability_weight ?? 0}, ` +
        `${c.review_priority ?? 0}, ` +
        `${c.manual_boost ?? 0}, ` +
        `${arr(c.tags)}, ` +
        `'${escape(c.source || "manual")}', ` +
        `'${escape(c.ai_summary)}', ` +
        `${c.created_at ? "'" + c.created_at + "'" : "NOW()"}, ` +
        `${c.updated_at ? "'" + c.updated_at + "'" : "NOW()"}` +
        `);`
    );
  }

  sqlLines.push("", "COMMIT;", "");
  const sqlPath = "./scripts/import_cards.sql";
  fs.writeFileSync(sqlPath, sqlLines.join("\n"), "utf-8");
  console.log(`   ✅ SQL 已保存到 ${sqlPath}`);
  console.log(
    `   导入命令: docker compose -f docker-compose.yml exec -T postgres psql -U postgres -d agent_notes < scripts/import_cards.sql`
  );

  // Step 5: Also show how many are in Docker already
  console.log("\n📋 下一步:");
  console.log("   1. 检查 exported_cards.json 确认数据完整");
  console.log("   2. 执行 SQL 导入或通过 Web UI 导入");
}

migrate().catch((err) => {
  console.error("❌ 迁移失败:", err.message);
  process.exit(1);
});
