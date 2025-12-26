# TMS Desktop Application

A desktop application for the Tiffin Management System built with Electron, wrapping Next.js Backend and Frontend applications.

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
├── Backend/          # Next.js Backend API server (port 8081)
├── Frontend/         # Next.js Frontend application (port 3000)
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
- Backend on `http://localhost:8081`
- Frontend on `http://localhost:3000`
- Electron window connecting to both

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

The application requires a `.env` file in the Backend folder. Create one based on your environment:

```bash
cp Backend/.env.example Backend/.env
```

Edit the `.env` file with your database and API configurations.

---

## License

MIT License - See LICENSE file for details.

## Support

For issues and feature requests, please visit:
https://github.com/ParthG1810/TMS_DEV_NODEJS/issues
