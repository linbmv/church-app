# VPS 部署指南

## 前置要求

在 VPS 上安装：
- Docker
- Docker Compose

## 部署步骤

### 1. 登录 GHCR（首次部署）

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 2. 上传文件到 VPS

将以下文件上传到 VPS：
- `docker-compose.prod.yml`
- `deploy.sh`
- `.env`（从 `.env.example` 复制并修改）

```bash
scp docker-compose.prod.yml deploy.sh .env user@your-vps:/opt/church-app/
```

### 3. 配置环境变量

在 VPS 上编辑 `.env` 文件：
```bash
cd /opt/church-app
nano .env
```

设置：
- `MONGODB_URI`: MongoDB 连接字符串
- `REACT_APP_API_URL`: 后端 API 地址

### 4. 执行部署

```bash
cd /opt/church-app
chmod +x deploy.sh
./deploy.sh
```

## 更新部署

每次 GitHub Actions 构建新镜像后，在 VPS 上运行：

```bash
cd /opt/church-app
./deploy.sh
```

## 查看日志

```bash
# 查看所有服务日志
docker compose -f docker-compose.prod.yml logs -f

# 查看特定服务
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## 访问应用

- 前端: http://your-vps-ip
- 后端 API: http://your-vps-ip:8080
