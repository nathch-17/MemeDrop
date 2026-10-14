import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  applyLinuxAutostart,
  buildLinuxAutostartEntry,
  getLinuxAutostartPath,
} from './linuxAutostart.ts'

test('construit une entrée autostart minimale', () => {
  assert.equal(
    buildLinuxAutostartEntry({
      name: 'MemeDrop',
      executablePath: '/opt/MemeDrop/memedrop',
      args: ['--memedrop-start-minimized'],
    }),
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=MemeDrop',
      'Exec=/opt/MemeDrop/memedrop --memedrop-start-minimized',
      'Terminal=false',
      'X-GNOME-Autostart-enabled=true',
      '',
    ].join('\n'),
  )
})

test('échappe les chemins avec espaces et caractères spéciaux dans Exec', () => {
  const entry = buildLinuxAutostartEntry({
    name: 'MemeDrop',
    executablePath: '/home/me/My Apps/Meme$Drop 100%.AppImage',
    args: [],
  })

  assert.match(entry, /^Exec="\/home\/me\/My Apps\/Meme\\\\\$Drop 100%%\.AppImage"$/m)
})

test('écrit puis supprime le fichier autostart', () => {
  const configHome = mkdtempSync(path.join(tmpdir(), 'memedrop-autostart-'))
  try {
    const options = {
      name: 'MemeDrop',
      executablePath: '/usr/bin/memedrop',
      args: [],
      configHome,
    }

    applyLinuxAutostart({ ...options, enabled: true })
    const autostartPath = getLinuxAutostartPath(configHome)
    assert.match(readFileSync(autostartPath, 'utf8'), /^Exec=\/usr\/bin\/memedrop$/m)

    applyLinuxAutostart({ ...options, enabled: false })
    assert.equal(existsSync(autostartPath), false)
    assert.doesNotThrow(() => applyLinuxAutostart({ ...options, enabled: false }))
  } finally {
    rmSync(configHome, { recursive: true, force: true })
  }
})
