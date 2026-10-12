import React from 'react'
import { Button } from 'evm-ui'
import useUpdates from '../../hooks/useUpdates'

const OPTIONS = [
  { id: 'on', title: 'Check daily', detail: 'Asks GitHub once a day whether a new release is out, and tells you if there is one.' },
  { id: 'off', title: 'Only when I ask', detail: 'Nothing is checked unless you choose Check for Updates… from the Help menu or click Check now.' }
]

function stateNote(state) {
  switch (state.phase) {
    case 'checking': return 'Checking…'
    case 'current': return 'Up to date.'
    case 'available': return `${state.version} is available.`
    case 'downloading': return `Downloading ${state.version}…`
    case 'ready': return `${state.version} is downloaded and ready to install.`
    case 'inactive': return "Development runs don't check for updates."
    case 'error': return `Last check failed: ${state.message}`
    default: return ''
  }
}

export default function UpdatesSection() {
  const { status, setPref, check } = useUpdates()
  if (!status) return null
  const { pref, state, current } = status
  const busy = state.phase === 'checking' || state.phase === 'downloading'

  return (
    <div className="settings-section">
      <h3>Updates</h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        You have ChainRoster {current}. Updates come from GitHub Releases and are only downloaded
        or installed when you say so.
      </p>
      {OPTIONS.map(o => (
        <label key={o.id} className={`update-option${pref === o.id ? ' selected' : ''}`}>
          <input type="radio" name="updatePref" checked={pref === o.id} onChange={() => setPref(o.id)} />
          <div>
            <div className="update-option-title">{o.title}</div>
            <div className="update-option-detail">{o.detail}</div>
          </div>
        </label>
      ))}
      <div className="settings-row" style={{ marginTop: 12 }}>
        <Button variant="secondary" disabled={busy} onClick={() => check()}>Check now</Button>
        <span style={{ fontSize: 13, color: state.phase === 'error' ? 'var(--error)' : 'var(--text-secondary)' }}>
          {stateNote(state)}
        </span>
      </div>
    </div>
  )
}
