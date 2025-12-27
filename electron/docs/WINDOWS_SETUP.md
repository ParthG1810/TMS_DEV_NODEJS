# Windows Setup Guide

Complete guide to set up and run TMS Desktop Application on Windows from scratch.

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

### 1.1 Install Node.js

1. Download Node.js LTS from: https://nodejs.org/
2. Run the installer (`node-vXX.XX.X-x64.msi`)
3. Follow the installation wizard (keep default options)
4. Check "Automatically install necessary tools" if prompted

**Verify installation (PowerShell or CMD):**
```powershell
node --version
npm --version
```

Expected output:
```
v18.x.x (or higher)
9.x.x (or higher)
```

### 1.2 Install Git

1. Download Git from: https://git-scm.com/download/win
2. Run the installer
3. Use recommended settings (or customize as needed)
4. Select "Use Git from the Windows Command Prompt"

**Verify installation:**
```powershell
git --version
```

### 1.3 Install MySQL

#### Option A: MySQL Installer (Recommended)

1. Download MySQL Installer from: https://dev.mysql.com/downloads/installer/
2. Choose "Full" or "Custom" installation
3. Select these components:
   - MySQL Server 8.x
   - MySQL Workbench (optional, for GUI management)
4. Follow the configuration wizard:
   - Choose "Development Computer"
   - Set root password (remember this!)
   - Keep default port: `3306`

#### Option B: MySQL via Chocolatey

```powershell
# Install Chocolatey first (run as Administrator)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install MySQL
choco install mysql -y
```

**Verify MySQL installation:**
```powershell
mysql --version
```

### 1.4 Add MySQL to PATH (if not already)

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab > **Environment Variables**
3. Under "System variables", find `Path`, click **Edit**
4. Click **New** and add: `C:\Program Files\MySQL\MySQL Server 8.0\bin`
5. Click **OK** on all dialogs
6. Restart PowerShell/CMD

---

## 2. MySQL Database Setup

### 2.1 Start MySQL Service

**PowerShell (Administrator):**
```powershell
# Check if MySQL is running
Get-Service -Name "MySQL*"

# Start MySQL if not running
Start-Service -Name "MySQL80"
```

**Or using Services GUI:**
1. Press `Win + R`, type `services.msc`, press Enter
2. Find "MySQL80" or "MySQL"
3. Right-click > Start

### 2.2 Login to MySQL

**PowerShell or CMD:**
```cmd
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

For better security, create a dedicated user instead of using root:

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

**PowerShell:**
```powershell
# Navigate to where you want to install (e.g., Documents)
cd $HOME\Documents

# Or create a dedicated folder
mkdir Projects
cd Projects
```

### 3.2 Clone the Repository

```powershell
git clone https://github.com/ParthG1810/TMS_DEV_NODEJS.git
cd TMS_DEV_NODEJS
```

### 3.3 Verify Directory Structure

```powershell
dir
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

**PowerShell (recommended):**
```powershell
# Install Backend dependencies
cd Backend
npm install
cd ..

# Install Frontend dependencies
cd Frontend
npm install
cd ..

# Install Electron dependencies
cd electron
npm install
cd ..
```

**Or one-liner (PowerShell):**
```powershell
cd Backend; npm install; cd ..\Frontend; npm install; cd ..\electron; npm install; cd ..
```

**CMD:**
```cmd
cd Backend && npm install && cd ..\Frontend && npm install && cd ..\electron && npm install && cd ..
```

### 4.2 Verify Installation

```powershell
# Check Backend
cd Backend
npm list --depth=0
cd ..

# Check Frontend
cd Frontend
npm list --depth=0
cd ..

# Check Electron
cd electron
npm list --depth=0
cd ..
```

---

## 5. Environment Configuration

### 5.1 Create .env File

**PowerShell:**
```powershell
Copy-Item Backend\.env.example Backend\.env
```

**CMD:**
```cmd
copy Backend\.env.example Backend\.env
```

### 5.2 Edit .env File

Open with your preferred editor:

**PowerShell:**
```powershell
notepad Backend\.env
```

**Or use VS Code:**
```powershell
code Backend\.env
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

**PowerShell:**
```powershell
# Generate a random 64-character secret
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Copy the output and paste it as your `JWT_SECRET` value.

---

## 6. Database Schema Setup

### 6.1 Import Database Schema

If a schema file exists:

```powershell
mysql -u root -p tms_database < database\schema.sql
```

### 6.2 Verify Tables

```cmd
mysql -u root -p -e "USE tms_database; SHOW TABLES;"
```

---

## 7. Running the Application

