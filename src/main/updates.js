import { app, ipcMain, shell, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { IPC, RELEASES_URL } from './constants'
import { loadSettings, saveSettings } from './data-store'
import { UpdateService, normalizePref } from './update-service'

// Nothing is checked until the user agrees (see update-service.js). The answer
// is settings.updateCheck: "ask" (not answered yet), "on" or "off".

function sendToRenderer(channel, data) {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(channel, data)
}

async function createUpdater() {
  // Test hook, unpackaged runs only: a local feed in place of GitHub Releases.
  // electron-updater compares against app.getVersion(), which is Electron's
  // own version when unpackaged, so set it from package.json.
  const feed = !app.isPackaged && process.env.CHAINROSTER_UPDATE_FEED
  if (feed) app.setVersion(JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf-8')).version)
  // Loaded on first use, so the updater is not even required before someone
  // asks for a check.
  const mod = await import('electron-updater')
  const autoUpdater = mod.autoUpdater ?? mod.default.autoUpdater
  if (feed) {
    // A download reads its cache directory name from the update config, which
    // only packaged builds have; give the test run one of its own.
    const devConfig = path.join(app.getPath('userData'), 'dev-app-update.yml')
    fs.mkdirSync(path.dirname(devConfig), { recursive: true })
    fs.writeFileSync(devConfig, `provider: generic\nurl: ${JSON.stringify(feed)}\nupdaterCacheDirName: chainroster-updater-dev\n`)
    autoUpdater.updateConfigPath = devConfig
    autoUpdater.forceDevUpdateConfig = true
    autoUpdater.setFeedURL({ provider: 'generic', url: feed })
  }
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  // Set explicitly: electron-updater turns prereleases on by itself when the
  // running version has a prerelease tag.
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false
  return autoUpdater
}

const updates = new UpdateService({
  createUpdater,
  getPref: () => normalizePref(loadSettings().updateCheck),
  setPref: (p) => saveSettings({ ...loadSettings(), updateCheck: p }),
  // A .deb could only be installed unauthenticated via pkexec/sudo; those
  // users get the release page instead. An AppImage replaces itself.
  canInstall: process.platform !== 'linux' || Boolean(process.env.APPIMAGE),
  onState: () => sendToRenderer(IPC.UPDATE_STATE, updateStatus())
})

function updateStatus() {
  return { ...updates.status(), current: app.getVersion() }
}

// Help → Check for Updates…: the renderer shows the result and runs the check.
export function showUpdates() {
  sendToRenderer(IPC.UPDATE_SHOW)
}

export function startUpdates() {
  ipcMain.handle(IPC.UPDATE_STATUS, () => updateStatus())
  ipcMain.handle(IPC.UPDATE_SET_PREF, (_event, pref) => { updates.setPref(pref); return updateStatus() })
  ipcMain.handle(IPC.UPDATE_CHECK, async () => { await updates.check({ manual: true }); return updateStatus() })
  ipcMain.handle(IPC.UPDATE_DOWNLOAD, async () => { await updates.download(); return updateStatus() })
  ipcMain.handle(IPC.UPDATE_INSTALL, () => updates.install())
  // The URL is built here from the version the updater found, never taken
  // from the renderer.
  ipcMain.handle(IPC.UPDATE_OPEN_RELEASE, () => {
    const s = updates.status().state
    const url = s.phase === 'available' && /^\d+\.\d+\.\d+$/.test(s.version)
      ? `${RELEASES_URL}/tag/v${s.version}` : `${RELEASES_URL}/latest`
    return shell.openExternal(url)
  })
  updates.start()
}
