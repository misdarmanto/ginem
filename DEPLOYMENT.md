# Deployment Guide - Ginem Dev Monorepo

Panduan untuk mendeploy monorepo ke production server.

## Prerequisites

- Node.js 18+ 
- npm 9+
- PostgreSQL/MySQL (sesuai database yang digunakan)
- Redis (untuk caching/queue)

## 🚀 Deployment Options

### Option 1: Single Server Deployment

Mendeploy kedua aplikasi di satu server yang sama.

#### Step 1: Clone Repository
```bash
git clone <repository-url> /var/www/ginem-dev
cd /var/www/ginem-dev
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Setup Environment Variables
```bash
# Setup for API
cp packages/api/.env.example packages/api/.env
nano packages/api/.env

# Setup for Dashboard
cp packages/dashboard/.env.example packages/dashboard/.env
nano packages/dashboard/.env
```

#### Step 4: Build Applications
```bash
npm run build
```

#### Step 5: Setup Process Manager (PM2)

Instal PM2:
```bash
npm install -g pm2
```

Buat `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'ginem-api',
      cwd: './packages/api',
      script: './build/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log'
    },
    {
      name: 'ginem-dashboard',
      cwd: './packages/dashboard',
      script: 'serve',
      args: '-s dist -l 5173',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Start dengan PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 2: Docker Deployment

#### Build Docker Images

Buat `Dockerfile` di root:
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# API Stage
FROM node:18-alpine as api
WORKDIR /app/api
COPY --from=builder /app/packages/api/build ./build
COPY --from=builder /app/packages/api/package*.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "./build/server.js"]

# Dashboard Stage
FROM node:18-alpine as dashboard
WORKDIR /app/dashboard
RUN npm install -g serve
COPY --from=builder /app/packages/dashboard/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
```

#### Build dan Push
```bash
docker build -t ginem-api:latest -f packages/api/Dockerfile --target api .
docker build -t ginem-dashboard:latest -f packages/dashboard/Dockerfile --target dashboard .

# Push ke registry
docker push your-registry/ginem-api:latest
docker push your-registry/ginem-dashboard:latest
```

#### Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - db_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    image: ginem-api:latest
    depends_on:
      - db
      - redis
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://user:${DB_PASSWORD}@db:3306/${DB_NAME}
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    restart: always

  dashboard:
    image: ginem-dashboard:latest
    ports:
      - "80:5173"
    restart: always
```

Run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Kubernetes Deployment

#### Create Deployments

`k8s/api-deployment.yml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ginem-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ginem-api
  template:
    metadata:
      labels:
        app: ginem-api
    spec:
      containers:
      - name: api
        image: your-registry/ginem-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ginem-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

`k8s/dashboard-deployment.yml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ginem-dashboard
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ginem-dashboard
  template:
    metadata:
      labels:
        app: ginem-dashboard
    spec:
      containers:
      - name: dashboard
        image: your-registry/ginem-dashboard:latest
        ports:
        - containerPort: 5173
```

Deploy:
```bash
kubectl apply -f k8s/
```

## ✅ Post-Deployment Checks

1. **Health Checks**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:5173
   ```

2. **View Logs**
   ```bash
   # PM2
   pm2 logs ginem-api
   pm2 logs ginem-dashboard
   
   # Docker
   docker logs ginem-api
   docker logs ginem-dashboard
   ```

3. **Database Migrations**
   ```bash
   npm run migrate:up
   npm run seed
   ```

## 🔄 Continuous Deployment (CI/CD)

### GitHub Actions

Buat `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /var/www/ginem-dev
            git pull origin main
            npm install
            npm run build
            pm2 restart ecosystem.config.js
```

## 🔐 Security Checklist

- [ ] Environment variables tidak di-commit ke repo
- [ ] Use HTTPS untuk production
- [ ] Setup firewall dan security groups
- [ ] Enable database backups
- [ ] Setup monitoring dan alerting
- [ ] Configure rate limiting di API
- [ ] Enable CORS dengan proper origins
- [ ] Setup SSL certificates (Let's Encrypt)

## 📊 Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

### Using Datadog/New Relic
Instal agent:
```bash
npm install @datadog/browser-rum @datadog/browser-logs
```

### Health Endpoints
```bash
GET /health           # API health
GET /readiness        # Readiness check
GET /liveness         # Liveness check
```

## 🆘 Troubleshooting

### API tidak start
```bash
# Check logs
pm2 logs ginem-api

# Check port
lsof -i :3000

# Check environment variables
cat packages/api/.env
```

### Dashboard blank/error
```bash
# Check build output
ls -la packages/dashboard/dist/

# Check API connectivity
curl http://localhost:3000/api/health
```

### Database connection error
```bash
# Test connection
mysql -h localhost -u root -p ${DB_NAME}

# Check DATABASE_URL format
echo $DATABASE_URL
```

## 📈 Performance Tips

1. **Enable Gzip Compression**
   ```javascript
   // API
   import compression from 'compression';
   app.use(compression());
   ```

2. **Setup Caching Headers**
   ```javascript
   app.use((req, res, next) => {
     res.set('Cache-Control', 'public, max-age=3600');
     next();
   });
   ```

3. **Use CDN untuk static assets**
   - Upload `packages/dashboard/dist/` ke CloudFront/Cloudflare

4. **Database Optimization**
   - Setup indexes
   - Regular backups
   - Query optimization

---

Untuk bantuan lebih lanjut, lihat README.md di root repository.
