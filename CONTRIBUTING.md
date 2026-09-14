# Contributing to Ginem

First off, thank you for considering contributing to Ginem! It's people like you that make Ginem such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue
* **Describe the exact steps** which reproduce the problem
* **Provide specific examples** to demonstrate the steps
* **Describe the behavior you observed** after following the steps
* **Explain which behavior you expected** to see instead and why
* **Include screenshots and animated GIFs** if possible
* **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description** of the suggested enhancement
* **Provide specific examples** to demonstrate the steps
* **Explain why this enhancement would be useful**
* **List any related third-party projects** that implement this enhancement

### Pull Requests

* Fill in the required template
* Follow the JavaScript/TypeScript styleguides
* End all files with a newline
* Avoid platform-specific code

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* When only changing documentation, include `[ci skip]` in the commit description

Example:
```
Add ability to auto-save documents

- Implement auto-save functionality with 30s interval
- Add user preference to enable/disable auto-save
- Save to IndexedDB for offline persistence

Fixes #123
```

### TypeScript/JavaScript Styleguide

* Use meaningful variable names
* Use camelCase for variables and functions
* Use PascalCase for classes and components
* Write descriptive comments for complex logic
* Keep functions small and focused

### Documentation Styleguide

* Use Markdown
* Use clear, concise language
* Include code examples where relevant
* Keep documentation up-to-date with code changes

## Development Setup

### Prerequisites

* Node.js 18+
* npm 9+

### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/ginem.git
   cd ginem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes**
   - Create your feature/fix
   - Write tests if applicable
   - Update documentation

5. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   npm run lint:fix
   ```

6. **Build the project**
   ```bash
   npm run build
   ```

7. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add your commit message"
   ```

8. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **Create a Pull Request**
   - Go to GitHub and create a PR
   - Fill in the PR template
   - Link related issues

## Testing

* Write tests for new features
* Ensure all tests pass: `npm test`
* Maintain or improve code coverage
* Test on multiple browsers if applicable

## Project Structure

```
ginem/
├── packages/
│   ├── api/              # Backend API (Express)
│   └── dashboard/        # Frontend (React + Vite)
├── scripts/              # Utility scripts
├── .github/              # GitHub templates & workflows
└── docs/                 # Documentation
```

## Additional Notes

### Issue and Pull Request Labels

* `bug` - Something isn't working
* `enhancement` - New feature or request
* `documentation` - Improvements or additions to documentation
* `good first issue` - Good for newcomers
* `help wanted` - Extra attention is needed
* `question` - Further information is requested
* `wontfix` - This will not be worked on

### Additional Resources

* [GitHub Guides](https://guides.github.com)
* [GitHub Help](https://help.github.com)
* [Project Documentation](README.md)
* [Monorepo Setup](MONOREPO_SETUP.md)

## Recognition

Contributors will be recognized in:
* README.md contributors section
* Release notes
* Project website (if applicable)

## Questions?

Feel free to open an issue with the label `question` or reach out to the maintainers.

Thank you for contributing! 🎉
