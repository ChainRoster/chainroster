// Build and sign the Windows installer and portable exe on the maintainer's machine.
//
//   1. Log in to SimplySign Desktop (the code comes from the SimplySign phone
//      app). The certificate then appears in the Windows certificate store for
//      about two hours.
//   2. $env:CHAINROSTER_WIN_CERT_SHA1 = '<the certificate thumbprint>'
//   3. npm run dist:win:signed
//
// Signing happens INSIDE electron-builder, so latest.yml's sha512 describes the
// signed installer. Signing a finished build afterwards would change its hash
// and, once auto-update exists, every installed copy would reject the update.
//
// This refuses to run unless the signer can be checked, and verifies the
// result before you upload anything. See docs/releasing.md.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1) }

if (process.platform !== 'win32') fail('Run this on Windows, logged in to SimplySign Desktop.')

// Quotes and spaces are dropped: cmd.exe keeps `set X='…'`'s quotes in the value.
const thumb = (process.env.CHAINROSTER_WIN_CERT_SHA1 ?? '').replace(/[\s'"]/g, '').toUpperCase()
if (!/^[0-9A-F]{40}$/.test(thumb)) {
  fail('Set CHAINROSTER_WIN_CERT_SHA1 to the certificate thumbprint (40 hex characters).\n' +
       "  PowerShell: Get-ChildItem Cert:\\CurrentUser\\My | Format-List Subject, Thumbprint")
}

// Without a real publisherName, electron-updater 6.x silently skips checking
// who signed an update. Never ship that.
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const publisher = pkg.build?.win?.signtoolOptions?.publisherName
if (!publisher) {
  fail('Set build.win.signtoolOptions.publisherName in package.json to the certificate subject CN.')
}

// The renderer bundles evm-ui from the sibling checkout (file:../evm-ui).
if (!existsSync('../evm-ui/dist')) {
  fail('../evm-ui/dist is missing. Clone evm-ui next to this repo and build it:\n' +
       '  git clone https://github.com/gearcat0/evm-ui.git ..\\evm-ui\n' +
       '  cd ..\\evm-ui; npm ci; npm run build; cd ..\\chainroster')
}

const run = (command) => {
  const r = spawnSync(command, { stdio: 'inherit', shell: true })
  if (r.status !== 0) fail(`${command} failed`)
}

// electron-builder never clears release/, so an older version's installer
// would sit next to this version's latest.yml and could be uploaded by mistake.
if (existsSync('release')) {
  for (const f of readdirSync('release')) {
    if (/\.(exe|blockmap)$/.test(f) || f === 'latest.yml') rmSync(`release/${f}`)
  }
}

run('npx electron-vite build')
run(`npx electron-builder --win --publish never -c.win.signtoolOptions.certificateSha1=${thumb}`)

const installer = `ChainRoster-${pkg.version}-win-x64.exe`
const portable = `ChainRoster-${pkg.version}-portable-x64.exe`
for (const exe of [installer, portable]) {
  if (!existsSync(`release/${exe}`)) fail(`release/${exe} was not built.`)
  const ps = spawnSync('powershell', ['-NoProfile', '-Command',
    `$s = Get-AuthenticodeSignature 'release\\${exe}'; ` +
    `"$($s.Status)|$($s.SignerCertificate.Subject)|$([bool]$s.TimeStamperCertificate)"`],
    { encoding: 'utf8' })
  const [status, subject, stamped] = ps.stdout.trim().split('|')
  if (status !== 'Valid') fail(`${exe}: signature status is ${status || 'unknown'}, not Valid.`)
  if (!subject.includes(`CN=${publisher}`)) fail(`${exe}: signed by "${subject}", but publisherName is "${publisher}".`)
  if (stamped !== 'True') fail(`${exe}: the signature has no timestamp; it would stop verifying when the cert expires.`)
  console.log(`✓ ${exe} is signed by ${subject}, timestamped.`)
}

console.log('\nAttach them to the draft release:')
console.log(`  gh release upload v${pkg.version} --repo ChainRoster/chainroster "release/${installer}" "release/${installer}.blockmap" "release/${portable}" release/latest.yml\n`)
