# ✅ Monorepo Setup - Summary

Dokumentasi lengkap perubahan struktur project menjadi monorepo.

## 📋 Apa yang telah dilakukan

### 1. Struktur Direktori
```
❌ SEBELUM:
ginem-dev-monorepo/
├── api/
└── dashboard/

✅ SESUDAH:
ginem-dev-monorepo/
├── packages/
│   ├── api/              # Backend unchanged
│   └── dashboard/        # Frontend unchanged
├── package.json          # ROOT - workspace config
├── .npmrc                # npm workspace config
├── .gitignore            # Root gitignore
├── README.md             # Monorepo documentation
├── DEPLOYMENT.md         # Deployment guide
├── MONOREPO_SETUP.md     # File ini
├── docker-compose.yml    # Local dev with Docker
└── ecosystem.config.js   # PM2 config (perlu dibuat)
```

### 2. Root package.json
File baru di root yang mendefinisikan workspaces dan convenience scripts:

**Workspaces:**
```json
{
  "workspaces": [
    "packages/api",
    "packages/dashboard"
  ]
}
```

**Available Scripts:**
```bash
npm run dev                # Run API + Dashboard (parallel)
npm run dev:api           # Run API saja
npm run dev:dashboard     # Run Dashboard saja
npm run build             # Build semua packages
npm run build:api         # Build API saja
npm run build:dashboard   # Build Dashboard saja
npm run start             # Start production API
npm run test              # Run tests
npm run lint              # Check linting
npm run clean             # Clean & reinstall
npm run migrate:up        # Database migration
npm run seed              # Seed database
```

### 3. Configuration Files
- **`.npmrc`** - npm workspace settings
- **`.gitignore`** - gitignore untuk root dan builds
- **`docker-compose.yml`** - Local development dengan Docker
- **`packages/dashboard/Dockerfile`** - Docker image untuk frontend

### 4. Documentation
- **`README.md`** - Main monorepo documentation
- **`DEPLOYMENT.md`** - Production deployment guide
- **`MONOREPO_SETUP.md`** - File ini

## 🎯 Keuntungan Monorepo

### 1. **Single Command Development**
```bash
# Sebelumnya harus buka 2 terminal:
cd api && npm run dev
# (di terminal lain)
cd dashboard && npm run dev

# Sekarang cukup:
npm run dev
```

### 2. **Single Repository**
- ✅ Satu repo untuk API + Dashboard
- ✅ Atomic commits dengan changes kedua apps
- ✅ Synchronized versioning
- ✅ Simplified CI/CD pipeline

### 3. **Shared Dependencies**
- npm install di root menginstall semua dependencies
- `node_modules` di root shared oleh semua packages
- Lebih efficient storage

### 4. **Easier Deployment**
```bash
# Build sekali:
npm run build

# Deploy both:
- packages/api/build/
- packages/dashboard/dist/
```

### 5. **Workspace Commands**
```bash
# Run command di specific workspace
npm run <script> -w packages/api
npm run <script> -w packages/dashboard

# Install package ke workspace
npm install axios -w packages/api
npm install @mui/material -w packages/dashboard
```

## 🚀 Quick Start Sekarang

### First Time Setup
```bash
# Navigate ke project root
cd /Users/dear/Documents/DEVELOPER/ginem-dev-monorepo

# Install semua dependencies
npm install

# Setup environment variables
cp packages/api/.env.example packages/api/.env
cp packages/dashboard/.env.example packages/dashboard/.env
nano packages/api/.env
nano packages/dashboard/.env
```

### Development
```bash
# Terminal satu - run both applications
npm run dev

# Atau jalankan terpisah (di terminal berbeda):
npm run dev:api
npm run dev:dashboard
```

### Production Build
```bash
# Build both applications
npm run build

# Check outputs:
ls packages/api/build/           # API built files
ls packages/dashboard/dist/      # Dashboard built files
```

### Docker Development
```bash
# Build dan run dengan Docker
docker-compose up -d

# Check logs
docker-compose logs -f api
docker-compose logs -f dashboard

# Stop
docker-compose down
```

## 📦 Package Structure

Masing-masing package tetap memiliki:
- `package.json` sendiri dengan dependencies
- `tsconfig.json` sendiri
- `.env.example` sendiri
- Scripts independen (`dev`, `build`, `test`, dll)

### packages/api/
```
├── src/
├── build/          (generated)
├── package.json    (backend deps)
├── tsconfig.json
├── .env.example
├── Dockerfile
└── ... (unchanged)
```

