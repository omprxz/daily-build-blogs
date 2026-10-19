# Production VPS Deployment Guide

This guide describes deploying **Daily Build Blogs** onto a bare-metal or cloud Virtual Private Server (VPS) with **zero Docker overhead**, maximizing performance on lightweight hardware (such as a 1 vCPU, 4 GB RAM Hostinger KVM 1 VPS).

---

## 1. System Requirements & Hardware Target

- **OS:** Ubuntu 22.04 LTS or Debian 12
- **CPU:** 1 vCPU (or more)
- **RAM:** Minimum 2 GB (4 GB recommended)
- **Storage:** 25 GB NVMe / SSD
- **Network:** Public IPv4 with A records pointing to `blogs.yourdomain.com`

---

## 2. Server Provisioning & Packages

SSH into your VPS as a sudo user and install the base toolchain:

```bash
# Update repositories
sudo apt update && sudo apt upgrade -y

# Install essential build tools & Git
sudo apt install -y curl git build-essential ufw nginx certbot python3-certbot-nginx

# Install Node.js v22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

---

## 3. Configure PostgreSQL Database

```bash
# Switch to postgres user and create database & user
sudo -u postgres psql

# Inside PostgreSQL prompt:
CREATE USER dailybuild_user WITH PASSWORD 'ReplaceWithStrongDBPassword';
CREATE DATABASE daily_build_blogs OWNER dailybuild_user;
GRANT ALL PRIVILEGES ON DATABASE daily_build_blogs TO dailybuild_user;
\q
```

---

## 4. Firewall Setup (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## 5. Clone Application & Configure Environment

```bash
# Clone to /var/www/dailybuild
sudo mkdir -p /var/www/dailybuild
sudo chown -R $USER:$USER /var/www/dailybuild
git clone https://github.com/omprxz/daily-build-blogs.git /var/www/dailybuild
cd /var/www/dailybuild

# Configure server environment
cp server/.env.example server/.env
nano server/.env
```

Ensure `server/.env` contains your production settings:
```env
NODE_ENV=production
PORT=4000
APP_URL=https://blogs.dailybuild.tech
DATABASE_URL=postgresql://dailybuild_user:ReplaceWithStrongDBPassword@localhost:5432/daily_build_blogs
DB_NAME=daily_build_blogs
JWT_SECRET=use_openssl_rand_hex_32_here
SESSION_SECRET=use_openssl_rand_hex_32_here
ENCRYPTION_MASTER_KEY=use_64_character_hex_master_key_here
ADMIN_PASSWORD=ChangeMeOnFirstLogin!
UPLOAD_DIR=./uploads
```

---

## 6. Build Applications & Initialize Database

```bash
# 1. Build Client static & SSR bundles
cd /var/www/dailybuild/client
npm install --production=false
npm run build:all

# 2. Build Server TypeScript & Run Migrations
cd /var/www/dailybuild/server
npm install --production=false
npm run db:migrate
npm run db:seed
npm run build
```

---

## 7. PM2 Process Management

PM2 ensures the server, background daemon, and client SSR processes restart automatically after server reboots or crashes.

The configuration file is located at `server/ecosystem.config.cjs`:

```bash
cd /var/www/dailybuild/server

# Start all three application processes
pm2 start ecosystem.config.cjs

# Save PM2 process state to systemd
pm2 save
pm2 startup
# (Run the generated systemctl command displayed in the console)
```

### Process Monitoring
```bash
pm2 status
pm2 logs dailybuild-server
pm2 logs dailybuild-worker
pm2 logs dailybuild-client
```

---

## 8. Nginx Reverse Proxy & SSL Setup

1. Copy the provided Nginx configuration:
   ```bash
   sudo cp /var/www/dailybuild/nginx/blogs.dailybuild.tech.conf /etc/nginx/sites-available/blogs.dailybuild.tech.conf
   ```
2. Adjust the `server_name` in `/etc/nginx/sites-available/blogs.dailybuild.tech.conf` to match your domain.
3. Enable the virtual host:
   ```bash
   sudo ln -s /etc/nginx/sites-available/blogs.dailybuild.tech.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Obtain a free Let's Encrypt SSL/TLS Certificate:
   ```bash
   sudo certbot --nginx -d blogs.yourdomain.com
   ```

---

## 9. Zero-Downtime Deployment Script

To update the platform with new commits:

```bash
cd /var/www/dailybuild/server
bash scripts/deploy.sh
```

`deploy.sh` automatically pulls changes, rebuilds bundles, runs migrations, and reloads PM2 processes without dropping connections.

---

## 10. Automated Backups & Disaster Recovery

### Manual Backup
```bash
cd /var/www/dailybuild/server
bash scripts/backup.sh
```
This saves compressed database dumps and uploads to `server/backups/`.

### Automated Nightly Cron
Add this to your crontab (`crontab -e`):
```cron
# Run daily database and media backup at 03:00 AM
0 3 * * * /bin/bash /var/www/dailybuild/server/scripts/backup.sh >> /var/log/dailybuild-backup.log 2>&1
```

### Restoring from Backup
```bash
cd /var/www/dailybuild/server
bash scripts/restore.sh backups/daily_build_blogs_YYYYMMDD_HHMMSS.sql.gz backups/uploads_YYYYMMDD_HHMMSS.tar.gz
```
