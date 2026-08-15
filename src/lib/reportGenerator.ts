import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  Dvr, Camera, Switch, PowerBalun, CableConnection, Router, Credential,
  UtpCable, PowerCable, InstallationSite,
} from './types'
import { CABLE_TYPE_LABELS, SITE_TYPES } from './constants'
import { channelKindLabel, classifyDvrChannel } from './dvrChannels'
import { describeBatteryBank, type EquipmentDocument, type Nobreak } from './projectAssets'
import { getEquipmentDocumentUrl } from '../services/projectAssetsService'
import { getInstallationPhotoUrl, getQRCodeImageUrl } from '../services/storageService'

interface ReportData {
  dvrs: Dvr[]
  cameras: Camera[]
  switches: Switch[]
  baluns: PowerBalun[]
  routers: Router[]
  credentials: Credential[]
  cables: (CableConnection & { camera_name: string })[]
  // Fase 1+2 — novo modelo estruturado
  utpCables?: UtpCable[]
  powerCables?: PowerCable[]
  sites?: InstallationSite[]
  userEmail: string
  clientName: string
  projectName: string
  nobreaks?: Nobreak[]
  equipmentDocuments?: EquipmentDocument[]
}

const siteTypeLabel = (type: string) =>
  SITE_TYPES.find((t) => t.value === type)?.label ?? type

const COLORS = {
  primary: [6, 182, 212] as [number, number, number],     // cyan-400
  dark: [15, 23, 42] as [number, number, number],          // slate-950
  text: [30, 41, 59] as [number, number, number],          // slate-800
  muted: [100, 116, 139] as [number, number, number],      // slate-500
  success: [34, 197, 94] as [number, number, number],      // green-500
  danger: [239, 68, 68] as [number, number, number],       // red-500
  warning: [245, 158, 11] as [number, number, number],     // amber-500
  white: [255, 255, 255] as [number, number, number],
  headerBg: [15, 23, 42] as [number, number, number],
  rowAlt: [241, 245, 249] as [number, number, number],     // slate-100
  border: [203, 213, 225] as [number, number, number],     // slate-300
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function countByStatus<T extends { status: string }>(items: T[]) {
  const ativos = items.filter(i => i.status === 'ativo' || i.status === 'online').length
  const inativos = items.filter(i => i.status === 'inativo' || i.status === 'offline').length
  const manutencao = items.filter(i => i.status === 'manutencao' || i.status === 'warning').length
  return { ativos, inativos, manutencao, total: items.length }
}

function addPageHeader(doc: jsPDF, title: string, subtitle: string) {
  // Dark header bar
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(0, 0, 210, 28, 'F')

  // Primary accent line
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 28, 210, 1.5, 'F')

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COLORS.white)
  doc.text('SISTEMA CFTV', 14, 12)

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.primary)
  doc.text(title, 14, 19)

  // Right side info
  doc.setTextColor(...COLORS.muted)
  doc.setFontSize(7)
  doc.text(subtitle, 196, 12, { align: 'right' })
  doc.text(formatDate(new Date()), 196, 17, { align: 'right' })
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const y = 287
  doc.setDrawColor(...COLORS.border)
  doc.line(14, y - 3, 196, y - 3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text('Gerado pelo Sistema CFTV', 14, y)
  doc.text(`Página ${pageNum} de ${totalPages}`, 196, y, { align: 'right' })
}

function addSectionTitle(doc: jsPDF, y: number, num: string, title: string): number {
  doc.setFillColor(...COLORS.primary)
  doc.rect(14, y, 3, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.text)
  doc.text(`${num}. ${title}`, 20, y + 6)
  return y + 14
}

