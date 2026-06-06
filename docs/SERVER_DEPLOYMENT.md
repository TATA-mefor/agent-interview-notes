# Server Deployment Guide

## 概述

将 Agent Interview Notes 部署到公网 VPS，通过域名 + HTTPS 访问，支持电脑和手机双端使用。

### 部署架构

```
┌─────────────────────────────────────────────────────┐
│  VPS (Ubuntu 22.04)                                 │
│                                                     │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ Nginx    │→ │ Next.js   │→ │ PostgreSQL       │ │
│  │ :80/:443 │  │ :3000     │  │ :5432 (internal) │ │
│  │ HTTPS    │  │           │  │ + pgvector       │ │
│  └──────────┘  └───────────┘  └──────────────────┘ │
│                          ↓                           │
│                     ┌───────────┐                    │
│                     │ Ollama    │ (optional)         │
│                     │ :11434    │                    │
│                     └───────────┘                    │
└─────────────────────────────────────────────────────┘
                           ↓
         https://agent-notes.example.com
```

### 安全原则

| 服务 | 公网暴露 | 说明 |
|------|---------|------|
| Nginx | ✅ 80/443 | 反向代理，HTTPS 终端 |
| Next.js | ❌ | 仅 localhost:3000 |
| PostgreSQL | ❌ | 仅 Docker 内部网络 |
| Ollama | ❌ | 仅 localhost:11434 |

---

## 1. 服务器准备

### 1.1 最低配置

- **系统**: Ubuntu 22.04 LTS
- **CPU**: 2 核
- **内存**: 2 GB (含 Ollama 建议 8 GB)
- **磁盘**: 20 GB SSD

### 1.2 登录服务器

```bash
ssh root@your-server-ip
```

### 1.3 创建非 root 用户

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 1.4 系统更新

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw
```

---

## 2. 安装 Docker

```bash
# 官方安装脚本
curl -fsSL https://get.docker.com | bash

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version

# 安装 Docker Compose
sudo apt install -y docker-compose-plugin
docker compose version
```

---

## 3. 配置防火墙

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

## 4. 克隆项目

```bash
cd /home/deploy
git clone https://github.com/your-username/agent-interview-notes.git
cd agent-interview-notes
```

---

## 5. 配置环境变量

```bash
cp .env.production.example .env.production
nano .env.production
```

必填项：

```bash
# 数据库密码（自行设置强密码）
POSTGRES_PASSWORD=your-strong-password-here

# LLM 配置（至少配一个）
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-key

# 应用域名
NEXT_PUBLIC_APP_URL=https://agent-notes.example.com
```

注意：
- `.env.production` 包含密码，**不要提交到 Git**
- 已在 `.gitignore` 中排除

---

## 6. 配置 Nginx

```bash
# 修改域名
sed -i 's/agent-notes.example.com/你的域名/g' nginx/agent-interview-notes.conf

# 复制配置
sudo mkdir -p /etc/nginx/conf.d
sudo cp nginx/agent-interview-notes.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. 配置 HTTPS（Let's Encrypt）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d agent-notes.example.com
```

自动续期：

```bash
sudo certbot renew --dry-run  # 测试
# certbot 会自动添加 systemd timer
```

---

## 8. 启动服务

### 8.1 生产模式启动

```bash
# 构建并启动
docker compose -f docker-compose.yml --env-file .env.production up -d --build

# 查看日志
docker compose logs -f web

# 查看状态
docker compose ps
```

### 8.2 可选：启动 Ollama

```bash
docker compose --profile ollama --env-file .env.production up -d

# 拉取模型
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull nomic-embed-text
```

---

## 9. 初始化数据库

```bash
# 执行建表脚本
docker compose exec -T postgres psql -U postgres -d agent_notes < supabase/schema.sql

# 导入初始数据
docker compose exec -T postgres psql -U postgres -d agent_notes < supabase/seed.sql

# 验证
docker compose exec postgres psql -U postgres -d agent_notes -c "SELECT count(*) FROM cards;"
```

---

## 10. 一键部署脚本

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 11. 常用运维命令

### 查看日志

```bash
docker compose logs -f --tail=100 web
docker compose logs -f postgres
```

### 重启服务

```bash
docker compose restart web
```

### 更新部署

```bash
git pull
docker compose -f docker-compose.yml --env-file .env.production up -d --build
docker compose exec -T postgres psql -U postgres -d agent_notes < supabase/schema.sql
```

### 数据库备份

```bash
./scripts/backup-db.sh
```

### 数据库恢复

```bash
./scripts/restore-db.sh backups/agent_notes_20260101_120000.sql
```

---

## 12. 手机访问

1. 手机浏览器打开 `https://agent-notes.example.com`
2. iOS Safari: 分享 → 添加到主屏幕
3. Android Chrome: 菜单 → 添加到主屏幕
4. PWA 安装后从主屏幕图标启动，获得全屏体验

---

## 13. Cloudflare Tunnel 替代方案

如果没有公网 IP，可以使用 Cloudflare Tunnel：

```bash
# 安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# 登录
cloudflared tunnel login

# 创建隧道
cloudflared tunnel create agent-notes
cloudflared tunnel route dns agent-notes agent-notes.example.com

# 启动
cloudflared tunnel run --url http://localhost:3000 agent-notes
```

---

## 14. 安全检查清单

- [ ] `.env.production` 不包含在 Git 中
- [ ] PostgreSQL 密码为强密码
- [ ] PostgreSQL 端口不暴露到公网
- [ ] Ollama 端口不暴露到公网
- [ ] 仅 Nginx 的 80/443 端口对外
- [ ] HTTPS 证书已配置
- [ ] 防火墙已启用
- [ ] ⚠️ 当前版本**无登录认证**，如部署到公网务必先加认证层

---

## 15. 性能建议

- 使用 CDN 加速静态资源
- 启用 Next.js ISR（增量静态再生成）
- PostgreSQL 定期 VACUUM
- 设置日志轮转

## 16. 故障排查

| 问题 | 检查 |
|------|------|
| 502 Bad Gateway | `docker compose ps` 确认 web 服务运行中 |
| 数据库连接失败 | 确认 `DATABASE_URL` 中 host 为 `postgres` |
| LLM 调用失败 | 确认 API Key 正确，`LLM_PROVIDER` 匹配 |
| 磁盘满 | `df -h` 检查，清理 Docker 镜像 `docker system prune` |
