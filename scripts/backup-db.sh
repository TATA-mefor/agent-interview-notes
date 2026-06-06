#!/bin/bash
# Agent Interview Notes — 数据库备份
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/agent_notes_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "💾 备份数据库到 ${BACKUP_FILE}..."

docker compose exec -T postgres pg_dump -U postgres agent_notes > "$BACKUP_FILE"

# 压缩
gzip "$BACKUP_FILE"
echo "✅ 备份完成: ${BACKUP_FILE}.gz ($(du -h ${BACKUP_FILE}.gz | cut -f1))"

# 保留最近 7 个备份
ls -t ${BACKUP_DIR}/agent_notes_*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
echo "📦 当前备份数: $(ls ${BACKUP_DIR}/agent_notes_*.sql.gz 2>/dev/null | wc -l)"
