export interface IpDevice {
  id: string
  name: string
  type: string
  ip: string
  status?: string
}

export interface IpSegmentInput {
  id: string
  network_ip: string | null
  subnet_mask: string | null
  gateway_ip?: string | null
  dhcp_start_ip?: string | null
  dhcp_end_ip?: string | null
}

export const stripCidr = (value: string) => value.trim().split('/')[0]?.trim() || ''

export function ipv4ToNumber(value: string): number | null {
  const parts = stripCidr(value).split('.')
  if (parts.length !== 4) return null
  const octets = parts.map(Number)
  if (octets.some((part, index) => !Number.isInteger(part) || part < 0 || part > 255 || String(part) !== String(Number(parts[index])))) return null
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0
}

export function numberToIpv4(value: number): string {
  const normalized = value >>> 0
  return [normalized >>> 24, (normalized >>> 16) & 255, (normalized >>> 8) & 255, normalized & 255].join('.')
}

export function maskToPrefix(mask: string): number | null {
  const value = ipv4ToNumber(mask)
  if (value == null) return null
  const binary = value.toString(2).padStart(32, '0')
  if (!/^1*0*$/.test(binary)) return null
  return binary.indexOf('0') === -1 ? 32 : binary.indexOf('0')
}

export function getSegmentBounds(segment: Pick<IpSegmentInput, 'network_ip' | 'subnet_mask'>) {
  const ip = segment.network_ip ? ipv4ToNumber(segment.network_ip) : null
  const prefix = segment.subnet_mask ? maskToPrefix(segment.subnet_mask) : null
  if (ip == null || prefix == null) return null
  const hostBits = 32 - prefix
  const blockSize = 2 ** hostBits
  const network = Math.floor(ip / blockSize) * blockSize
  const broadcast = network + blockSize - 1
  return { network, broadcast, firstHost: prefix >= 31 ? network : network + 1, lastHost: prefix >= 31 ? broadcast : broadcast - 1, prefix }
}

export function segmentContainsIp(segment: IpSegmentInput, ip: string): boolean {
  const bounds = getSegmentBounds(segment)
  const value = ipv4ToNumber(ip)
  return Boolean(bounds && value != null && value >= bounds.network && value <= bounds.broadcast)
}

export function findDuplicateIps(devices: IpDevice[]): Map<string, IpDevice[]> {
  const groups = new Map<string, IpDevice[]>()
  devices.forEach(device => {
    const normalized = stripCidr(device.ip)
    if (ipv4ToNumber(normalized) == null) return
    groups.set(normalized, [...(groups.get(normalized) || []), device])
  })
  return new Map([...groups].filter(([, items]) => items.length > 1))
}

export function findBestSegment(segments: IpSegmentInput[], ip: string): IpSegmentInput | null {
  return segments
    .filter(segment => segmentContainsIp(segment, ip))
    .sort((a, b) => (maskToPrefix(b.subnet_mask || '') || 0) - (maskToPrefix(a.subnet_mask || '') || 0))[0] || null
}

export function suggestNextIp(segment: IpSegmentInput, usedIps: string[]): string | null {
  const bounds = getSegmentBounds(segment)
  if (!bounds || bounds.prefix >= 31) return null
  const used = new Set(usedIps.map(ipv4ToNumber).filter((value): value is number => value != null))
  const gateway = segment.gateway_ip ? ipv4ToNumber(segment.gateway_ip) : null
  const dhcpStart = segment.dhcp_start_ip ? ipv4ToNumber(segment.dhcp_start_ip) : null
  const dhcpEnd = segment.dhcp_end_ip ? ipv4ToNumber(segment.dhcp_end_ip) : null
  for (let candidate = bounds.firstHost; candidate <= bounds.lastHost; candidate += 1) {
    const inDhcp = dhcpStart != null && dhcpEnd != null && candidate >= Math.min(dhcpStart, dhcpEnd) && candidate <= Math.max(dhcpStart, dhcpEnd)
    if (!used.has(candidate) && candidate !== gateway && !inDhcp) return numberToIpv4(candidate)
  }
  return null
}

export function validateSegment(input: Omit<IpSegmentInput, 'id'>): string[] {
  const errors: string[] = []
  const bounds = getSegmentBounds(input)
  if (!bounds) errors.push('Informe uma rede IPv4 e máscara válidas.')
  const validateInside = (value: string | null | undefined, label: string) => {
    if (value && (!bounds || !segmentContainsIp({ id: '', ...input }, value))) errors.push(`${label} precisa pertencer à sub-rede.`)
  }
  validateInside(input.gateway_ip, 'Gateway')
  validateInside(input.dhcp_start_ip, 'Início do DHCP')
  validateInside(input.dhcp_end_ip, 'Fim do DHCP')
  const start = input.dhcp_start_ip ? ipv4ToNumber(input.dhcp_start_ip) : null
  const end = input.dhcp_end_ip ? ipv4ToNumber(input.dhcp_end_ip) : null
  if ((start == null) !== (end == null)) errors.push('Informe o início e o fim da faixa DHCP.')
  if (start != null && end != null && start > end) errors.push('O início do DHCP não pode ser maior que o fim.')
  return errors
}
