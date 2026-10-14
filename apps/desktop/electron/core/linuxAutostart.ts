import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const LINUX_AUTOSTART_FILE_NAME = 'memedrop.desktop'

type LinuxAutostartEntryOptions = {
  name: string
  executablePath: string
  args: string[]
  iconPath?: string
}

type LinuxAutostartOptions = LinuxAutostartEntryOptions & {
  enabled: boolean
  configHome?: string
}

// Les arguments de la clé Exec doivent être entre guillemets dès qu'ils contiennent
// un caractère réservé ; `\`, `"`, `` ` `` et `$` y sont échappés (spécification XDG),
// puis `\` est doublé car la valeur est elle-même une chaîne du fichier .desktop.
// Un `%` littéral doit être écrit `%%` pour ne pas être lu comme un code de champ.
const quoteExecArgument = (value: string) => {
  const withLiteralPercent = value.replace(/%/g, '%%')
  if (/^[A-Za-z0-9_./:=+@^,%-]+$/.test(withLiteralPercent)) {
    return withLiteralPercent
  }

  const escaped = withLiteralPercent.replace(/[\\"`$]/g, (character) => `\\${character}`)
  return `"${escaped.replace(/\\/g, '\\\\')}"`
}

const sanitizeDesktopValue = (value: string) => value.replace(/[\r\n]+/g, ' ')

export const buildLinuxAutostartEntry = ({
  name,
  executablePath,
  args,
  iconPath,
}: LinuxAutostartEntryOptions) =>
  [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${sanitizeDesktopValue(name)}`,
    `Exec=${[executablePath, ...args].map(quoteExecArgument).join(' ')}`,
    ...(iconPath ? [`Icon=${sanitizeDesktopValue(iconPath)}`] : []),
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n')

export const getLinuxAutostartPath = (configHome?: string) =>
  path.join(
    configHome || process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config'),
    'autostart',
    LINUX_AUTOSTART_FILE_NAME,
  )

// `app.setLoginItemSettings` n'a aucun effet sous Linux : le démarrage avec la session
// passe par un fichier XDG autostart, compris par GNOME, KDE, Xfce, etc.
export const applyLinuxAutostart = ({ enabled, configHome, ...entry }: LinuxAutostartOptions) => {
  const autostartPath = getLinuxAutostartPath(configHome)

  if (!enabled) {
    rmSync(autostartPath, { force: true })
    return
  }

  mkdirSync(path.dirname(autostartPath), { recursive: true })
  writeFileSync(autostartPath, buildLinuxAutostartEntry(entry), { mode: 0o644 })
}