### 7.1 Development Mode (Recommended for First Run)

**PowerShell:**
```powershell
cd electron
npm run dev
```

This starts:
- Backend API server on `http://localhost:47847` (with fallback to 47849, 47851)
- Frontend on `http://localhost:47848` (with fallback to 47850, 47852)
- Electron window

> **Note**: The app uses uncommon ports to avoid conflicts with development tools. If a port is in use, it automatically tries the next available port from the fallback list.

### 7.2 Run Components Separately

Open three PowerShell windows:

**Window 1 - Backend:**
```powershell
cd Backend
npm run dev
```

**Window 2 - Frontend:**
```powershell
cd Frontend
npm run dev
```

**Window 3 - Electron:**
```powershell
cd electron
npm run build
npm run dev:electron
```

### 7.3 Verify Application

1. The Electron window should open automatically
2. Check the console for any errors
3. Navigate through the application to verify functionality

---

## 8. Building for Distribution

### 8.1 Build Commands

**Navigate to electron folder:**
```powershell
cd electron
```

**Build Options:**

| Command | Description |
|---------|-------------|
| `npm run package:win` | NSIS installer (default) |
| `npm run package:win:nsis` | NSIS installer |
| `npm run package:win:portable` | Portable .exe |
| `npm run package:win:fast` | Fast portable build |
| `npm run package:win:both` | Both NSIS + Portable |

**Example:**
```powershell
npm run package:win
```

### 8.2 Build Output

After successful build, files are in `electron\dist-packages\`:

```
dist-packages\
├── TMS-Desktop-1.0.0-Windows-Setup.exe      # Installer
├── TMS-Desktop-1.0.0-Windows-Setup.exe.blockmap
├── TMS-Desktop-1.0.0-Windows-Portable.exe   # Portable (if built)
└── win-unpacked\                            # Unpacked app
    └── TMS Desktop.exe
```

### 8.3 Run the Built Application

**Run Installer:**
```powershell
.\dist-packages\TMS-Desktop-1.0.0-Windows-Setup.exe
```

**Run Portable:**
```powershell
.\dist-packages\TMS-Desktop-1.0.0-Windows-Portable.exe
```

**Run Unpacked:**
```powershell
& ".\dist-packages\win-unpacked\TMS Desktop.exe"
```

---

## 9. Troubleshooting

### 9.1 Node.js / npm Issues

**Error: 'node' is not recognized**
```powershell
# Reinstall Node.js or add to PATH manually
$env:Path += ";C:\Program Files\nodejs"
```

**Error: npm WARN deprecated**
```powershell
# These are usually safe to ignore, or update npm
npm install -g npm@latest
```

### 9.2 MySQL Connection Issues

**Error: Access denied for user 'root'@'localhost'**
- Verify password in `.env` file
- Try resetting MySQL root password

**Error: Can't connect to MySQL server**
```powershell
# Check if MySQL service is running
Get-Service -Name "MySQL*"

# Start if not running
Start-Service -Name "MySQL80"
```

**Error: Unknown database 'tms_database'**
```cmd
# Create the database
mysql -u root -p -e "CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 9.3 Build Issues

**Build stuck or very slow**

1. Disable Windows Defender temporarily:
   - Open Windows Security > Virus & threat protection
   - Turn off Real-time protection

2. Clear electron-builder cache:
   ```powershell
   Remove-Item -Recurse -Force $env:LOCALAPPDATA\electron-builder\Cache
   ```

3. Use fast build:
   ```powershell
   npm run package:win:fast
   ```

**Symbolic link errors**

Run PowerShell as Administrator, or enable Developer Mode:
- Settings > Update & Security > For developers > Developer Mode

**NSIS icon error**

Ensure `icon.ico` exists in `electron\resources\`:
```powershell
dir electron\resources\icon.ico
```

### 9.4 Port Already in Use

The Electron app automatically handles port conflicts by trying fallback ports:
- Backend: 47847 → 47849 → 47851
- Frontend: 47848 → 47850 → 47852

If all ports are in use, you can manually free them:

**Find and kill process using a port:**
```powershell
# Find process using port 47847
netstat -ano | findstr :47847

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### 9.5 Permission Errors

**Run PowerShell as Administrator:**
1. Right-click PowerShell icon
2. Select "Run as administrator"

**Or set execution policy:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Quick Start Checklist

Use this checklist to verify your setup:

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

## Need Help?

- Check [README.md](../README.md) for general documentation
- See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for Gmail integration
- Open an issue: https://github.com/ParthG1810/TMS_DEV_NODEJS/issues
