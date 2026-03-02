# CatPay

一个轻量级的面签个人支付，支持微信支付和支付宝，配套设备监控服务。

## 原理

众所周知，微信/支付宝收款码成功收款时会推送通知。

通过在一台闲置手机上挂着微信/支付宝和一个监听软件，收款时通知服务器。



通过小额**服务费**将相同的收款金额区分开来，解决并发支付的问题。

## 功能特性

- **多支付渠道**: 支持微信支付和支付宝
- **订单管理**: 创建订单、查询状态、过期自动标记
- **实时通知**: 长轮询机制，支付完成后即时推送
- **Webhook**: 支持支付成功回调通知
- **管理后台**: 简洁的 Admin 管理界面
- **设备管理**: 支持配置多个支付通道设备

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL / SQLite
- Docker (可选)

### 本地开发

```bash
# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 推送数据库 schema
npx prisma db push

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
# 拉取镜像
docker pull ffeng123/catpay

# 运行容器
docker run -d -p 3000:3000 \
  -e DATABASE_URL="file:./data/db.db" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  ffeng123/catpay
```

### Docker Compose


#### SQLite部署

一般来说SQLite就完全够用

```yaml
services:
  catpay:
    image: ffeng123/catpay
    ports:
      - "33000:3000"
    environment:
      - DATABASE_URL=file:./data/db.db
      - NEXTAUTH_SECRET=your-secret-key
      - NEXTAUTH_URL=https://your-domain.com
    depends_on:
      - db
    volumes:
      - ./data:/app/data

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=catpay

```


#### Postgres部署

```yaml
services:
  catpay:
    image: ffeng123/catpay
    ports:
      - "33000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/catpay
      - NEXTAUTH_SECRET=your-secret-key
      - NEXTAUTH_URL=https://your-domain.com
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=catpay
    volumes:
      - ./data:/var/lib/postgresql/data

```





## 配套服务

### CatPayMonitor - 设备监控

监控支付设备，检测用户支付并自动回调。

GitHub: https://github.com/FFeng123/CatPayMonitor

## 技术栈

- **前端**: Next.js 14, React, Tailwind CSS
- **后端**: Next.js API Routes, Prisma
- **数据库**: PostgreSQL / SQLite
- **监控**: CatPayMonitor

## License

MIT
