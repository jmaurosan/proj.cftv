export const naturalCompare = (a: unknown, b: unknown) =>
  String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  })

export const compareNumbers = (a: unknown, b: unknown) => {
  const isBlank = (value: unknown) => value === null || value === undefined || value === ''
  const aBlank = isBlank(a)
  const bBlank = isBlank(b)

  if (aBlank && bBlank) return 0
  if (aBlank) return 1
  if (bBlank) return -1

  const aNumber = Number(a)
  const bNumber = Number(b)
  const aValid = Number.isFinite(aNumber)
  const bValid = Number.isFinite(bNumber)

  if (!aValid && !bValid) return 0
  if (!aValid) return 1
  if (!bValid) return -1
  return aNumber - bNumber
}

export const compareIpAddress = (a: unknown, b: unknown) => {
  const parse = (value: unknown) => {
    const ip = String(value ?? '').trim()
    if (!ip) return []

    return ip
      .split('.')
      .map((part) => Number(part))
  }

  const aParts = parse(a)
  const bParts = parse(b)

  for (let index = 0; index < Math.max(aParts.length, bParts.length); index++) {
    const result = compareNumbers(aParts[index], bParts[index])
    if (result !== 0) return result
  }

  return 0
}

export const byDirection = (result: number, direction: 'asc' | 'desc') =>
  direction === 'asc' ? result : -result
