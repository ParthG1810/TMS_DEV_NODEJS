# TMS Desktop Application

A desktop application for the Tiffin Management System built with Electron, wrapping Next.js Backend and Frontend applications.

## Platform-Specific Setup Guides

For complete step-by-step setup instructions from scratch, see the platform-specific guides:

| Platform | Guide |
|----------|-------|
| Windows | [docs/WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md) |
| macOS | [docs/MACOS_SETUP.md](docs/MACOS_SETUP.md) |
| Linux | [docs/LINUX_SETUP.md](docs/LINUX_SETUP.md) |

These guides cover everything from installing prerequisites to running the application.

---

## Prerequisites

Before running or building the application, ensure you have the following installed:

| Requirement | Version | Download |
|-------------|---------|----------|
| Node.js | 18.x or higher | https://nodejs.org |
| npm | 9.x or higher | Comes with Node.js |
| Git | Latest | https://git-scm.com |

## Project Structure

```
TMS_DEV_NODEJS/
├── Backend/          # Next.js Backend API server (port 47847)
├── Frontend/         # Next.js Frontend application (port 47848)
└── electron/         # Electron desktop wrapper
    ├── src/          # Electron main process source
    ├── dist/         # Compiled Electron TypeScript
    ├── dist-packages/# Built installers and executables
    └── resources/    # App icons and assets
```

---

## Installation

### Step 1: Clone the Repository

**Windows (PowerShell/CMD) | macOS | Linux:**
```bash
git clone https://github.com/ParthG1810/TMS_DEV_NODEJS.git
cd TMS_DEV_NODEJS
```

### Step 2: Install Dependencies

You need to install dependencies for all three packages (Backend, Frontend, and Electron).

**Windows (PowerShell):**
```powershell
cd Backend; npm install; cd ..\Frontend; npm install; cd ..\electron; npm install; cd ..
```

**Windows (CMD):**
```cmd
cd Backend && npm install && cd ..\Frontend && npm install && cd ..\electron && npm install && cd ..
```

**macOS | Linux (Bash/Zsh):**
```bash
cd Backend && npm install && cd ../Frontend && npm install && cd ../electron && npm install && cd ..
```

---

## Development Mode

Run the application in development mode with hot-reload.

### Option 1: Run All Together (Recommended)

Navigate to the electron folder and run:

**Windows (PowerShell/CMD) | macOS | Linux:**
```bash
cd electron
npm run dev
```

This starts:
- Backend on `http://localhost:47847`
- Frontend on `http://localhost:47848`
- Electron window connecting to both

> **Port Fallback:** If the primary ports are in use, the app automatically tries fallback ports:
> - Backend: 47847 → 47849 → 47851
> - Frontend: 47848 → 47850 → 47852

### Option 2: Run Separately

Open three terminal windows:

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

**Terminal 3 - Electron (after Backend & Frontend are running):**
```bash
cd electron
npm run build
npm run dev:electron
```

---

## Building for Production

### Build All Components

This compiles Backend, Frontend, and Electron TypeScript:

**Windows (PowerShell/CMD) | macOS | Linux:**
```bash
cd electron
npm run build:all
```

### Build Individual Components

| Command | Description |
|---------|-------------|
| `npm run build:backend` | Build Backend only |
| `npm run build:frontend` | Build Frontend only |
| `npm run build` | Build Electron TypeScript only |

---

## Packaging / Creating Installers

Navigate to the electron folder first:

```bash
cd electron
```

### Windows Builds

| Command | Description | Output |
|---------|-------------|--------|
| `npm run package:win` | NSIS installer (default) | `TMS-Desktop-1.0.0-Windows-Setup.exe` |
| `npm run package:win:nsis` | NSIS installer | `TMS-Desktop-1.0.0-Windows-Setup.exe` |
| `npm run package:win:portable` | Portable executable | `TMS-Desktop-1.0.0-Windows-Portable.exe` |
| `npm run package:win:fast` | Portable (no compression) | Fastest build option |
| `npm run package:win:both` | NSIS + Portable | Both installers |

**Windows (PowerShell):**
```powershell
npm run package:win
```

**Windows (CMD):**
```cmd
npm run package:win
```

### macOS Builds

> Note: macOS builds must be run on a Mac.

**macOS (Terminal):**
```bash
npm run package:mac
```

**Output:** `TMS-Desktop-1.0.0-macOS-x64.dmg` and `TMS-Desktop-1.0.0-macOS-arm64.dmg`

### Linux Builds

**Linux (Terminal):**
```bash
npm run package:linux
```

**Output:**
- `TMS-Desktop-1.0.0-Linux.AppImage`
- `TMS-Desktop-1.0.0-Linux.deb`

### Build for All Platforms

> Note: Cross-platform builds have limitations. Windows builds require Windows or Wine. macOS builds require macOS.

```bash
npm run package:all
```

---

## Build Outputs

All build outputs are located in `electron/dist-packages/`:

