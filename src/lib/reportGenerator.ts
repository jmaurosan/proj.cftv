import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Dvr, Camera, Switch, PowerBalun, CableConnection } from './types'
import { CABLE_TYPE_LABELS } from './constants'

interface ReportData {
  dvrs: Dvr[]
  cameras: Camera[]
  switches: Switch[]
  baluns: PowerBalun[]
  cables: (CableConnection & { camera_name: string })[]
  userEmail: string
  clientName: string
  projectName: string
}

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
  const ativos = items.filter(i => i.status === 'ativo').length
  const inativos = items.filter(i => i.status === 'inativo').length
  const manutencao = items.filter(i => i.status === 'manutencao').length
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
  doc.text(`Pagina ${pageNum} de ${totalPages}`, 196, y, { align: 'right' })
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

  const h = 6
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
    x, y + h + 5
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

export function generateReport(data: ReportData) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const now = new Date()
  const headerSubtitle = `${data.clientName} — ${data.projectName}`

  // We'll track pages, then add headers/footers at the end
  let y = 0

  // =========================================================
  // PAGE 1 — Cover + Infrastructure Summary
  // =========================================================
  addPageHeader(doc, 'Relatorio de Infraestrutura', headerSubtitle)
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

  const boxW = 35
  const boxH = 24
  const gap = 6
  const startX = 14
  drawSummaryBox(doc, startX, y, boxW, boxH, String(data.cameras.length), `Cameras (${camAnalog} anal. / ${camIP} IP)`, COLORS.primary)
  drawSummaryBox(doc, startX + boxW + gap, y, boxW, boxH, String(data.dvrs.length), 'DVRs', [99, 102, 241])
  drawSummaryBox(doc, startX + (boxW + gap) * 2, y, boxW, boxH, String(data.switches.length), `Switches (${poeSwitches} PoE)`, COLORS.success)
  drawSummaryBox(doc, startX + (boxW + gap) * 3, y, boxW, boxH, String(data.baluns.length), 'Power Baluns', [168, 85, 247])

  y += boxH + 14

  // Section 4: Status de Integridade (placed here for visual flow)
  y = addSectionTitle(doc, y, '2', 'Status de Integridade')

  const camStats = countByStatus(data.cameras)
  const dvrStats = countByStatus(data.dvrs)
  const swStats = countByStatus(data.switches)

  drawStatusBar(doc, 14, y, 182, camStats, 'Cameras')
  y += 20
  drawStatusBar(doc, 14, y, 182, dvrStats, 'DVRs')
  y += 20
  drawStatusBar(doc, 14, y, 182, swStats, 'Switches')
  y += 24

  // =========================================================
  // PAGE 2 — Equipment Inventory
  // =========================================================
  doc.addPage()
  addPageHeader(doc, 'Inventario de Equipamentos', headerSubtitle)
  y = 36

  y = addSectionTitle(doc, y, '3', 'Inventario de Equipamentos')

  // DVRs Table
  if (data.dvrs.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('DVRs', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nome', 'IP', 'Modelo', 'Canais', 'Local', 'Status']],
      body: data.dvrs.map(d => [
        d.name, d.ip_address, d.model || '-', String(d.total_channels), d.location, d.status.toUpperCase()
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // Cameras Table
  if (data.cameras.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('Cameras', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nome', 'Conexao', 'DVR/IP', 'Canal', 'Tipo', 'Local', 'Status']],
      body: data.cameras.map(c => [
        c.name,
        c.connection_type === 'ip' ? `IP${c.poe_powered ? ' (PoE)' : ''}` : 'Analogica',
        c.connection_type === 'ip' ? (c.ip_address || '-') : (c.dvrs?.name || '-'),
        c.channel_number != null ? String(c.channel_number) : '-',
        c.type,
        c.location,
        c.status.toUpperCase()
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // Switches Table
  if (data.switches.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    doc.text('Switches', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nome', 'IP', 'Modelo', 'Portas', 'PoE', 'Local', 'Status']],
      body: data.switches.map(s => [
        s.name, s.ip_address, s.model || '-', String(s.total_ports),
        s.is_poe ? `${s.poe_standard || 'Sim'}${s.poe_budget_watts ? ` (${s.poe_budget_watts}W)` : ''}` : 'Nao',
        s.location, s.status.toUpperCase()
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.rowAlt },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // =========================================================
  // PAGE 3+ — Cable Connectivity
  // =========================================================
  if (data.cables.length > 0) {
    doc.addPage()
    addPageHeader(doc, 'Ficha de Conectividade', headerSubtitle)
    y = 36

    y = addSectionTitle(doc, y, '4', 'Ficha de Conectividade')

    for (const cable of data.cables) {
      // Check if we need a new page
      if (y > 230) {
        doc.addPage()
        addPageHeader(doc, 'Ficha de Conectividade', headerSubtitle)
        y = 36
      }

      // Camera name header
      doc.setFillColor(241, 245, 249) // slate-100
      doc.roundedRect(14, y, 182, 8, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...COLORS.text)
      doc.text(cable.camera_name, 17, y + 5.5)

      const cableLabel = CABLE_TYPE_LABELS[cable.cable_type] || cable.cable_type
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.muted)
      doc.text(`Cabo: ${cableLabel}  |  Padrao: ${cable.wiring_standard || '-'}  |  Comprimento: ${cable.cable_length_meters ? cable.cable_length_meters + 'm' : '-'}`, 80, y + 5.5)
      y += 12

      // Pairs table
      autoTable(doc, {
        startY: y,
        head: [['Par', 'Funcao', 'Cores']],
        body: [
          ['Par 1', cable.pair1_function, cable.pair1_colors],
          ['Par 2', cable.pair2_function, cable.pair2_colors],
          ['Par 3', cable.pair3_function, cable.pair3_colors],
          ['Par 4', cable.pair4_function, cable.pair4_colors],
        ],
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: COLORS.rowAlt },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 20 }, 1: { cellWidth: 35 } },
      })
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

      // Extra info line
      const extras: string[] = []
      if (cable.has_splice) extras.push(`Emenda: ${cable.splice_location || 'Sim'}`)
      if (cable.has_external_power) extras.push(`Alim. externa: ${cable.power_source_info || 'Sim'}`)
      if (extras.length > 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.muted)
        doc.text(extras.join('  |  '), 14, y + 2)
        y += 6
      }
      y += 6
    }
  }

  // =========================================================
  // LAST PAGE — Installation Log
  // =========================================================
  doc.addPage()
  addPageHeader(doc, 'Log de Instalacao', headerSubtitle)
  y = 36

  y = addSectionTitle(doc, y, '5', 'Log de Instalacao / Entrega')

  // Log info
  const logItems = [
    ['Data/Hora do Relatorio', formatDate(now)],
    ['Gerado por', data.userEmail],
    ['Cliente', data.clientName],
    ['Projeto', data.projectName],
    ['Total de Cameras', `${data.cameras.length} (${countByStatus(data.cameras).ativos} ativas)`],
    ['Total de DVRs', `${data.dvrs.length} (${countByStatus(data.dvrs).ativos} ativos)`],
    ['Total de Switches', `${data.switches.length} (${countByStatus(data.switches).ativos} ativos)`],
    ['Total de Power Baluns', `${data.baluns.length} (${countByStatus(data.baluns).ativos} ativos)`],
    ['Fichas de Cabeamento', `${data.cables.length} registros`],
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
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16

  // Equipment status snapshot
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.text('Snapshot de Status no Momento da Geracao:', 14, y)
  y += 4

  const allEquip: { name: string; type: string; status: string }[] = [
    ...data.dvrs.map(d => ({ name: d.name, type: 'DVR', status: d.status })),
    ...data.cameras.map(c => ({ name: c.name, type: 'Camera', status: c.status })),
    ...data.switches.map(s => ({ name: s.name, type: 'Switch', status: s.status })),
  ]

  autoTable(doc, {
    startY: y,
    head: [['Equipamento', 'Tipo', 'Status']],
    body: allEquip.map(e => [e.name, e.type, e.status.toUpperCase()]),
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 2, textColor: COLORS.text },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.rowAlt },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const val = String(hookData.cell.raw).toLowerCase()
        if (val === 'ativo') hookData.cell.styles.textColor = COLORS.success
        else if (val === 'inativo') hookData.cell.styles.textColor = COLORS.danger
        else if (val === 'manutencao') hookData.cell.styles.textColor = COLORS.warning
      }
    },
  })
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20

  // Signature lines
  if (y > 240) {
    doc.addPage()
    addPageHeader(doc, 'Log de Instalacao', headerSubtitle)
    y = 50
  }

  doc.setDrawColor(...COLORS.border)

  // Technician signature
  doc.line(14, y + 10, 90, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.muted)
  doc.text('Tecnico Responsavel', 52, y + 15, { align: 'center' })

  // Client signature
  doc.line(120, y + 10, 196, y + 10)
  doc.text('Cliente', 158, y + 15, { align: 'center' })

  // Date line
  doc.text(`Data: _____ / _____ / _________`, 14, y + 25)

  // =========================================================
  // Add headers and footers to all pages
  // =========================================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPageFooter(doc, i, totalPages)
  }

  // Download
  const fileName = `CFTV_Relatorio_${data.clientName.replace(/\s+/g, '_')}_${now.toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
}
