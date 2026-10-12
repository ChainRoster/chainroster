import { useState, useEffect, useMemo } from 'react'

// Main owns the update state (src/main/update-service.js); this mirrors it.
// status is { pref, state, current }.
export default function useUpdates() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let live = true
    window.api.updateStatus().then(s => { if (live) setStatus(s) })
    const off = window.api.onUpdateState(setStatus)
    return () => { live = false; off() }
  }, [])

  const actions = useMemo(() => {
    const act = fn => (...args) => window.api[fn](...args).then(s => {
      if (s && typeof s === 'object') setStatus(s)
    })
    return {
      setPref: act('updateSetPref'),
      check: act('updateCheck'),
      download: act('updateDownload'),
      install: act('updateInstall'),
      openRelease: () => window.api.updateOpenRelease()
    }
  }, [])

  return { status, ...actions }
}
