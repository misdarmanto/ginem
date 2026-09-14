#!/bin/bash

# Ginem Dev Monorepo - Setup Script
# This script sets up the monorepo for development

set -e  # Exit on error

echo "🚀 Setting up Ginem Dev Monorepo..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies installed!"
echo ""

# Check if environment files exist
echo "🔐 Checking environment files..."

if [ ! -f "packages/api/.env" ]; then
    echo "⚠️  packages/api/.env not found. Copying from .env.example..."
    if [ -f "packages/api/.env.example" ]; then
        cp packages/api/.env.example packages/api/.env
        echo "✅ Created packages/api/.env"
        echo "⚠️  Please update packages/api/.env with your configuration"
    else
        echo "❌ packages/api/.env.example not found"
    fi
fi

if [ ! -f "packages/dashboard/.env" ]; then
    echo "⚠️  packages/dashboard/.env not found. Copying from .env.example..."
    if [ -f "packages/dashboard/.env.example" ]; then
        cp packages/dashboard/.env.example packages/dashboard/.env
        echo "✅ Created packages/dashboard/.env"
    else
        echo "⚠️  packages/dashboard/.env.example not found"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo ""
echo "1. Update environment variables (optional):"
echo "   nano packages/api/.env"
echo "   nano packages/dashboard/.env"
echo ""
echo "2. Start development - just ONE command:"
echo "   npm run dev"
echo ""
echo "   That's it! Both API and Dashboard will start automatically."
echo ""
echo "   Or run them separately in different terminals:"
echo "   npm run dev:api       (Terminal 1)"
echo "   npm run dev:dashboard (Terminal 2)"
echo ""
echo "3. Documentation:"
echo "   - README.md (Main guide)"
echo "   - MONOREPO_SETUP.md (Setup details)"
echo "   - DEPLOYMENT.md (Production deployment)"
echo ""
echo "Happy coding! 🚀"