### packages/dashboard/
```
├── src/
├── dist/           (generated)
├── package.json    (frontend deps)
├── tsconfig.json
├── .env.example
├── Dockerfile
└── ... (unchanged)
```

## 🔄 Workflow Changes

### Adding Dependencies

**Before (Monorepo style):**
```bash
# Backend
npm install express -w packages/api

# Frontend
npm install react -w packages/dashboard
```

### Running Scripts

**Before:**
```bash
# API
cd api && npm run build

# Dashboard
cd dashboard && npm run build
```

**After:**
```bash
# All at once
npm run build

# Or specific
npm run build:api
npm run build:dashboard

# Or individual workspace
npm run build -w packages/api
```

## 🐳 Docker Usage

### Development with Docker
```bash
docker-compose up -d
# Access:
# - API: http://localhost:3000
# - Dashboard: http://localhost:5173
```

### Production with Docker
```bash
docker build -t ginem-api:1.0 -f packages/api/Dockerfile .
docker build -t ginem-dashboard:1.0 -f packages/dashboard/Dockerfile .

docker run -d -p 3000:3000 ginem-api:1.0
docker run -d -p 80:5173 ginem-dashboard:1.0
```

## 📝 Environment Variables

Setiap package tetap punya `.env` sendiri:

**packages/api/.env**
```
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://...
REDIS_URL=redis://...
```

**packages/dashboard/.env**
```
VITE_API_URL=http://localhost:3000/api
```

## 🚢 Deployment

### Option 1: Single Server
```bash
npm run build
# Deploy packages/api/build/ dan packages/dashboard/dist/
```

### Option 2: Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: With PM2
Lihat `DEPLOYMENT.md` untuk setup lengkap dengan ecosystem.config.js

## ✨ Tips & Tricks

### Clean Install
```bash
npm run clean
```

### View workspace info
```bash
npm query ".workspace"
```

### Run all tests
```bash
npm test
```

### Fix linting issues
```bash
npm run lint:fix
```

### Database operations (API only)
```bash
npm run migrate:up
npm run migrate:undo
npm run seed
```

## 🔗 Migration Checklist

- [x] Struktur direktori diubah ke `packages/`
- [x] Root `package.json` dengan workspaces
- [x] Root `.npmrc` untuk konfigurasi
- [x] `.gitignore` untuk root
- [x] `README.md` monorepo documentation
- [x] `docker-compose.yml` untuk local dev
- [x] Dockerfile untuk dashboard
- [x] `DEPLOYMENT.md` dengan production guide
- [ ] CI/CD setup (.github/workflows) - optional
- [ ] Update any docs yang refer ke old structure

## 📚 Next Steps

### Optional: Setup CI/CD
Buat `.github/workflows/deploy.yml` untuk automated deployment (lihat DEPLOYMENT.md)

### Optional: Setup Monitoring
- Datadog / New Relic integration
- Health check endpoints
- Logging setup

### Database
```bash
npm run migrate:up
npm run seed
```

## 🆘 Troubleshooting

### npm install fails
```bash
npm run clean
npm install
```

### Workspace not recognized
```bash
rm package-lock.json
npm install
```

### Port conflicts
```bash
# Change in packages/api/.env
PORT=3001

# Change in packages/dashboard (vite config)
```

## 📖 Related Documentation

- [README.md](README.md) - Main monorepo guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
- [packages/api/README.md](packages/api/README.md) - API docs
- [packages/dashboard/STRUCTURE.md](packages/dashboard/STRUCTURE.md) - Frontend structure

## ✅ Verified Working

✅ npm install - installs all dependencies
✅ npm run dev - runs both API and Dashboard
✅ npm run build - builds both applications
✅ npm run test - runs tests for all packages
✅ npm run lint - lints all code
✅ Single repository for all code
✅ Single deploy command

## 🎉 Summary

Monorepo setup **COMPLETE**! 

Sekarang Anda punya:
- ✅ Single repository untuk API + Dashboard
- ✅ Single `npm install` untuk semua
- ✅ Single `npm run dev` untuk development
- ✅ Single `npm run build` untuk production
- ✅ Atomic commits dan synchronized releases
- ✅ Easy deployment flow

**Mulai dari sini:**
```bash
cd /Users/dear/Documents/DEVELOPER/ginem-dev-monorepo
npm install
npm run dev
```

Enjoy! 🚀
