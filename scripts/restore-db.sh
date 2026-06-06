#!/bin/bash
# Agent Interview Notes — 数据库恢复
set -e

if [ -z "$1" ]; then
  echo "用法: $0 <备份文件路径>"
  echo "示例: $0 backups/agent_notes_20260101_120000.sql.gz"
  ls -t backups/agent_notes_*.sql.gz 2>/dev/null | head -5
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 文件不存在: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  即将恢复数据库。当前数据将被覆盖！"
read -p "确认恢复？(yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "已取消"
  exit 0
fi

echo "🔄 恢复中..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U postgres -d agent_notes
else
  docker compose exec -T postgres psql -U postgres -d agent_notes < "$BACKUP_FILE"
fi

echo "✅ 恢复完成"
docker compose exec postgres psql -U postgres -d agent_notes -c "SELECT count(*) FROM cards;"