function drawStatusBar(doc: jsPDF, x: number, y: number, w: number, stats: { ativos: number; inativos: number; manutencao: number; total: number }, label: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.text(label, x, y - 2)

  const h = 5
  const total = stats.total || 1

  // Background
  doc.setFillColor(226, 232, 240) // slate-200
  doc.roundedRect(x, y, w, h, 1, 1, 'F')

  // Active (green)
  const wActive = (stats.ativos / total) * w
  if (wActive > 0) {
    doc.setFillColor(...COLORS.success)
    doc.roundedRect(x, y, wActive, h, 1, 1, 'F')
  }

  // Maintenance (amber) - after active
  const wMaint = (stats.manutencao / total) * w
  if (wMaint > 0) {
    doc.setFillColor(...COLORS.warning)
    doc.rect(x + wActive, y, wMaint, h, 'F')
  }

  // Inactive (red) - after maintenance
  const wInactive = (stats.inativos / total) * w
  if (wInactive > 0) {
    doc.setFillColor(...COLORS.danger)
    const xStart = x + wActive + wMaint
    doc.rect(xStart, y, Math.min(wInactive, w - wActive - wMaint), h, 'F')
  }

  // Legend text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text(
    `${stats.ativos} ativo(s)  |  ${stats.manutencao} manut.  |  ${stats.inativos} inativo(s)  —  Total: ${stats.total}`,
    x, y + h + 4.5
  )
}

function drawSummaryBox(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string, color: [number, number, number]) {
  // Border
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, h, 2, 2, 'S')

  // Color accent top
  doc.setFillColor(...color)
  doc.rect(x, y, w, 1.5, 'F')

  // Value
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...color)
  doc.text(value, x + w / 2, y + 14, { align: 'center' })

  // Label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text(label, x + w / 2, y + 20, { align: 'center' })
}

