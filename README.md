# Init Window

A Windows desktop application for automating workspace setup with one click. Capture running applications, save them as collections, and launch your entire workspace instantly.

## Features

- **Process Capture**: Scan and identify currently running Windows applications
- **Collections**: Save groups of applications as named collections
- **One-Click Launch**: Open all applications in a collection simultaneously
- **Auto-Start**: Optional Windows startup integration
- **System Tray**: Minimize to tray for quick access

## Prerequisites

- **Node.js** 18.x or higher
- **npm** (comes with Node.js)
- **Windows 10/11** (uses Windows-specific APIs)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd init-window
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run in Development Mode

```bash
npm run dev
```

This starts the Vite development server and Electron simultaneously with hot module replacement.

## Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode with HMR |
| `npm run dev:renderer` | Start Vite dev server only (port 5173) |
| `npm run dev:main` | Start Electron only |
| `npm run build` | Build both renderer and main processes |
| `npm run build:renderer` | Build React app with Vite |
| `npm run build:main` | Compile TypeScript for main process |
| `npm run dist` | Build and create Windows installer |

## Building for Production

### Create Windows Installer

```bash
npm run dist
```

This creates:
- `release/Init Window Setup.exe` - NSIS installer for distribution
- `release/win-unpacked/` - Portable version for testing

### Output Structure

```
release/
├── win-unpacked/          # Unpackaged app (portable)
│   └── Init Window.exe    # Main executable
└── Init Window Setup.exe  # Installer for distribution
```

## Distributing to Other Users

### Sharing Options

1. **Direct File Sharing**
   - Share `release/Init Window Setup.exe` via:
     - Google Drive, Dropbox, OneDrive
     - Email (if file size permits)
     - USB drive
     - Discord/Slack file sharing

2. **GitHub Releases** (Recommended)
   - Go to your GitHub repository → Releases → "Create a new release"
   - Tag version (e.g., `v1.0.0`)
   - Upload `Init Window Setup.exe` as a release asset
   - Users can download directly from the releases page

3. **Portable Version**
   - Share the `release/win-unpacked/` folder
   - Users can run `Init Window.exe` directly without installing
   - Note: No auto-updates or Start Menu shortcuts with this method

### End User Installation Steps

1. **Download** `Init Window Setup.exe`

2. **Run the installer**
   - Double-click the downloaded file
   - If Windows shows "Windows protected your PC" (SmartScreen warning):
     - Click "More info"
     - Click "Run anyway"
     - This appears because the app is not code-signed

3. **Follow installation wizard**
   - Choose install location (default: `C:\Program Files\Init Window`)
   - Optional: Create desktop shortcut

4. **Launch the app**
   - From Start Menu: "Init Window"
   - Or from desktop shortcut

### System Requirements for Users

- **OS**: Windows 10 or Windows 11 (64-bit)
- **RAM**: 4 GB minimum
- **Storage**: 200 MB free space
- **No additional dependencies required** - everything is bundled in the installer

### Uninstalling

- Go to **Settings** → **Apps** → **Installed apps**
- Find "Init Window" and click **Uninstall**
- Or use **Add or Remove Programs** in Control Panel

## Project Structure

```
init-window/
├── src/
│   ├── main/               # Electron main process (Node.js)
│   │   ├── index.ts        # App entry point
│   │   ├── ipc/            # IPC communication handlers
│   │   ├── services/       # Business logic
│   │   │   ├── CollectionService.ts
│   │   │   ├── ProcessService.windows.ts
│   │   │   ├── AutoStartService.windows.ts
│   │   │   └── StorageService.ts
│   │   └── tray/           # System tray integration
│   ├── preload/            # Security bridge (preload script)
│   ├── renderer/           # React UI
│   │   ├── components/     # React components
│   │   ├── context/        # React context
│   │   ├── hooks/          # Custom hooks
│   │   └── types/          # Type definitions
│   └── shared/             # Shared types
├── dist/                   # Compiled output (git-ignored)
├── release/                # Packaged app output (git-ignored)
├── assets/                 # Static assets
├── package.json            # Dependencies and build config
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript base config
├── tsconfig.main.json      # Main process TS config
└── tailwind.config.js      # Tailwind CSS config
```

## Architecture

- **Main Process**: Node.js backend with platform-specific Windows services
- **Renderer Process**: React 18 UI with Tailwind CSS
- **IPC Communication**: Secure context bridge between main and renderer
- **Security**: Context isolation enabled, no Node integration in renderer

## Technologies

- **Electron** 28.x - Desktop application framework
- **React** 18.x - UI library
- **TypeScript** 5.9.x - Type-safe JavaScript
- **Vite** 5.x - Build tool and dev server
- **Tailwind CSS** 3.4.x - Utility-first CSS
- **electron-builder** - Packaging and installer creation
- **electron-store** - Local data persistence

## Troubleshooting

### Dev server not starting
- Check if port 5173 is available
- Run `npm run dev:renderer` separately to see Vite errors

### Build failures
- Ensure all dependencies are installed: `npm install`
- Check TypeScript errors: `npx tsc --noEmit`

### App not launching after build
- Verify `dist/` folder exists after `npm run build`
- Check `dist/main/index.js` is present

## License

[Your License Here]
