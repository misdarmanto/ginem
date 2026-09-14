# Getting Started with Ginem

Welcome to Ginem! This guide will help you get up and running in minutes.

## 🎯 What is Ginem?

Ginem is a modern, professional monorepo template featuring:
- **Backend**: Express.js API with TypeScript
- **Frontend**: React dashboard with Vite
- **Development**: Single command to run both
- **Deployment**: Docker and PM2 ready

## 📋 Prerequisites

Before you start, make sure you have:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **A code editor** (VS Code recommended)

### Verify Installation

```bash
node --version    # Should be v18+ 
npm --version     # Should be 9+
git --version     # Should be 2.25+
```

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ginem.git
cd ginem
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
# Copy example env files
cp packages/api/.env.example packages/api/.env
cp packages/dashboard/.env.example packages/dashboard/.env

# Edit if needed (usually works as-is for local dev)
# nano packages/api/.env
# nano packages/dashboard/.env
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Open in Browser

- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3000

**That's it!** 🎉

## 📂 Project Structure

```
ginem/
├── packages/
│   ├── api/
│   │   ├── src/           # API source code
│   │   ├── build/         # Compiled output
│   │   └── package.json
│   │
│   └── dashboard/
│       ├── src/           # React components
│       ├── dist/          # Build output
│       └── package.json
│
├── .github/
│   ├── workflows/         # CI/CD configurations
│   └── ISSUE_TEMPLATE/    # Issue templates
│
├── scripts/               # Utility scripts
├── package.json          # Root configuration
└── README.md
```

## 🎮 Common Commands

### Development

```bash
npm run dev              # Run API + Dashboard
npm run dev:api          # Backend only
npm run dev:dashboard    # Frontend only
```

### Building

```bash
npm run build            # Build both
npm run build:api        # Build API only
npm run build:dashboard  # Build Dashboard only
```

### Testing & Quality

```bash
npm test                 # Run tests
npm run lint             # Check code quality
npm run lint:fix         # Fix linting issues
```

### Database (API only)

```bash
npm run migrate:up       # Run migrations
npm run migrate:undo     # Rollback last migration
npm run seed             # Seed test data
```

### Using Make (Alternative)

If you have `make` installed:

```bash
make help        # Show all commands
make dev         # Run development
make build       # Build for production
make test        # Run tests
```

## 📚 Learning Resources

### For Beginners

1. **[README.md](README.md)** - Project overview
2. **[MONOREPO_SETUP.md](MONOREPO_SETUP.md)** - Monorepo explanation
3. **[SINGLE_COMMAND_SETUP.md](SINGLE_COMMAND_SETUP.md)** - Single command development

### For Developers

1. **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
2. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment
3. **[SECURITY.md](SECURITY.md)** - Security guidelines
4. **[packages/api/README.md](packages/api/README.md)** - API documentation
5. **[packages/dashboard/STRUCTURE.md](packages/dashboard/STRUCTURE.md)** - Frontend structure

## 🔧 IDE Setup

### VS Code (Recommended)

1. Install recommended extensions:
   - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
   - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
   - [TypeScript Vue Plugin](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

2. Create `.vscode/settings.json`:
   ```json
   {
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.formatOnSave": true,
     "eslint.validate": ["javascript", "typescript", "tsx"],
     "search.exclude": {
       "packages/*/node_modules": true
     }
   }
   ```

3. Install command palette plugins for quick access

## 🐛 Troubleshooting

### Issue: "npm install" fails

```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 3000 or 5173 already in use

```bash
# Find and kill the process
lsof -i :3000   # For port 3000
lsof -i :5173   # For port 5173

# Kill process by PID
kill -9 <PID>
```

### Issue: "Module not found" errors

```bash
# Ensure all dependencies are installed
npm install

# If specific package is missing
npm install <package-name> -w packages/api
npm install <package-name> -w packages/dashboard
```

### Issue: Dashboard shows blank page

1. Check browser console (F12) for errors
2. Verify API is running: `http://localhost:3000`
3. Check environment variables in `.env`
4. Clear browser cache and reload

## 📝 Workspace Commands

### Install package to backend only

```bash
npm install axios -w packages/api
```

### Install dev dependency to frontend only

```bash
npm install -D @types/react -w packages/dashboard
```

### Run script in specific package

```bash
npm run build -w packages/api
npm run test -w packages/dashboard
```

## 🚀 Next Steps

### 1. Explore the Code

- Frontend: `packages/dashboard/src`
- Backend: `packages/api/src`

### 2. Make Your First Change

- **Frontend**: Edit `packages/dashboard/src/App.tsx`
- **Backend**: Edit `packages/api/server.ts`

### 3. Create an Issue

- Found a bug? [Report it](https://github.com/yourusername/ginem/issues/new?template=bug_report.md)
- Have a feature idea? [Request it](https://github.com/yourusername/ginem/issues/new?template=feature_request.md)

### 4. Contribute

- Read [CONTRIBUTING.md](CONTRIBUTING.md)
- Make a fork and create a PR
- Follow the code style guidelines

## 💡 Pro Tips

### 1. Use Git Branches

```bash
git checkout -b feature/my-feature
# Make changes
git commit -m "Add my feature"
git push origin feature/my-feature
```

### 2. Keep Dependencies Updated

```bash
npm update
npm outdated
```

### 3. Use Environment Variables

```bash
# API
DATABASE_URL=postgresql://...
API_PORT=3000

# Dashboard  
VITE_API_URL=http://localhost:3000
```

### 4. Debug in VS Code

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch API",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:api"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## ❓ FAQ

**Q: Can I work on just the API or Dashboard?**
A: Yes! Use `npm run dev:api` or `npm run dev:dashboard`

**Q: How do I add a new package?**
A: Create a folder in `packages/` and add it to `workspaces` in root `package.json`

**Q: Can I use this in production?**
A: Yes! See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

**Q: Is this free to use?**
A: Yes! Licensed under MIT - see [LICENSE](LICENSE)

**Q: How do I report a security issue?**
A: See [SECURITY.md](SECURITY.md) for responsible disclosure

## 🆘 Need Help?

- 📖 Check the [documentation](README.md)
- 🐛 [Search existing issues](https://github.com/yourusername/ginem/issues)
- 💬 [Create a new issue](https://github.com/yourusername/ginem/issues/new)
- 📧 Email the maintainers

## 🎉 Ready to Code?

```bash
npm run dev
```

Happy coding! 🚀

---

**Next**: [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to contribute to Ginem.
