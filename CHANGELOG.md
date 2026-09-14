# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Monorepo structure with npm workspaces
- Single command development setup (`npm run dev`)
- Professional GitHub configuration
- Docker support for development and production
- PM2 deployment configuration
- Comprehensive documentation

### Changed
- Project reorganized into `packages/api` and `packages/dashboard`

### Fixed
- Vite configuration for proper development server setup

## [1.0.0] - 2024-01-XX

### Added
- Initial monorepo release
- Backend API with Express and TypeScript
- Frontend Dashboard with React, Vite, and TypeScript
- Docker Compose for local development
- PM2 configuration for production deployment
- Comprehensive project documentation
- GitHub Actions CI/CD workflows
- Professional open source setup

### Features
- Single command to run both API and Dashboard
- Colored, formatted console output
- Workspace-based dependency management
- Single repository for all code
- Easy deployment process

---

## Format Guide

### Added
for new features.

### Changed
for changes in existing functionality.

### Deprecated
for soon-to-be removed features.

### Removed
for now removed features.

### Fixed
for any bug fixes.

### Security
in case of vulnerabilities.

---

## How to Update

When making a release:

1. Update version in `package.json`
2. Update `CHANGELOG.md` with new section
3. Create git tag: `git tag -a v1.0.0 -m "Version 1.0.0"`
4. Push: `git push origin main --tags`
5. Create GitHub Release from the tag

---

[Unreleased]: https://github.com/yourusername/ginem/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/ginem/releases/tag/v1.0.0