| Platform | File | Description |
|----------|------|-------------|
| Windows | `TMS-Desktop-1.0.0-Windows-Setup.exe` | NSIS Installer |
| Windows | `TMS-Desktop-1.0.0-Windows-Portable.exe` | Portable (no install) |
| Windows | `win-unpacked/` | Unpacked application folder |
| macOS | `TMS-Desktop-1.0.0-macOS-x64.dmg` | Intel Mac installer |
| macOS | `TMS-Desktop-1.0.0-macOS-arm64.dmg` | Apple Silicon installer |
| Linux | `TMS-Desktop-1.0.0-Linux.AppImage` | Universal Linux package |
| Linux | `TMS-Desktop-1.0.0-Linux.deb` | Debian/Ubuntu package |

---

## Running Built Application

### Windows

**Run Installer:**
```powershell
.\dist-packages\TMS-Desktop-1.0.0-Windows-Setup.exe
```

**Run Portable (no installation):**
```powershell
.\dist-packages\TMS-Desktop-1.0.0-Windows-Portable.exe
```

**Run Unpacked:**
```powershell
.\dist-packages\win-unpacked\"TMS Desktop.exe"
```

### macOS

```bash
# Mount DMG and drag to Applications
open dist-packages/TMS-Desktop-1.0.0-macOS-*.dmg
```

### Linux

**AppImage:**
```bash
chmod +x dist-packages/TMS-Desktop-1.0.0-Linux.AppImage
./dist-packages/TMS-Desktop-1.0.0-Linux.AppImage
```

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i dist-packages/TMS-Desktop-1.0.0-Linux.deb
```

---

## Troubleshooting

### Windows: Build Stuck or Slow

1. **Disable Windows Defender temporarily:**
   - Open Windows Security > Virus & threat protection
   - Turn off Real-time protection during build

2. **Clear electron-builder cache:**
   ```powershell
   Remove-Item -Recurse -Force $env:LOCALAPPDATA\electron-builder\Cache
   ```

3. **Use fast build option:**
   ```powershell
   npm run package:win:fast
   ```

### Windows: Symbolic Link Errors

Run PowerShell/CMD as Administrator, or enable Developer Mode:
- Settings > Update & Security > For developers > Developer Mode

### macOS: Code Signing Errors

For development builds, signing is skipped. For distribution:
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run package:mac
```

### Linux: AppImage Won't Run

```bash
chmod +x TMS-Desktop-1.0.0-Linux.AppImage
```

### All Platforms: Module Not Found Errors

Reinstall dependencies:
```bash
cd Backend && rm -rf node_modules && npm install
cd ../Frontend && rm -rf node_modules && npm install
cd ../electron && rm -rf node_modules && npm install
```

---

## Available Scripts Reference

### Electron Package Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run all in development mode |
| `npm run build` | Compile Electron TypeScript |
| `npm run build:all` | Build Backend + Frontend + Electron |
| `npm run package:win` | Package for Windows (NSIS) |
| `npm run package:win:portable` | Package Windows portable |
| `npm run package:win:fast` | Fast Windows portable build |
| `npm run package:win:both` | Both NSIS and portable |
| `npm run package:mac` | Package for macOS |
| `npm run package:linux` | Package for Linux |
| `npm run package:all` | Package for all platforms |
| `npm run publish` | Build and publish release |

---

## Environment Configuration

The application requires a `.env` file in the Backend folder for database and API configurations.

### Step 1: Create the .env File

**Windows (PowerShell):**
```powershell
Copy-Item Backend\.env.example Backend\.env
```

**Windows (CMD):**
```cmd
copy Backend\.env.example Backend\.env
```

**macOS | Linux:**
```bash
cp Backend/.env.example Backend/.env
```

### Step 2: Configure Environment Variables

Open `Backend/.env` in a text editor and configure the following:

#### Required Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL server hostname | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `DB_NAME` | Database name | `tms_database` |
| `DB_PORT` | MySQL port | `3306` |

#### Optional Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend server port | `47847` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT token expiry | `3d` |

#### Gmail Integration (Optional)

For email functionality, configure Gmail OAuth:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URL |

> **Detailed Setup Guide:** See [docs/GOOGLE_OAUTH_SETUP.md](docs/GOOGLE_OAUTH_SETUP.md) for step-by-step instructions with screenshots and explanations.

### Step 3: Setup MySQL Database

**Windows (PowerShell/CMD):**
```cmd
mysql -u root -p -e "CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**macOS | Linux:**
```bash
mysql -u root -p -e "CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Sample .env File

```env
# Environment
NODE_ENV=development

# Server Configuration
PORT=47847
DEV_API=http://localhost:47847
PRODUCTION_API=https://your-production-url.com

# Database Configuration (REQUIRED)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=tms_database
DB_PORT=3306

# JWT Configuration
JWT_SECRET=change-this-to-a-random-string-in-production
JWT_EXPIRES_IN=3d

# Gmail OAuth (Optional)
# Add all redirect URIs to Google Cloud Console for port fallback support:
# - http://localhost:47847/api/gmail/callback
# - http://localhost:47849/api/gmail/callback
# - http://localhost:47851/api/gmail/callback
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:47847/api/gmail/callback

# Next.js Public URL
NEXT_PUBLIC_API_URL=http://localhost:47847
```

---

## License

MIT License - See LICENSE file for details.

## Support

For issues and feature requests, please visit:
https://github.com/ParthG1810/TMS_DEV_NODEJS/issues
