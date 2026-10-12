import React, { useState, useEffect } from 'react'
import { Button, Spinner } from 'evm-ui'
import useUpdates from '../hooks/useUpdates'

function UpdateCard({ title, children, actions, onClose, error }) {
  return (
    <div className={`update-card${error ? ' update-card-error' : ''}`} role="status">
      {onClose && <button className="update-card-close" onClick={onClose} title="Close">×</button>}
      <div className="update-card-title">{title}</div>
      <div className="update-card-body">{children}</div>
      {actions && <div className="update-card-actions">{actions}</div>}
    </div>
  )
}

// One instance, mounted beside the tabs (App.jsx), so it shows on every
// screen. `open` is set by Help → Check for Updates…, which also shows the
// outcomes a background check keeps quiet (up to date, errors). Nothing is
// checked until the user answers the first-run question with yes, and nothing
// is downloaded or installed without a click.
export default function UpdateLayer() {
  const { status, setPref, check, download, install, openRelease } = useUpdates()
  const [open, setOpen] = useState(false)
  const [askDismissed, setAskDismissed] = useState(false)
  const [hiddenVersion, setHiddenVersion] = useState(null)
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => window.api.onShowUpdates(() => {
    setOpen(true)
    setHiddenVersion(null)
    check()
  }), [check])

  if (!status) return null
  const { pref, state, current } = status
  const close = () => {
    setOpen(false)
    if (state.version) setHiddenVersion(state.version)
  }

  if (state.phase === 'available' && hiddenVersion !== state.version) {
    return (
      <UpdateCard
        title={`ChainRoster ${state.version} is available`}
        onClose={close}
        actions={<>
          {state.canInstall
            ? <Button variant="primary" size="sm" onClick={() => download()}>Download</Button>
            : <Button variant="primary" size="sm" onClick={openRelease}>Open release page</Button>}
          <Button size="sm" onClick={close}>Later</Button>
        </>}
      >
        You have {current}.{' '}
        {state.canInstall
          ? "Download it now; you'll be asked again before it restarts to install."
          : "This install (.deb) can't update itself; get the new package from the release page."}
        {state.notes && (
          <div className="update-card-notes">
            <button className="update-card-link" onClick={() => setShowNotes(!showNotes)}>
              {showNotes ? '▾' : '▸'} Release notes
            </button>
            {showNotes && <pre>{state.notes}</pre>}
          </div>
        )}
      </UpdateCard>
    )
  }

  if (state.phase === 'downloading') {
    return (
      <UpdateCard title={`Downloading ChainRoster ${state.version}`}>
        <div className="update-progress"><div style={{ width: `${state.percent || 0}%` }} /></div>
        <div className="update-progress-label">{state.percent || 0}%</div>
      </UpdateCard>
    )
  }

  if (state.phase === 'ready' && hiddenVersion !== state.version) {
    return (
      <UpdateCard
        title={`ChainRoster ${state.version} is ready to install`}
        onClose={close}
        actions={<>
          <Button variant="primary" size="sm" onClick={() => install()}>Restart and install</Button>
          <Button size="sm" onClick={close}>Later</Button>
        </>}
      >
        ChainRoster will quit and reopen. Choose Check for Updates… from the Help menu to come back to this.
      </UpdateCard>
    )
  }

  if (open) {
    if (state.phase === 'checking' || state.phase === 'idle') {
      return (
        <UpdateCard title="Checking for updates…" onClose={close}>
          <span className="update-card-inline"><Spinner size={12} /> Asking GitHub for the latest release.</span>
        </UpdateCard>
      )
    }
    if (state.phase === 'current') {
      return (
        <UpdateCard title="ChainRoster is up to date" onClose={close}
          actions={<Button size="sm" onClick={close}>OK</Button>}>
          {current} is the latest release.
        </UpdateCard>
      )
    }
    if (state.phase === 'inactive') {
      return (
        <UpdateCard title="This build can't update itself" onClose={close}
          actions={<Button size="sm" onClick={close}>OK</Button>}>
          Development runs don't check for updates. Installed releases do.
        </UpdateCard>
      )
    }
    if (state.phase === 'error') {
      return (
        <UpdateCard error title="Couldn't check for updates" onClose={close}
          actions={<>
            <Button variant="primary" size="sm" onClick={() => check()}>Try again</Button>
            <Button size="sm" onClick={close}>Close</Button>
          </>}>
          <span className="update-card-mono">{state.message}</span>
        </UpdateCard>
      )
    }
  }

  if (pref === 'ask' && !askDismissed) {
    return (
      <UpdateCard
        title="Check for updates automatically?"
        onClose={() => setAskDismissed(true)}
        actions={<>
          <Button variant="primary" size="sm" onClick={() => setPref('on')}>Check daily</Button>
          <Button size="sm" onClick={() => setPref('off')}>Only when I ask</Button>
        </>}
      >
        ChainRoster can ask GitHub once a day whether a new release is out. That request is all it
        sends; nothing is downloaded or installed until you say so. You can change this in Settings.
      </UpdateCard>
    )
  }

  return null
}
