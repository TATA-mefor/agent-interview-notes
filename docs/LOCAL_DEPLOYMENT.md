# Local Deployment Guide

## 目标部署形态

```
┌──────────────────────┐         ┌─────────────────────┐
│   电脑（本地服务器）   │         │   手机（局域网客户端） │
│                      │  WiFi   │                     │
│  Docker Compose      │◄───────►│  PWA 安装到主屏幕    │
│  ├── web (Next.js)   │  局域网  │  http://IP:3000     │
│  ├── postgres        │         │                     │
│  ├── pgvector        │         │  底部 Tab 导航       │
│  └── ollama (可选)   │         │  复习优先体验        │
└──────────────────────┘         └─────────────────────┘
```

## 前置条件

- Docker Desktop（Windows / macOS）或 Docker Engine（Linux）
- Node.js 18+（本地开发时）
- 手机与电脑在同一局域网

## 方式一：Docker Compose（生产模式）

```bash
# 1. 克隆仓库
git clone <repo-url>
cd agent-notes

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，至少填入 DATABASE_URL

# 3. 一键启动
docker-compose up -d

# 4. 初始化数据库（首次）
docker-compose exec web npx supabase db push
```

## 方式二：本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动 PostgreSQL（Docker）
docker-compose up -d postgres

# 3. 配置 .env.local
cp .env.example .env.local

# 4. 启动开发服务器
npm run dev
```

## 手机端访问

### 获取电脑局域网 IP

**Windows:**
```bash
ipconfig | findstr IPv4
```

**macOS / Linux:**
```bash
ifconfig | grep "inet "
# 或
hostname -I
```

### 手机访问

在手机浏览器中访问：
```
http://<电脑局域网IP>:3000
```

例如：
```
http://192.168.1.100:3000
```

### PWA 安装

1. 手机浏览器打开上述地址
2. **iOS Safari**：点击分享 → 添加到主屏幕
3. **Android Chrome**：点击菜单 → 添加到主屏幕
4. 安装后，从主屏幕图标启动，获得全屏体验

## Docker Compose 服务说明

| 服务     | 端口  | 说明                     | 必选 |
| -------- | ----- | ------------------------ | ---- |
| web      | 3000  | Next.js 应用             | ✅   |
| postgres | 5432  | PostgreSQL + pgvector    | ✅   |
| ollama   | 11434 | 本地 LLM / embedding     | ❌   |
| adminer  | 8080  | 数据库管理 UI            | ❌   |

## Ollama（可选）

```bash
# 启动 ollama 服务
docker-compose --profile ollama up -d

# 拉取模型
docker-compose exec ollama ollama pull qwen2.5:7b
docker-compose exec ollama ollama pull nomic-embed-text
```

配置 `.env`：
```
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
```

## 备份与恢复

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U postgres agent_notes > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U postgres agent_notes < backup.sql
```

## 离线运行确认清单

- [ ] 不依赖 Supabase Cloud（使用本地 PostgreSQL）
- [ ] 不依赖外部 LLM API（可选 Ollama 或完全不启用 AI）
- [ ] 无 API Key 时系统正常启动
- [ ] 基础 CRUD 功能完全可用
- [ ] 手机局域网访问正常
- [ ] PWA 图标和名称正确
