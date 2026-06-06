#!/bin/bash
# Agent Interview Notes — 一键部署脚本
set -e

echo "========================================"
echo " Agent Interview Notes — 生产部署"
echo "========================================"

# 检查 .env.production
if [ ! -f .env.production ]; then
  echo "❌ 请先创建 .env.production 文件"
  echo "   cp .env.production.example .env.production"
  echo "   然后编辑填入真实配置"
  exit 1
fi

# 拉取最新代码
echo "📥 拉取代码..."
git pull origin main || true

# 构建并启动
echo "🔨 构建并启动 Docker 服务..."
docker compose -f docker-compose.yml --env-file .env.production up -d --build

# 等待数据库就绪
echo "⏳ 等待数据库启动..."
sleep 5
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ 数据库已就绪"
    break
  fi
  sleep 1
done

# 初始化数据库
echo "🗄️  初始化数据库..."
docker compose exec -T postgres psql -U postgres -d agent_notes < supabase/schema.sql 2>/dev/null || echo "   schema 已存在，跳过"
docker compose exec -T postgres psql -U postgres -d agent_notes -c "SELECT count(*) FROM cards;" 2>/dev/null | grep -q "0" && {
  echo "   📥 导入初始数据..."
  docker compose exec -T postgres psql -U postgres -d agent_notes < supabase/seed.sql
}

# 检查状态
echo ""
echo "========================================"
echo " ✅ 部署完成！"
echo "========================================"
docker compose ps
echo ""
echo "访问: ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
echo "日志: docker compose logs -f web"
