# Contributing to Daily Build Blogs

Thank you for your interest in contributing to Daily Build Blogs! We welcome contributions from developers, technical writers, and designers.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- **Node.js**: v20+ LTS or v22+
- **PostgreSQL**: v14+ (database `daily_build_blogs`)
- **Package Manager**: `npm` v10+

### Architecture Overview

Daily Build Blogs is structured into independent packages:
- `client/`: React 18, TypeScript, Tailwind CSS, Vite with dual client SPA and SSR builds (`@xyflow/react` for visual workflow orchestration).
- `server/`: Express.js, TypeScript, Drizzle ORM with PostgreSQL, dynamic AI provider adapters, image processing with Sharp, and background worker daemon.
- `local-agent/`: Lightweight standalone automation agent using Playwright for desktop-assisted AI operations.
- `nginx/`: Production reverse-proxy virtual host configuration with HTTP/2 and caching.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architectural documentation.

## Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/omprxz/daily-build-blogs.git
   cd daily-build-blogs
   ```

2. **Configure environment files**:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   cp local-agent/.env.example local-agent/.env
   ```
   Configure your local PostgreSQL credentials in `server/.env`.

3. **Install dependencies**:
   ```bash
   # Install client dependencies
   cd client && npm install && cd ..

   # Install server dependencies
   cd server && npm install && cd ..

   # Install local-agent dependencies (optional)
   cd local-agent && npm install && cd ..
   ```

4. **Initialize Database**:
   ```bash
   cd server
   npm run db:migrate
   npm run db:seed
   cd ..
   ```

5. **Start Development Servers**:
   In terminal 1 (Backend API & SSR):
   ```bash
   cd server && npm run dev
   ```
   In terminal 2 (Frontend Client Vite server):
   ```bash
   cd client && npm run dev
   ```
   In terminal 3 (Optional local agent):
   ```bash
   cd local-agent && npm start
   ```

## Quality Guidelines

Before submitting a Pull Request, verify:
- **Type Checking**: Run `npm run build` in both `client/` and `server/`.
- **Tests**: Run `npm test` inside `server/` to ensure all unit and integration tests pass.
- **Linting & Code Quality**: Maintain clean TypeScript without unused imports or unhandled promises.
- **Sensitive Data**: Never commit `.env` files, API keys, credentials, or personal database dumps.

## Pull Request Guidelines

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Keep changes focused and atomic.
3. Write clear commit messages following Conventional Commits format (`feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`).
4. Ensure your PR description uses the template provided in `.github/PULL_REQUEST_TEMPLATE.md`.
5. A maintainer will review your pull request and provide feedback.

## Reporting Bugs

Please open an issue using the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.yml). Provide environment details, error logs, and reproduction steps.
