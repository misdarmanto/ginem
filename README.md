# 🚀 Ginem

[![CI - Tests & Lint](https://github.com/yourusername/ginem/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ginem/actions)
[![Deploy](https://github.com/yourusername/ginem/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/ginem/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-%3E%3D9.0.0-green)](https://www.npmjs.com/)

Modern monorepo with **single command development**, **unified deployment**, and **professional structure**. Built with Express, React, Vite, and TypeScript.

[**🌐 Website**](#) • [**📚 Documentation**](#) • [**🐛 Report Bug**](https://github.com/yourusername/ginem/issues) • [**✨ Request Feature**](https://github.com/yourusername/ginem/issues)

---

## 📋 Features

- ✨ **Single Command Development** - `npm run dev` runs API + Dashboard
- 🏗️ **Professional Monorepo** - npm workspaces with organized structure
- 🚀 **Easy Deployment** - Single repository, single deploy command
- 🐳 **Docker Support** - Docker Compose for development and production
- 🔄 **CI/CD Ready** - GitHub Actions workflows included
- 📦 **Workspace Management** - Independent packages with shared deps
- 🎨 **Modern Tech Stack** - Express, React, Vite, TypeScript
- 📖 **Well Documented** - Comprehensive guides and examples

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ginem.git
cd ginem

# Install dependencies
npm install

# Start development
npm run dev
```

**That's it!** 🎉 Open your browser:
- 🔵 **Frontend**: http://localhost:5173
- 🔵 **Backend**: http://localhost:3000

---

Monorepo yang mengatur API backend dan Dashboard frontend dalam satu repository menggunakan npm workspaces.

## 📁 Struktur Project

```
ginem-dev-monorepo/
├── packages/
│   ├── api/              # Backend API (Express + TypeScript)
│   └── dashboard/        # Frontend Dashboard (React + Vite)
├── package.json          # Root workspace configuration
└── README.md            # File ini
```

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Development Mode (Run Both API & Dashboard)
```bash
npm run dev
```

**That's it!** Kedua aplikasi akan berjalan di satu command:
- 🔵 **Backend API**: http://localhost:3000
- 🔵 **Frontend Dashboard**: http://localhost:5173

---

**Atau jalankan secara terpisah** (jika hanya ingin test satu saja):
```bash
npm run dev:api       # Hanya Backend (port 3000)
npm run dev:dashboard # Hanya Frontend (port 5173)
```

### Build untuk Production
```bash
npm run build
```

Atau build individual:
```bash
npm run build:api
npm run build:dashboard
```

### Testing
```bash
npm test              # Run tests semua packages
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Linting & Formatting
```bash
npm run lint          # Check linting
npm run lint:fix      # Fix linting issues
```

## 📦 Scripts yang Tersedia

### Development
- `npm run dev` - Run API & Dashboard secara parallel
- `npm run dev:api` - Run API saja
- `npm run dev:dashboard` - Run Dashboard saja

### Build & Production
- `npm run build` - Build semua packages
- `npm run build:api` - Build API
- `npm run build:dashboard` - Build Dashboard
- `npm run start` - Start production server (API)

### Database (API)
- `npm run migrate:up` - Jalankan migration
- `npm run migrate:undo` - Undo migration terakhir
- `npm run seed` - Seed database

### Testing & Quality
- `npm run test` - Run tests
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Coverage report
- `npm run lint` - Check linting
- `npm run lint:fix` - Fix linting

### Utilities
- `npm run clean` - Clean node_modules & rebuild
- `npm run evaluate` - Run API evaluation

## 📝 Struktur Packages

### [packages/api](packages/api)
Backend API dengan Express dan TypeScript
- **Port**: 3000 (atau sesuai .env)
- **Scripts**: 
  - `npm run dev` - Development server dengan hot reload
  - `npm run build` - Compile TypeScript
  - `npm run start` - Jalankan production build
  - `npm run test` - Run Jest tests

### [packages/dashboard](packages/dashboard)
Frontend Dashboard dengan React, Vite, dan TypeScript
- **Port**: 5173 (Vite default)
- **Scripts**:
  - `npm run dev` - Development server
  - `npm run build` - Build untuk production
  - `npm run preview` - Preview build lokal
  - `npm run test` - Run Vitest

## 🌍 Environment Variables

### API (.env di packages/api/)
```
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/dbname
REDIS_URL=redis://localhost:6379
# ... other env vars
```

### Dashboard (.env di packages/dashboard/)
```
VITE_API_URL=http://localhost:3000/api
# ... other env vars
```

## 🐳 Docker Deployment

Untuk deployment, build kedua packages dan deploy sebagai satu unit:

```bash
# Build semua
npm run build

# Output tersedia di:
# - packages/api/build/
# - packages/dashboard/dist/
```

## 📚 Useful Commands

### Menjalankan command di package spesifik
```bash
npm run <script> -w packages/api
npm run <script> -w packages/dashboard
```

### Install package ke workspace spesifik
```bash
npm install <package-name> -w packages/api
npm install <package-name> -D -w packages/dashboard
```

### Uninstall package dari workspace
```bash
npm uninstall <package-name> -w packages/api
```

## 🔗 Workflow Development

1. **Setup awal**
   ```bash
   npm install
   ```

2. **Development**
   ```bash
   npm run dev
   ```
   - Buka http://localhost:5173 untuk Dashboard
   - API running di http://localhost:3000

3. **Make changes**
   - Frontend: Edit files di `packages/dashboard/src`
   - Backend: Edit files di `packages/api/src`

4. **Testing**
   ```bash
   npm test
   ```

5. **Build & Deploy**
   ```bash
   npm run build
   # Deploy kedua packages
   ```

## 🚢 Production Deployment

Keuntungan monorepo:
- ✅ Single repository untuk version control
- ✅ Single deploy command
- ✅ Shared dependencies di root node_modules
- ✅ Synchronized releases
- ✅ Atomic commits dengan API + Dashboard changes

Langkah deployment:
1. Build: `npm run build`
2. Push build artifacts ke server
3. Run API: `cd packages/api && npm run start`
4. Serve Dashboard: `cd packages/dashboard && serve dist/`

## 💡 Tips

- Gunakan `npm run dev` untuk development kedua aplikasi sekaligus
- Setiap package masih punya scripts independennya
- Root `package.json` adalah koordinator central
- Dependencies tetap di masing-masing package untuk isolation

## 📖 Package-Specific Documentation

- [API README](packages/api/README.md)
- [Dashboard Documentation](packages/dashboard/STRUCTURE.md)

## ❓ Troubleshooting

### npm install error
```bash
npm run clean
npm install
```

### Port sudah terpakai
- Ubah port di package config masing-masing
- Atau cek proses yang pakai port dengan `lsof -i :3000` atau `lsof -i :5173`

### Workspace not found
- Pastikan struktur folder sudah benar: `packages/api` dan `packages/dashboard`
- Run `npm install` ulang

---

## 🤝 Contributing

We love your input! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:
- How to submit issues and feature requests
- Development setup
- Pull request process
- Code of conduct

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to all [contributors](https://github.com/yourusername/ginem/graphs/contributors)
- Built with [Express](https://expressjs.com/), [React](https://react.dev/), [Vite](https://vitejs.dev/)

---

Created with ❤️ for Ginem Dev

**[⬆ back to top](#-ginem)**
