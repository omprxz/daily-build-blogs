# Installation & Setup Guide

This guide provides end-to-end instructions for installing, configuring, and verifying **Daily Build Blogs** in both local development and production environments.

---

## 1. Package Structure & Architecture Notice

> [!NOTE]
> Daily Build Blogs is organized as **independent Node.js packages** rather than an npm workspace monorepo. Dependencies and scripts are executed inside their respective directories:
> - `client/`: React 18 frontend with Vite and SSR client/server bundles.
> - `server/`: Node.js + Express.js backend, Drizzle ORM, and background daemon.
> - `local-image-mcp/`: Model Context Protocol (MCP) server for automated browser-assisted ChatGPT image synthesis.

---

## 2. System Prerequisites

| Requirement | Minimum Version | Recommended Version | Verification Command |
| ----------- | --------------- | ------------------- | -------------------- |
| **Node.js** | `v20.0.0` (LTS) | `v22.x` (LTS)       | `node --version`     |
| **npm**     | `v10.0.0`       | `v10.9.x`+          | `npm --version`      |
| **PostgreSQL** | `14.0`       | `16.x`              | `psql --version`     |
| **PM2** (Prod) | `5.0.0`      | Latest (`5.4.x`)    | `pm2 --version`      |
| **Nginx** (Prod) | `1.18.0`   | `1.24.x`+           | `nginx -v`           |

---

## 3. Step-by-Step Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/omprxz/daily-build-blogs.git
cd daily-build-blogs
```

### Step 2: Initialize PostgreSQL Database

Ensure PostgreSQL is running, then create the database:

```bash
# On Linux / macOS:
sudo -u postgres createdb daily_build_blogs

# Or inside the PostgreSQL shell:
psql -U postgres -c "CREATE DATABASE daily_build_blogs;"
```

### Step 3: Configure Environment Variables

Each subsystem reads from its own local `.env` file:

```bash
# Copy templates
cp server/.env.example server/.env
cp client/.env.example client/.env
cp local-image-mcp/.env.example local-image-mcp/.env
```

#### Configure `server/.env` (Required):
Open `server/.env` and configure:
```env
# Database connection
DATABASE_URL=postgresql://postgres:your_db_password@localhost:5432/daily_build_blogs
DB_NAME=daily_build_blogs

# Security Secrets (Generate using: openssl rand -hex 32)
JWT_SECRET=your_generated_32_byte_jwt_secret
SESSION_SECRET=your_generated_32_byte_session_secret
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Initial Admin Credentials
ADMIN_EMAIL=admin@dailybuild.tech
ADMIN_NAME="System Administrator"
ADMIN_PASSWORD=YourSecureAdminPassword2026!

# AI Provider API Keys (At least one recommended)
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Configure `client/.env` (Optional defaults work for local dev):
```env
PORT=4444
APP_URL=http://localhost:4000
API_TARGET=http://localhost:4000
VITE_API_BASE_URL=http://localhost:4000/api
```

---

### Step 4: Install Dependencies

Install dependencies in each subproject:

```bash
# 1. Install Client Dependencies
cd client
npm install
cd ..

# 2. Install Server Dependencies
cd server
npm install
cd ..

# 3. (Optional) Install Local Image MCP Dependencies
cd local-image-mcp
npm install
cd ..
```

---

### Step 5: Database Schema Migration & Seeding

Navigate to `server/` and run the Drizzle migrations and idempotent seeds:

```bash
cd server

# Run SQL schema migrations
npm run db:migrate

# Seed default administrator, 10 verified RSS feeds, default categories, and prompt templates
npm run db:seed

cd ..
```

> [!TIP]
> The seed script (`src/database/seed.ts`) is completely **idempotent**. Running it multiple times safely synchronizes missing records without duplicating existing categories or feeds.

---

## 4. Running in Development Mode

Run the backend and frontend in separate terminal windows:

### Terminal 1: Backend Express Server (API + SSR)
```bash
cd server
npm run dev
```
- **Port:** `http://localhost:4000`
- **Admin CMS:** `http://localhost:4000/admin`
- **API Health:** `http://localhost:4000/api/settings/public`

### Terminal 2: Frontend Vite Development Server (Hot Module Reloading)
```bash
cd client
npm run dev
```
- **Port:** `http://localhost:5173` (Vite dev server with HMR)

### Terminal 3 (Optional): Local Image MCP Server
```bash
cd local-image-mcp
npm start
```
- **Port:** `http://localhost:4580` (Streamable HTTP MCP endpoint at `/mcp`, web dashboard at `/`)

---

## 5. Compiling Production Bundles

To build the application for production deployment:

```bash
# 1. Compile Client static bundle and React SSR entry point
cd client
npm run build:all
cd ..

# 2. Compile Server TypeScript source into dist/
cd server
npm run build
cd ..
```

This generates:
- `client/dist/client/`: Static client bundles, HTML entry point, and bundled styles.
- `client/dist/server/`: React SSR server rendering bundle (`entry-server.js`).
- `server/dist/`: Compiled Node.js/Express.js backend and background worker.

---

## 6. Verification Status of Documented Commands

To maintain strict open-source accuracy, commands are categorized by verification level:

### Verified via Live Execution
- `cd client && npm run build:all`: **VERIFIED**. Compiles client bundle and SSR bundle in 13.4s without error.
- `cd server && npm run build`: **VERIFIED**. Compiles TypeScript into `dist/` with exit code 0.
- `cd server && npm test`: **VERIFIED**. Executes all 8 unit and integration tests with exit code 0.
- `node --check local-image-mcp/src/index.js`: **VERIFIED**. Syntax verified valid.

### Verified via Code Implementation
- `npm run db:migrate`: Executes `tsx src/database/migrate.ts` creating all tables, indexes, and constraints.
- `npm run db:seed`: Executes `tsx src/database/seed.ts` seeding admin, categories, feeds, and AI provider configurations.
- `pm2 start server/ecosystem.config.cjs`: Launches `dailybuild-server`, `dailybuild-worker`, and `dailybuild-client`.
