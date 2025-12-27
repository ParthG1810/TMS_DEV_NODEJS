# macOS Setup Guide

Complete guide to set up and run TMS Desktop Application on macOS from scratch.

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

### 1.1 Install Homebrew (Package Manager)

Homebrew makes installing software on macOS easy.

**Open Terminal and run:**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**After installation, add Homebrew to PATH (Apple Silicon Macs):**
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

**Verify installation:**
```bash
brew --version
```

### 1.2 Install Node.js

**Using Homebrew (Recommended):**
```bash
brew install node
```

**Or using nvm (Node Version Manager):**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart Terminal or run:
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

Git usually comes pre-installed on macOS. If not:

```bash
# Install via Homebrew
brew install git

# Or install Xcode Command Line Tools
xcode-select --install
```

**Verify installation:**
```bash
git --version
```

### 1.4 Install MySQL

**Using Homebrew:**
```bash
brew install mysql
```

**Start MySQL service:**
```bash
brew services start mysql
```

**Secure MySQL installation:**
```bash
mysql_secure_installation
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
# Start MySQL
brew services start mysql

# Check status
brew services list | grep mysql
```

### 2.2 Login to MySQL

```bash
mysql -u root -p
```
Enter your root password when prompted.

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

### 2.4 Create Application User (Recommended)

```sql
-- Login as root first
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
# Check for any issues
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

**Using TextEdit:**
```bash
open -a TextEdit Backend/.env
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

### 8.1 Build Commands

**Navigate to electron folder:**
```bash
cd electron
```

**Build for macOS:**
```bash
npm run package:mac
```

### 8.2 Build Output

After successful build, files are in `electron/dist-packages/`:

```
dist-packages/
├── TMS-Desktop-1.0.0-macOS-x64.dmg       # Intel Mac installer
├── TMS-Desktop-1.0.0-macOS-arm64.dmg     # Apple Silicon installer
└── mac/                                   # App bundle
    └── TMS Desktop.app
```

### 8.3 Run the Built Application

**Mount and install DMG:**
```bash
open dist-packages/TMS-Desktop-1.0.0-macOS-*.dmg
```

Then drag the app to Applications folder.

**Run directly:**
```bash
open "dist-packages/mac/TMS Desktop.app"
```

### 8.4 Code Signing (For Distribution)

For distribution outside the App Store, you need to sign the app:

**Disable signing for development:**
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run package:mac
```

**Sign with Developer ID:**
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-certificate-password
npm run package:mac
```

---

## 9. Troubleshooting

### 9.1 Homebrew Issues

**Command not found: brew**
```bash
# For Apple Silicon (M1/M2)
eval "$(/opt/homebrew/bin/brew shellenv)"

# For Intel Macs
eval "$(/usr/local/bin/brew shellenv)"
```

### 9.2 Node.js / npm Issues

**Error: command not found: node**
```bash
# If using nvm
source ~/.zshrc
nvm use --lts

# Or reinstall via Homebrew
brew reinstall node
```

**Permission errors with npm:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### 9.3 MySQL Connection Issues

**Error: Access denied for user 'root'@'localhost'**
```bash
# Reset root password
brew services stop mysql
mysqld_safe --skip-grant-tables &
mysql -u root

# In MySQL:
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
EXIT;

# Restart MySQL
brew services start mysql
```

**Error: Can't connect to local MySQL server**
```bash
# Check if MySQL is running
brew services list

# Start MySQL
brew services start mysql

# Check socket file
ls -la /tmp/mysql.sock
```

**Socket file missing:**
```bash
# Restart MySQL
brew services restart mysql
```

### 9.4 Port Already in Use

The Electron app automatically handles port conflicts by trying fallback ports:
- Backend: 47847 → 47849 → 47851
- Frontend: 47848 → 47850 → 47852

If all ports are in use, you can manually free them:

**Find and kill process using a port:**
```bash
# Find process using port 47847
lsof -i :47847

# Kill process
kill -9 <PID>
```

### 9.5 Build Issues

**Code signing errors:**
```bash
# Skip code signing for development
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run package:mac
```

**Hardened Runtime errors:**
```bash
# The app may need to be notarized for distribution
# For development, you can allow apps from identified developers:
# System Preferences > Security & Privacy > Allow apps from identified developers
```

### 9.6 App Won't Open (Gatekeeper)

**"App is damaged and can't be opened"**
```bash
# Remove quarantine attribute
xattr -cr "/Applications/TMS Desktop.app"
```

**"App from unidentified developer"**
1. Go to System Preferences > Security & Privacy
2. Click "Open Anyway" next to the blocked app message

---

## Quick Start Checklist

Use this checklist to verify your setup:

- [ ] Homebrew installed (`brew --version`)
- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (`git --version`)
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

## macOS-Specific Notes

### File Paths
- Home directory: `~` or `/Users/yourusername`
- Applications: `/Applications`
- Homebrew (Apple Silicon): `/opt/homebrew`
- Homebrew (Intel): `/usr/local`

### Terminal Shortcuts
- New Terminal window: `Cmd + N`
- New Terminal tab: `Cmd + T`
- Clear Terminal: `Cmd + K`
- Copy: `Cmd + C`
- Paste: `Cmd + V`

### Useful Commands
```bash
# Open current folder in Finder
open .

# Open file with default application
open filename

# Open with specific application
open -a "Application Name" filename
```

---

## Need Help?

- Check [README.md](../README.md) for general documentation
- See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for Gmail integration
- Open an issue: https://github.com/ParthG1810/TMS_DEV_NODEJS/issues
