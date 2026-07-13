import { copyFile, mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const pad = (value) => String(value).padStart(2, '0')

const formatTimestamp = (date) => {
  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hour = pad(date.getUTCHours())
  const minute = pad(date.getUTCMinutes())
  const second = pad(date.getUTCSeconds())
  return `${year}${month}${day}-${hour}${minute}${second}`
}

export const assertValidMediaMtxConfig = (yaml) => {
  if (!yaml || !yaml.trim()) {
    throw new Error('YAML vazio.')
  }

  if (!yaml.trimStart().startsWith('paths:')) {
    throw new Error('O YAML precisa começar com "paths:".')
  }
}

export const buildBackupPath = (configPath, now = new Date()) =>
  `${configPath}.bak-${formatTimestamp(now)}`

export const writeMediaMtxConfigWithBackup = async ({ configPath, yaml, now = new Date() }) => {
  assertValidMediaMtxConfig(yaml)

  const backupPath = buildBackupPath(configPath, now)
  const tempPath = `${configPath}.tmp-${formatTimestamp(now)}`

  await mkdir(path.dirname(configPath), { recursive: true })
  await copyFile(configPath, backupPath)
  await writeFile(tempPath, yaml.endsWith('\n') ? yaml : `${yaml}\n`, 'utf8')
  await rename(tempPath, configPath)

  return { backupPath, configPath }
}
