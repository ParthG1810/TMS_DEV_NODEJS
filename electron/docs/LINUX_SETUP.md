# Linux Setup Guide

Complete guide to set up and run TMS Desktop Application on Linux from scratch.

This guide covers Ubuntu/Debian-based distributions. Commands for Fedora/RHEL and Arch Linux are also provided where applicable.

---

## Table of Contents

1. [Prerequisites Installation](#1-prerequisites-installation)
2. [MySQL Database Setup](#2-mysql-database-setup)
3. [Clone the Repository](#3-clone-the-repository)
4. [Install Dependencies](#4-install-dependencies)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Schema Setup](#6-database-schema-setup)
7. [Running the Application](#7-running-the-application)
8. [Building for Distribution](#8-building-for-distribution)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites Installation

### 1.1 Update System Packages

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Fedora:**
```bash
sudo dnf update -y
```

**Arch Linux:**
```bash
sudo pacman -Syu
```

### 1.2 Install Node.js

#### Option A: Using NodeSource (Recommended)

**Ubuntu/Debian:**
```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Fedora:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

#### Option B: Using nvm (Node Version Manager)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc
# Or for Zsh:
source ~/.zshrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

**Verify installation:**
```bash
node --version
npm --version
```

Expected output:
```
v18.x.x (or higher)
9.x.x (or higher)
```

### 1.3 Install Git

**Ubuntu/Debian:**
```bash
sudo apt install -y git
```

**Fedora:**
```bash
sudo dnf install -y git
```

**Arch Linux:**
```bash
sudo pacman -S git
```

**Verify installation:**
```bash
git --version
```

### 1.4 Install Build Essentials

Required for compiling native Node modules:

**Ubuntu/Debian:**
```bash
sudo apt install -y build-essential python3
```

**Fedora:**
```bash
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y python3
```

**Arch Linux:**
```bash
sudo pacman -S base-devel python
```

### 1.5 Install MySQL

**Ubuntu/Debian:**
```bash
sudo apt install -y mysql-server
```

**Fedora:**
```bash
sudo dnf install -y mysql-server
```

**Arch Linux:**
```bash
sudo pacman -S mariadb
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
```

**Start and enable MySQL service:**

**Ubuntu/Debian/Fedora:**
```bash
sudo systemctl start mysql
sudo systemctl enable mysql
```

**Arch Linux (MariaDB):**
```bash
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

**Secure MySQL installation:**
```bash
sudo mysql_secure_installation
```

Follow the prompts:
- Set root password (remember this!)
- Remove anonymous users: Yes
- Disallow root login remotely: Yes
- Remove test database: Yes
- Reload privilege tables: Yes

**Verify installation:**
```bash
mysql --version
```

---

## 2. MySQL Database Setup

### 2.1 Start MySQL Service

```bash
# Check status
sudo systemctl status mysql

# Start if not running
sudo systemctl start mysql
```

### 2.2 Login to MySQL

**Ubuntu (may require sudo first time):**
```bash
sudo mysql -u root -p
```

**Other distros:**
```bash
mysql -u root -p
```

### 2.3 Create Database

**Inside MySQL prompt:**
```sql
-- Create the database
CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verify creation
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

### 2.4 Configure Root User for Password Authentication

On Ubuntu, MySQL root uses auth_socket by default. To use password authentication:

```sql
-- Login as root
sudo mysql

-- Change authentication method
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
EXIT;
```

### 2.5 Create Application User (Recommended)

```sql
mysql -u root -p

-- Create user
CREATE USER 'tms_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON tms_database.* TO 'tms_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

EXIT;
```

---

## 3. Clone the Repository

### 3.1 Choose Installation Directory

```bash
# Navigate to where you want to install
cd ~/Documents

# Or create a dedicated folder
mkdir -p ~/Projects
cd ~/Projects
```

### 3.2 Clone the Repository

```bash
git clone https://github.com/ParthG1810/TMS_DEV_NODEJS.git
cd TMS_DEV_NODEJS
```

### 3.3 Verify Directory Structure

```bash
ls -la
```

You should see:
```
Backend/
Frontend/
electron/
...
```

---

## 4. Install Dependencies

### 4.1 Install All Dependencies

```bash
# Install Backend dependencies
cd Backend && npm install && cd ..

# Install Frontend dependencies
cd Frontend && npm install && cd ..

# Install Electron dependencies
cd electron && npm install && cd ..
```

**Or one-liner:**
```bash
cd Backend && npm install && cd ../Frontend && npm install && cd ../electron && npm install && cd ..
```

### 4.2 Verify Installation

```bash
cd Backend && npm list --depth=0 && cd ..
cd Frontend && npm list --depth=0 && cd ..
cd electron && npm list --depth=0 && cd ..
```

---

## 5. Environment Configuration

### 5.1 Create .env File

```bash
cp Backend/.env.example Backend/.env
```

### 5.2 Edit .env File

**Using nano:**
```bash
nano Backend/.env
```

**Using vim:**
```bash
vim Backend/.env
```

**Using VS Code:**
```bash
code Backend/.env
```

**Using gedit (GNOME):**
```bash
gedit Backend/.env
```

### 5.3 Configure Required Settings

Edit the `.env` file with your values:

```env
# Environment
NODE_ENV=development

# Server Configuration (ports are auto-configured by Electron app)
PORT=47847
DEV_API=http://localhost:47847
PRODUCTION_API=https://your-production-url.com

# Database Configuration (REQUIRED - Update these!)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_ROOT_PASSWORD
DB_NAME=tms_database
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your-random-secret-key-here-make-it-long-and-random
JWT_EXPIRES_IN=3d

# Gmail OAuth (Optional - see docs/GOOGLE_OAUTH_SETUP.md)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:47847/api/gmail/callback

# Next.js Public URL
NEXT_PUBLIC_API_URL=http://localhost:47847
```

### 5.4 Generate JWT Secret

```bash
# Generate a random 64-character secret
openssl rand -base64 48
```

Copy the output and paste it as your `JWT_SECRET` value.

---

## 6. Database Schema Setup

### 6.1 Import Database Schema

If a schema file exists:

```bash
mysql -u root -p tms_database < database/schema.sql
```

### 6.2 Verify Tables

```bash
mysql -u root -p -e "USE tms_database; SHOW TABLES;"
```

---

## 7. Running the Application

### 7.1 Development Mode (Recommended for First Run)

```bash
cd electron
npm run dev
```

This starts:
- Backend API server on `http://localhost:47847` (with fallback to 47849, 47851)
- Frontend on `http://localhost:47848` (with fallback to 47850, 47852)
- Electron window

> **Note**: The app uses uncommon ports to avoid conflicts with development tools. If a port is in use, it automatically tries the next available port from the fallback list.

### 7.2 Run Components Separately

Open three Terminal windows/tabs:

**Terminal 1 - Backend:**
```bash
cd Backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd Frontend
npm run dev
```

**Terminal 3 - Electron:**
```bash
cd electron
npm run build
npm run dev:electron
```

### 7.3 Verify Application

1. The Electron window should open automatically
2. Check the Terminal for any errors
3. Navigate through the application to verify functionality

---

## 8. Building for Distribution

### 8.1 Install Additional Dependencies for Building

**Ubuntu/Debian:**
```bash
sudo apt install -y rpm fakeroot dpkg
```

**Fedora:**
```bash
sudo dnf install -y rpm-build dpkg fakeroot
```

### 8.2 Build Commands

**Navigate to electron folder:**
```bash
cd electron
```

**Build for Linux:**
```bash
npm run package:linux
```

### 8.3 Build Output

After successful build, files are in `electron/dist-packages/`:

```
dist-packages/
├── TMS-Desktop-1.0.0-Linux.AppImage     # Universal Linux package
├── TMS-Desktop-1.0.0-Linux.deb          # Debian/Ubuntu package
└── linux-unpacked/                       # Unpacked app
    └── tms-desktop
```

### 8.4 Run the Built Application

**AppImage (Universal):**
```bash
chmod +x dist-packages/TMS-Desktop-1.0.0-Linux.AppImage
./dist-packages/TMS-Desktop-1.0.0-Linux.AppImage
```

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i dist-packages/TMS-Desktop-1.0.0-Linux.deb

# If there are dependency issues:
sudo apt --fix-broken install
```

**Run unpacked:**
```bash
./dist-packages/linux-unpacked/tms-desktop
```

---

## 9. Troubleshooting

### 9.1 Node.js / npm Issues

**Error: command not found: node**
```bash
# If using nvm
source ~/.bashrc
nvm use --lts

# Or check PATH
echo $PATH

# Add Node.js to PATH if needed
export PATH=$PATH:/usr/local/bin
```

**Permission errors with npm:**
```bash
# Fix npm global directory permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**EACCES permission denied:**
```bash
# Fix ownership
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ~/node_modules
```

### 9.2 MySQL Connection Issues

**Error: Access denied for user 'root'@'localhost'**
```bash
# On Ubuntu, try with sudo first
sudo mysql -u root

# Then change authentication method
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
FLUSH PRIVILEGES;
```

**Error: Can't connect to local MySQL server**
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Start MySQL
sudo systemctl start mysql

# Check if socket exists
ls -la /var/run/mysqld/mysqld.sock
```

**Socket file missing:**
```bash
# Create socket directory
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld

# Restart MySQL
sudo systemctl restart mysql
```

### 9.3 Electron Display Issues

**Error: Cannot open display**
```bash
# Ensure you're running in a graphical environment
echo $DISPLAY

# Should output something like ":0" or ":1"
# If empty, you're not in a graphical session
```

**Sandbox issues:**
```bash
# If AppImage won't run due to sandbox
./TMS-Desktop-1.0.0-Linux.AppImage --no-sandbox
```

**libGL errors:**

**Ubuntu/Debian:**
```bash
sudo apt install -y libgl1-mesa-glx libgl1-mesa-dri
```

**Fedora:**
```bash
sudo dnf install -y mesa-libGL mesa-dri-drivers
```

### 9.4 Port Already in Use

The Electron app automatically handles port conflicts by trying fallback ports:
- Backend: 47847 → 47849 → 47851
- Frontend: 47848 → 47850 → 47852

If all ports are in use, you can manually free them:

**Find and kill process using a port:**
```bash
# Find process using port 47847
sudo lsof -i :47847

# Or using ss
ss -tulpn | grep 47847

# Kill process
kill -9 <PID>
```

### 9.5 Build Issues

**Missing dependencies for electron-builder:**

**Ubuntu/Debian:**
```bash
sudo apt install -y libarchive-tools
```

**AppImage won't run:**
```bash
# Install FUSE
sudo apt install -y fuse libfuse2

# Make executable
chmod +x TMS-Desktop-1.0.0-Linux.AppImage
```

**RPM build fails (on Debian/Ubuntu):**
```bash
sudo apt install -y rpm
```

### 9.6 Permission Issues

**Fix npm global permissions:**
```bash
sudo chown -R $USER:$(id -gn $USER) ~/.config
sudo chown -R $USER:$(id -gn $USER) ~/.npm
```

**Fix electron-builder cache:**
```bash
sudo chown -R $USER:$(id -gn $USER) ~/.cache/electron
sudo chown -R $USER:$(id -gn $USER) ~/.cache/electron-builder
```

---

## Quick Start Checklist

Use this checklist to verify your setup:

- [ ] System packages updated
- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] Build essentials installed
- [ ] MySQL installed and running (`mysql --version`)
- [ ] Repository cloned
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Electron dependencies installed
- [ ] `.env` file created and configured
- [ ] Database created
- [ ] Application runs in development mode
- [ ] (Optional) Application builds successfully

---

## Distribution-Specific Notes

### Ubuntu/Debian
- Package manager: `apt`
- MySQL service name: `mysql`
- Default shell: `bash`

### Fedora/RHEL
- Package manager: `dnf` (or `yum` for older versions)
- MySQL service name: `mysqld`
- Default shell: `bash`

### Arch Linux
- Package manager: `pacman`
- Uses MariaDB instead of MySQL
- Service name: `mariadb`
- Default shell: `bash`

### Useful Linux Commands
```bash
# Check system info
uname -a

# Check distribution
cat /etc/os-release

# Check available disk space
df -h

# Check memory usage
free -h

# Find a command location
which node

# View environment variables
printenv

# Add to PATH permanently
echo 'export PATH=$PATH:/new/path' >> ~/.bashrc
source ~/.bashrc
```

---

## Need Help?

- Check [README.md](../README.md) for general documentation
- See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for Gmail integration
- Open an issue: https://github.com/ParthG1810/TMS_DEV_NODEJS/issues
