const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Addresses
  listAddresses: (book) => ipcRenderer.invoke('addresses:list', book),
  addAddress: (data) => ipcRenderer.invoke('addresses:add', data),
  updateAddress: (data) => ipcRenderer.invoke('addresses:update', data),
  deleteAddress: (data) => ipcRenderer.invoke('addresses:delete', data),
  scanAddress: (data) => ipcRenderer.invoke('addresses:scan', data),
  exportAddresses: (book) => ipcRenderer.invoke('addresses:export', book),
  importAddresses: (data) => ipcRenderer.invoke('addresses:import', data),
  checkAddressActivity: (data) => ipcRenderer.invoke('addresses:checkActivity', data),

  // Address books
  listBooks: () => ipcRenderer.invoke('books:list'),
  createBook: (name) => ipcRenderer.invoke('books:create', name),
  deleteBook: (name) => ipcRenderer.invoke('books:delete', name),

  // Chains
  listChains: () => ipcRenderer.invoke('chains:list'),
  refreshChains: () => ipcRenderer.invoke('chains:refresh'),
  updateChainRpc: (data) => ipcRenderer.invoke('chains:updateRpc', data),
  fetchChainRpc: (chainId) => ipcRenderer.invoke('chains:fetchRpc', chainId),
  getChainIconPath: (chainId) => ipcRenderer.invoke('chains:iconPath', chainId),
  toggleChainEnabled: (chainId) => ipcRenderer.invoke('chains:toggleEnabled', chainId),
  setTestnetsEnabled: (enabled) => ipcRenderer.invoke('chains:setTestnetsEnabled', enabled),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data) => ipcRenderer.invoke('settings:update', data),

  // Anytype
  anytypeListSpaces: () => ipcRenderer.invoke('anytype:listSpaces'),
  anytypeSyncBook: (book) => ipcRenderer.invoke('anytype:syncBook', book),
  anytypeListCollections: (spaceId) => ipcRenderer.invoke('anytype:listCollections', spaceId),
  anytypeImportBook: (opts) => ipcRenderer.invoke('anytype:importBook', opts),
  onAnytypeSynced: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('anytype:synced', handler)
    return () => ipcRenderer.removeListener('anytype:synced', handler)
  },

  // Status
  getStatus: () => ipcRenderer.invoke('status:get'),
  getZoom: () => ipcRenderer.invoke('zoom:get'),
  setZoom: (factor) => ipcRenderer.invoke('zoom:set', factor),

  // Updates
  updateStatus: () => ipcRenderer.invoke('update:status'),
  updateSetPref: (pref) => ipcRenderer.invoke('update:setPref', pref),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateDownload: () => ipcRenderer.invoke('update:download'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  updateOpenRelease: () => ipcRenderer.invoke('update:openRelease'),
  onUpdateState: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('update:state', handler)
    return () => ipcRenderer.removeListener('update:state', handler)
  },
  onShowUpdates: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('update:show', handler)
    return () => ipcRenderer.removeListener('update:show', handler)
  },

  // Dialog
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),

  // Scan progress listeners
  onScanProgress: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('scan:progress', handler)
    return () => ipcRenderer.removeListener('scan:progress', handler)
  },
  onScanComplete: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('scan:complete', handler)
    return () => ipcRenderer.removeListener('scan:complete', handler)
  }
})