async function drawPowerProtectionPage(doc: jsPDF, data: ReportData, headerSubtitle: string) {
  const nobreaks = data.nobreaks || []
  const documents = data.equipmentDocuments || []
  if (nobreaks.length === 0 && documents.length === 0) return

  doc.addPage()
  addPageHeader(doc, 'Proteção Elétrica & Documentação', headerSubtitle)
  let y = addSectionTitle(doc, 36, '6', 'Nobreaks, Baterias e Arquivos Técnicos')
  const protectedCount = nobreaks.filter((item) => item.hasProtection).length
  const batteryCount = nobreaks.reduce((sum, item) => sum + item.batteryQuantity, 0)
  drawSummaryBox(doc, 14, y, 42.5, 22, String(nobreaks.length), 'Nobreaks', [99, 102, 241])
  drawSummaryBox(doc, 60.5, y, 42.5, 22, String(protectedCount), 'Com proteção', COLORS.success)
  drawSummaryBox(doc, 107, y, 42.5, 22, String(batteryCount), 'Baterias', COLORS.warning)
  drawSummaryBox(doc, 153.5, y, 42.5, 22, String(documents.length), 'Documentos', COLORS.primary)
  y += 30

  if (nobreaks.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Nobreak', 'Potência', 'Entrada / Saída', 'Banco de baterias', 'Proteção', 'Escopo']],
      body: nobreaks.map((item) => [
        `${item.name}\n${item.brand} ${item.model}`,
        `${item.ratedPowerVa} VA / ${item.ratedPowerWatts} W`,
        `${item.inputVoltage} V / ${item.outputVoltage} V`,
        `${describeBatteryBank(item)}${item.batteryBrand ? `\n${item.batteryBrand} ${item.batteryModel}` : ''}`,
        item.hasProtection ? item.protections.join(', ') : 'Não possui',
        item.powersWholeProject ? 'Todo o sistema' : `${item.poweredEquipmentIds.length} equipamento(s)`,
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 6.5, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9
  }

  if (documents.length > 0) {
    if (y > 220) {
      doc.addPage()
      addPageHeader(doc, 'Índice de Documentação Técnica', headerSubtitle)
      y = 38
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('Documentos e links oficiais', 14, y)
    y += 3
    autoTable(doc, {
      startY: y,
      head: [['Título', 'Categoria', 'Equipamento', 'Arquivo', 'Link oficial']],
      body: documents.map((item) => [
        item.title,
        item.category,
        item.equipmentName,
        item.fileName || '-',
        item.manufacturerUrl ? 'Disponível' : '-',
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  const documentFileLinks = await Promise.all(
    documents
      .filter((item) => item.filePath)
      .map(async (item) => ({
        label: `Arquivo: ${item.title}`,
        url: await getEquipmentDocumentUrl(item.filePath as string),
      }))
  )
  const links = [
    ...nobreaks.filter((item) => item.manufacturerUrl).map((item) => ({ label: `Ficha oficial: ${item.name}`, url: item.manufacturerUrl })),
    ...documentFileLinks.filter((item): item is { label: string; url: string } => !!item.url),
    ...documents.filter((item) => item.manufacturerUrl).map((item) => ({ label: `Link oficial: ${item.title}`, url: item.manufacturerUrl })),
  ] as { label: string; url: string }[]
  for (const link of links) {
    if (y > 278) {
      doc.addPage()
      addPageHeader(doc, 'Links da Documentação Técnica', headerSubtitle)
      y = 38
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.text)
    doc.text(link.label.slice(0, 80), 14, y)
    doc.setTextColor(...COLORS.primary)
    doc.textWithLink('Abrir documento', 196, y, { url: link.url, align: 'right' })
    y += 5
  }
}

// Auxiliar para carregar imagem remota e converter para base64
function loadImageBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/jpeg'))
        } else {
          resolve(null)
        }
      } catch (e) {
        console.error('Falha ao processar canvas para base64:', e)
        resolve(null)
      }
    }
    img.onerror = () => {
      resolve(null)
    }
    img.src = url
  })
}

export async function generateReport(data: ReportData) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const now = new Date()
  const headerSubtitle = `${data.clientName} — ${data.projectName}`

  // 1. Pré-carregar todas as fotos de câmeras e QR codes em base64 para evitar bloqueios assíncronos no loop
  const cameraImages = await Promise.all(
    data.cameras.map(async (c) => {
      const qrUrl = c.qr_code_url ? await getQRCodeImageUrl(c.qr_code_url) : null
      const photoUrl = c.installation_photo_url ? await getInstallationPhotoUrl(c.installation_photo_url) : null
      const qrBase64 = qrUrl ? await loadImageBase64(qrUrl) : null
      const photoBase64 = photoUrl ? await loadImageBase64(photoUrl) : null
      return {
        id: c.id,
        qrBase64,
        photoBase64
      }
    })
  )
  const imageMap = new Map(cameraImages.map((img) => [img.id, img]))

  let y = 0

  // =========================================================
  // PAGE 1 — Cover + Infrastructure Summary
  // =========================================================
  addPageHeader(doc, 'Relatório de Infraestrutura', headerSubtitle)
  y = 36

  // Client + Project info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.text)
  doc.text('Cliente:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.clientName, 35, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Projeto:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.projectName, 35, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Data:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(now), 35, y)
  y += 12

  // Section 1: Resumo
  y = addSectionTitle(doc, y, '1', 'Resumo da Infraestrutura')

  const camAnalog = data.cameras.filter(c => c.connection_type === 'analogica').length
  const camIP = data.cameras.filter(c => c.connection_type === 'ip').length
  const poeSwitches = data.switches.filter(s => s.is_poe).length

  // Layout responsivo com 5 caixas
  const boxW = 32
  const boxH = 24
  const gap = 5
  const startX = 14
  drawSummaryBox(doc, startX, y, boxW, boxH, String(data.cameras.length), `Câmeras (${camAnalog}a/${camIP}IP)`, COLORS.primary)
  drawSummaryBox(doc, startX + boxW + gap, y, boxW, boxH, String(data.dvrs.length), 'DVRs', [99, 102, 241])
  drawSummaryBox(doc, startX + (boxW + gap) * 2, y, boxW, boxH, String(data.switches.length), `Switches (${poeSwitches} PoE)`, COLORS.success)
  drawSummaryBox(doc, startX + (boxW + gap) * 3, y, boxW, boxH, String(data.routers.length), 'Roteadores', [245, 158, 11])
  drawSummaryBox(doc, startX + (boxW + gap) * 4, y, boxW, boxH, String(data.baluns.length), 'Power Baluns', [168, 85, 247])

  y += boxH + 14

  // Section 2: Integridade
  y = addSectionTitle(doc, y, '2', 'Status de Integridade')

  const camStats = countByStatus(data.cameras)
  const dvrStats = countByStatus(data.dvrs)
  const swStats = countByStatus(data.switches)
  const rtStats = countByStatus(data.routers)

  drawStatusBar(doc, 14, y, 182, camStats, 'Câmeras')
  y += 18
  drawStatusBar(doc, 14, y, 182, dvrStats, 'DVRs')
  y += 18
  drawStatusBar(doc, 14, y, 182, swStats, 'Switches')
  y += 18
  drawStatusBar(doc, 14, y, 182, rtStats, 'Roteadores')

  // =========================================================
  // PAGE 2 — Rede, Roteadores & Switches
  // =========================================================
  doc.addPage()
  addPageHeader(doc, 'Topologia de Rede & Equipamentos', headerSubtitle)
  y = 36

  y = addSectionTitle(doc, y, '3', 'Infraestrutura de Rede')

  // Roteadores
  if (data.routers.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('Roteadores', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nome', 'IP LAN', 'Marca', 'Modelo', 'Local', 'Status']],
      body: data.routers.map(r => [
        r.name, r.ip_address || '-', r.brand || '-', r.model || '-', r.location || '-', r.status.toUpperCase()
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Switches
  if (data.switches.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('Switches', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nome', 'IP', 'Marca', 'Modelo', 'Portas', 'PoE', 'Status']],
      body: data.switches.map(s => [
        s.name, (s as any).ip || (s as any).ip_address || '-', s.brand || '-', s.model || '-', String(s.total_ports),
        s.is_poe ? `Sim (${s.poe_budget_watts || '0'}W)` : 'Não', s.status.toUpperCase()
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Credenciais de Dispositivos (Mascarado para Segurança)
  if (data.credentials.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('Credenciais de Dispositivos', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Dispositivo', 'IP / Destino', 'Usuário', 'Senha', 'Porta', 'Protocolo']],
      body: data.credentials.map(c => [
        c.label, c.ip_address || '-', c.username, '********', c.port ? String(c.port) : '-', c.protocol || '-'
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // =========================================================
  // PAGE 3 — Gravadores (DVRs) & Power Baluns
  // =========================================================
  doc.addPage()
  addPageHeader(doc, 'Infraestrutura de Gravação & Conexões', headerSubtitle)
  y = 36

  y = addSectionTitle(doc, y, '4', 'Gravadores & Distribuidores')

  // DVRs
  if (data.dvrs.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('DVRs (Gravadores de Vídeo)', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nome', 'Endereço IP', 'Marca', 'Modelo', 'Canais', 'Localização', 'Status']],
      body: data.dvrs.map(d => [
        d.name, d.ip_address, d.brand || '-', d.model || '-', String(d.total_channels), d.location, d.status.toUpperCase()
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Power Baluns
  if (data.baluns.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('Power Baluns / Distribuidores Analógicos', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nome', 'Canais/Portas', 'Localização', 'Status', 'Notas']],
      body: data.baluns.map(b => [
        b.name, String(b.total_ports), b.location, b.status.toUpperCase(), b.notes || '-'
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Proteção elétrica, baterias e documentação dos equipamentos
  await drawPowerProtectionPage(doc, data, headerSubtitle)

  // =========================================================
  // PAGE 6+ — Fichas Técnicas das Câmeras (Premium Card Layout)
  // =========================================================
  if (data.cameras.length > 0) {
    doc.addPage()
    addPageHeader(doc, 'Fichas Individuais de Câmeras', headerSubtitle)
    y = 36

    y = addSectionTitle(doc, y, '7', 'Fichas Técnicas das Câmeras')

    // Mapeamento de cabeamento indexado por câmera (legacy)
    const cableMap = new Map(data.cables.map(c => [c.camera_id, c]))

    // Fase 1+2 — mapa câmera → cabo UTP (novo modelo) para info de compartilhamento
    const utpCableByCameraId = new Map<string, UtpCable>()
    for (const cable of data.utpCables ?? []) {
      for (const pair of cable.utp_cable_pairs ?? []) {
        if (pair.camera_id) utpCableByCameraId.set(pair.camera_id, cable)
      }
    }
    // Mapa câmera → cabo paralelo de alimentação
    const powerCablesByCameraId = new Map<string, PowerCable[]>()
    for (const cable of data.powerCables ?? []) {
      for (const cameraId of cable.camera_ids ?? []) {
        const arr = powerCablesByCameraId.get(cameraId) ?? []
        arr.push(cable)
        powerCablesByCameraId.set(cameraId, arr)
      }
    }
    // Mapa site_id → site
    const siteById = new Map((data.sites ?? []).map((s) => [s.id, s]))
    // Mapa câmera → nomes das outras câmeras que compartilham o mesmo utp_cable
    const cameraNameById = new Map(data.cameras.map((c) => [c.id, c.name]))

    for (let i = 0; i < data.cameras.length; i++) {
      const cam = data.cameras[i]
      const imgData = imageMap.get(cam.id)
      const cable = cableMap.get(cam.id)

      // Se y estourar o limite da página para caber o bloco (precisamos de pelo menos 75mm), adiciona nova página
      if (y > 200) {
        doc.addPage()
        addPageHeader(doc, 'Fichas Individuais de Câmeras', headerSubtitle)
        y = 36
      }

      // 1. Desenhar Cabeçalho do Card
      doc.setFillColor(...COLORS.headerBg)
      doc.rect(14, y, 182, 7, 'F')
      doc.setFillColor(...COLORS.primary)
      doc.rect(14, y + 7, 182, 0.5, 'F')

      // Nome da Câmera
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.white)
      doc.text(cam.name.toUpperCase(), 18, y + 5)

      // Status Badge
      const statusText = cam.status.toUpperCase()
      const isOnline = cam.status === 'ativo' || cam.status === 'online'
      doc.setFillColor(...(isOnline ? COLORS.success : COLORS.danger))
      doc.roundedRect(170, y + 1.5, 22, 4, 0.5, 0.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(...COLORS.white)
      doc.text(statusText, 181, y + 4.3, { align: 'center' })

      // Conteúdo do Card - Bordas
      doc.setDrawColor(...COLORS.border)
      doc.setLineWidth(0.3)
      doc.line(14, y + 7.5, 14, y + 75)
      doc.line(196, y + 7.5, 196, y + 75)
      doc.line(14, y + 75, 196, y + 75)

      // 2. Coluna Esquerda: Detalhes Técnicos da Câmera
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.text)
      
      let cy = y + 13
      doc.text('Dados de Rede & Conexão:', 18, cy)
      doc.setFont('helvetica', 'normal')
      cy += 4.5
      doc.text(`Conexão: ${cam.connection_type === 'ip' ? 'IP / Rede' : 'Analógica'}`, 18, cy)
      cy += 4
      doc.text(`IP / Destino: ${cam.connection_type === 'ip' ? (cam.ip_address || 'DHCP') : (cam.dvrs?.name || 'Não associado')}`, 18, cy)
      cy += 4
      const chKind = classifyDvrChannel(cam.channel_number, cam.dvrs?.analog_channels, cam.connection_type, cam.dvrs?.disabled_analog_channels)
      const chLabel = cam.channel_number != null
        ? `Canal ${cam.channel_number}${channelKindLabel(chKind) ? ' (' + channelKindLabel(chKind) + ')' : ''}`
        : (cam.switch_port ? 'Porta Switch ' + cam.switch_port : '-')
      doc.text(`Canal/Porta: ${chLabel}`, 18, cy)
      cy += 4
      doc.text(`Localização: ${cam.location || '-'}`, 18, cy)
      cy += 4
      doc.text(`Marca/Resolução: ${cam.brand || '-'} ${cam.resolution || ''}`, 18, cy)

      // Detalhes de Cabeamento (prioriza novo modelo utp_cables + info de compartilhamento)
      cy += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Especificações de Cabo:', 18, cy)
      doc.setFont('helvetica', 'normal')

      const utpCable = utpCableByCameraId.get(cam.id)
      if (utpCable) {
        cy += 4.5
        const cableLabel = CABLE_TYPE_LABELS[utpCable.cable_type] || utpCable.cable_type
        doc.text(`Tipo de Cabo: ${cableLabel}${utpCable.name ? ` · ${utpCable.name}` : ''}`, 18, cy)
        cy += 4
        doc.text(`Padrão Crimp: ${utpCable.wiring_standard || '-'}`, 18, cy)
        cy += 4
        doc.text(`Comprimento: ${utpCable.cable_length_meters ? utpCable.cable_length_meters + ' metros' : '-'}`, 18, cy)

        // Câmeras irmãs no mesmo cabo (compartilhamento)
        const sisterNames = (utpCable.utp_cable_pairs ?? [])
          .filter((p) => p.function === 'video' && p.camera_id && p.camera_id !== cam.id)
          .map((p) => cameraNameById.get(p.camera_id!))
          .filter(Boolean) as string[]
        if (sisterNames.length > 0) {
          cy += 4
          const sisters = sisterNames.join(', ')
          doc.text(`Compartilhado com: ${sisters.length > 55 ? sisters.slice(0, 52) + '…' : sisters}`, 18, cy)
        }
      } else if (cable) {
        cy += 4.5
        const cableLabel = CABLE_TYPE_LABELS[cable.cable_type] || cable.cable_type
        doc.text(`Tipo de Cabo: ${cableLabel}`, 18, cy)
        cy += 4
        doc.text(`Padrão Crimp: ${cable.wiring_standard || '-'}`, 18, cy)
        cy += 4
        doc.text(`Comprimento: ${cable.cable_length_meters ? cable.cable_length_meters + ' metros' : '-'}`, 18, cy)
        cy += 4
        doc.text(`Pares (1/2): ${cable.pair1_colors.slice(0, 12)} | ${cable.pair2_colors.slice(0, 12)}`, 18, cy)
      } else {
        cy += 5
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...COLORS.muted)
        doc.text('Ficha de cabeamento não preenchida.', 18, cy)
        doc.setTextColor(...COLORS.text)
      }

      // Alimentação paralela (Fase 1)
      const linkedPower = powerCablesByCameraId.get(cam.id) ?? []
      if (linkedPower.length > 0) {
        cy += 5
        doc.setFont('helvetica', 'bold')
        doc.text('Alimentação paralela:', 18, cy)
        doc.setFont('helvetica', 'normal')
        for (const p of linkedPower.slice(0, 2)) {
          cy += 4
          const gauge = p.wire_gauge_mm2 ? `${p.wire_gauge_mm2.toString().replace('.', ',')} mm²` : ''
          const parts = [p.name, p.voltage, gauge].filter(Boolean).join(' · ')
          doc.text(`• ${parts.slice(0, 60)}`, 18, cy)
        }
      }

      // Site vinculado (Fase 2)
      const site = cam.site_id ? siteById.get(cam.site_id) : null
      if (site) {
        cy += 5
        doc.setFont('helvetica', 'bold')
        doc.text(`Local: ${site.name}`, 18, cy)
        doc.setFont('helvetica', 'normal')
        doc.text(`(${siteTypeLabel(site.site_type)})`, 18 + doc.getTextWidth(`Local: ${site.name} `), cy)
      }

      // 3. Coluna Direita: Imagens (Foto e QR Code)
      const imageX = 105
      const imageY = y + 12

      // Desenhar QR Code da Câmera (28x28mm)
      doc.setDrawColor(220, 225, 230)
      doc.rect(imageX, imageY, 28, 28)
      if (imgData?.qrBase64) {
        try {
          doc.addImage(imgData.qrBase64, 'JPEG', imageX + 0.5, imageY + 0.5, 27, 27)
        } catch (e) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(6)
          doc.text('Erro QR', imageX + 14, imageY + 15, { align: 'center' })
        }
      } else {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(6)
        doc.setTextColor(...COLORS.muted)
        doc.text('Sem QR Code', imageX + 14, imageY + 15, { align: 'center' })
        doc.setTextColor(...COLORS.text)
      }

      // Desenhar Foto do Local da Câmera (52x28mm)
      const photoX = imageX + 33
      doc.rect(photoX, imageY, 48, 28)
      if (imgData?.photoBase64) {
        try {
          doc.addImage(imgData.photoBase64, 'JPEG', photoX + 0.5, imageY + 0.5, 47, 27)
        } catch (e) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(6)
          doc.text('Erro Imagem', photoX + 24, imageY + 15, { align: 'center' })
        }
      } else {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(6)
        doc.setTextColor(...COLORS.muted)
        doc.text('Sem Foto do Local', photoX + 24, imageY + 15, { align: 'center' })
        doc.setTextColor(...COLORS.text)
      }

      // Legendas das fotos
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.text('CÓDIGO DE ACESSO QR', imageX + 14, imageY + 32, { align: 'center' })
      doc.text('FOTO DE INSTALAÇÃO DO LOCAL', photoX + 24, imageY + 32, { align: 'center' })

      y += 82
    }
  }

  // =========================================================
  // LAST PAGE — Installation Log & Signatures
  // =========================================================
  doc.addPage()
  addPageHeader(doc, 'Log de Entrega Técnica', headerSubtitle)
  y = 36

  y = addSectionTitle(doc, y, '8', 'Log de Entrega Técnica & Aceite')

  // Contagens do novo modelo (Fase 1+2)
  const utpCables = data.utpCables ?? []
  const powerCables = data.powerCables ?? []
  const sites = data.sites ?? []

  // Cabo UTP compartilhado conta 1 vez, com nota de câmeras atendidas
  const utpCableCount = utpCables.length
  const sharedUtpCables = utpCables.filter((c) =>
    (c.utp_cable_pairs ?? []).filter((p) => p.function === 'video' && p.camera_id).length > 1
  ).length
  const totalUtpMeters = utpCables.reduce((sum, c) => sum + (Number(c.cable_length_meters) || 0), 0)
  const totalPowerMeters = powerCables.reduce((sum, c) => sum + (Number(c.cable_length_meters) || 0), 0)

  // Links wireless: pares (dedupe A↔B)
  const seenPairs = new Set<string>()
  let wirelessLinkCount = 0
  for (const r of data.routers) {
    if (!r.paired_router_id) continue
    const key = [r.id, r.paired_router_id].sort().join('::')
    if (seenPairs.has(key)) continue
    seenPairs.add(key)
    wirelessLinkCount += 1
  }
  const poeInjectorCount = data.routers.filter((r) => r.powered_by_poe_injector).length

  const logItems = [
    ['Data/Hora de Geração', formatDate(now)],
    ['Responsável Técnico', data.userEmail],
    ['Cliente Contratante', data.clientName],
    ['Nome do Projeto', data.projectName],
    ['Total de Câmeras', `${data.cameras.length} (${countByStatus(data.cameras).ativos} ativas)`],
    ['Total de DVRs', `${data.dvrs.length} (${countByStatus(data.dvrs).ativos} ativos)`],
    ['Total de Switches', `${data.switches.length} (${countByStatus(data.switches).ativos} ativos)`],
    ['Total de Roteadores', `${data.routers.length} (${countByStatus(data.routers).ativos} ativos)`],
    ['Cabos UTP', `${utpCableCount} cabo(s) · ${sharedUtpCables} compartilhado(s) · ${totalUtpMeters.toFixed(1)} m totais`],
    ['Cabos paralelos de alimentação', `${powerCables.length} cabo(s) · ${totalPowerMeters.toFixed(1)} m totais`],
    ['Locais físicos (sites)', `${sites.length} cadastrado(s)`],
    ['Links wireless (AP↔Cliente)', `${wirelessLinkCount} par(es)`],
    ['Injetores PoE em uso', `${poeInjectorCount} roteador(es) alimentado(s)`],
    ['Fichas de cabeamento (legacy)', `${data.cables.length} cadastrada(s)`],
    ['Nobreaks', `${data.nobreaks?.length || 0} cadastrado(s)`],
    ['Documentos Técnicos', `${data.equipmentDocuments?.length || 0} item(ns)`],
  ]

  autoTable(doc, {
    startY: y,
    body: logItems,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.text },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: [241, 245, 249] },
    },
    alternateRowStyles: { fillColor: COLORS.white },
  })
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25

  // Signature lines
  if (y > 230) {
    doc.addPage()
    addPageHeader(doc, 'Log de Entrega Técnica', headerSubtitle)
    y = 50
  }

  doc.setDrawColor(...COLORS.border)

  // Technician signature
  doc.line(14, y + 10, 90, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text('Técnico Responsável', 52, y + 15, { align: 'center' })

  // Client signature
  doc.line(120, y + 10, 196, y + 10)
  doc.text('Cliente (Assinatura de Recebimento)', 158, y + 15, { align: 'center' })

  // Date line
  doc.text(`Data: _____ / _____ / _________`, 14, y + 25)

  // =========================================================
  // Add page numbers at the end
  // =========================================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPageFooter(doc, i, totalPages)
  }

  // Download
  const fileName = `Entrega_Tecnica_CFTV_${data.clientName.replace(/\s+/g, '_')}_${now.toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
}
