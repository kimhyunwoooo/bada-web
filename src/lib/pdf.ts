/**
 * 학습지를 PDF로 그린다.
 *
 * 화면을 캡처하지 않고 다시 그리는 이유:
 * 레이아웃 엔진이 이미 모든 좌표를 mm로 확정해 뒀다. 같은 숫자로 그리면
 * 화면·인쇄·PDF 셋이 어긋날 수 없다. 화면 캡처는 배율에 휘둘리고 글자가 뭉갠다.
 *
 * 한글 폰트를 PDF에 심지 않는 이유:
 * Pretendard는 CDN 동적 서브셋이라 통째로 받을 수 없고, 한글 TTF는 1MB가 넘는다.
 * 대신 칸 테두리 같은 도형은 벡터로 그리고 글자만 캔버스로 떠서 넣는다.
 * 같은 글자는 이미지 하나를 재사용하므로(alias) 장당 수십 KB에 그친다.
 */

import type jsPDF from 'jspdf'
import { PAGE, type LayoutLine, type SheetLayout, type SheetMetrics, type SheetPage } from './sheetLayout'
import { BLANK_META, SHEET_META, type BlankKind, type SheetOptions, type SheetType } from '../types'

/** 글자 이미지 해상도. 16px/mm ≈ 406dpi — 인쇄에 충분하고 캔버스도 가볍다 */
const PX_PER_MM = 16

/** 종이 위의 색은 토큰 밖에 있다 — 인쇄에서 확실히 나오는 고정값 (SheetPaper/CellGrid와 같은 값) */
const INK = '#1c1917'
const CELL_LINE = '#1a1a1a'
const MUTED = '#7a7a7a'
const GUIDE_INK = '#333333'
const SPACE_MARK = '#c82014'
const TRACE_INK = '#c8c8c8'
const ANSWER_LINE = '#d8d6d3'
const ANSWER_BG = '#f5f5f4'
const ANSWER_INK = '#333333'

const PAPER_FONT =
  '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", sans-serif'

/**
 * 글자 위쪽 여백 비율. 이미지 위끝에서 베이스라인까지의 거리를 글자 크기로 나눈 값.
 * 이 값으로 이미지를 놓으면 베이스라인이 정확히 원하는 자리에 온다.
 */
const BASELINE_RATIO = 1.15
const RUN_HEIGHT_RATIO = 1.5
/** Pretendard의 대략적인 어센트. CSS 줄 상자에서 베이스라인 위치를 되짚을 때 쓴다 */
const ASCENT = 0.8

interface Ink {
  sizeMm: number
  weight: number
  color: string
}

export interface PdfInput {
  title: string
  grade: number | null
  type: SheetType
  /** 빈 시험지 모드 */
  blank?: BlankKind
  layout: SheetLayout
  options: SheetOptions
}

/**
 * 종이 위에 글자를 놓는 붓.
 * 같은 글자·같은 크기는 이미지를 한 번만 만들고 PDF 안에서 재사용한다.
 */
class Brush {
  private cache = new Map<string, string>()
  private measurer = document.createElement('canvas').getContext('2d')!

  constructor(private doc: jsPDF) {}

  private font(ink: Ink): string {
    return `${ink.weight} ${ink.sizeMm * PX_PER_MM}px ${PAPER_FONT}`
  }

  /** 정사각 칸 한가운데에 글자 하나. CSS의 flex 가운데 정렬과 같은 결과다 */
  glyph(char: string, x: number, y: number, boxMm: number, ink: Ink): void {
    const key = `g|${char}|${boxMm}|${ink.sizeMm}|${ink.weight}|${ink.color}`
    let data = this.cache.get(key)
    if (!data) {
      const px = Math.max(1, Math.round(boxMm * PX_PER_MM))
      const c = document.createElement('canvas')
      c.width = px
      c.height = px
      const ctx = c.getContext('2d')!
      ctx.font = this.font(ink)
      ctx.fillStyle = ink.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(char, px / 2, px / 2)
      data = c.toDataURL('image/png')
      this.cache.set(key, data)
    }
    this.doc.addImage(data, 'PNG', x, y, boxMm, boxMm, key, 'FAST')
  }

  /** 글자 폭을 재서 한 줄로 그린다. baselineY에 글자 밑선이 온다 */
  run(text: string, x: number, baselineY: number, ink: Ink): number {
    const widthMm = this.width(text, ink)
    if (!text) return 0
    const key = `r|${text}|${ink.sizeMm}|${ink.weight}|${ink.color}`
    let data = this.cache.get(key)
    if (!data) {
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.ceil(widthMm * PX_PER_MM))
      c.height = Math.max(1, Math.round(ink.sizeMm * RUN_HEIGHT_RATIO * PX_PER_MM))
      const ctx = c.getContext('2d')!
      ctx.font = this.font(ink)
      ctx.fillStyle = ink.color
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(text, 0, ink.sizeMm * BASELINE_RATIO * PX_PER_MM)
      data = c.toDataURL('image/png')
      this.cache.set(key, data)
    }
    this.doc.addImage(
      data,
      'PNG',
      x,
      baselineY - ink.sizeMm * BASELINE_RATIO,
      widthMm,
      ink.sizeMm * RUN_HEIGHT_RATIO,
      key,
      'FAST',
    )
    return widthMm
  }

  width(text: string, ink: Ink): number {
    if (!text) return 0
    this.measurer.font = this.font(ink)
    return this.measurer.measureText(text).width / PX_PER_MM
  }
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * CSS 테두리는 상자 안쪽에 그려지고 PDF 선은 경로 가운데에 그려진다.
 * 선 두께의 절반만큼 안으로 밀어야 바깥 모서리가 맞는다.
 */
function strokedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  lineMm: number,
  line: string,
  fill: string | null,
): void {
  const i = lineMm / 2
  doc.setLineWidth(lineMm)
  doc.setDrawColor(...rgb(line))
  if (fill) doc.setFillColor(...rgb(fill))
  doc.roundedRect(x + i, y + i, w - lineMm, h - lineMm, radius, radius, fill ? 'FD' : 'S')
}

interface GridStyle {
  cellMm: number
  lineMm: number
  radiusMm: number
  line: string
  fill: string
  /** 글자를 그릴 때의 잉크. null이면 빈 칸 */
  ink: Ink | null
}

/** CellGrid 한 덩어리. 줄바꿈은 이미 확정돼 있으니 받은 대로 놓기만 한다 */
function drawGrid(
  doc: jsPDF,
  brush: Brush,
  lines: LayoutLine[],
  x: number,
  y: number,
  m: SheetMetrics,
  style: GridStyle,
  showSpaceMark: boolean,
  spacePadBottomMm: number,
): void {
  let rowY = y
  for (const line of lines) {
    let cx = x
    for (const word of line) {
      word.cells.forEach((char, i) => {
        // 칸 사이 간격은 어절 안에서만 붙는다 (CSS의 .cell + .cell)
        if (i > 0) cx += m.cellGapMm
        strokedRect(doc, cx, rowY, style.cellMm, style.cellMm, style.radiusMm, style.lineMm, style.line, style.fill)
        if (style.ink && char) brush.glyph(char, cx, rowY, style.cellMm, style.ink)
        cx += style.cellMm
      })
      if (word.trailingSpace && showSpaceMark) {
        // 띄어쓰기 표시는 칸이 아니라 칸 사이의 기호다 (R3). 줄 아래쪽에 붙는다
        const ink: Ink = { sizeMm: style.cellMm * 0.42, weight: 600, color: SPACE_MARK }
        const mark = cx + (m.spaceMarkMm - brush.width('∨', ink)) / 2
        brush.run('∨', mark, rowY + style.cellMm - spacePadBottomMm, ink)
        cx += m.spaceMarkMm
      }
    }
    rowY += style.cellMm + m.lineGapMm
  }
}

function drawHeader(doc: jsPDF, brush: Brush, input: PdfInput, page: number, pageCount: number): void {
  const left = PAGE.marginMm
  const top = PAGE.marginMm
  const meta = input.blank ? BLANK_META[input.blank] : SHEET_META[input.type]
  // 제목 상자는 아래 여백 1.5mm와 밑줄 0.4mm를 포함해 titleMm이다
  const contentH = PAGE.titleMm - 1.5 - 0.4
  const titleInk: Ink = { sizeMm: 5, weight: 700, color: INK }
  // 줄 상자(line-height 1.1) 안에서 밑선이 오는 자리
  const baseline = top + (5 * 1.1 - 5) / 2 + 5 * ASCENT
  let x = left

  if (input.grade) {
    const chip: Ink = { sizeMm: 3.2, weight: 700, color: INK }
    const label = `${input.grade}급`
    const w = brush.width(label, chip) + 2.2 * 2
    const h = 3.2 * 1.3 + 0.6 * 2
    const chipY = top + (contentH - h) / 2
    strokedRect(doc, x, chipY, w, h, h / 2, 0.3, INK, null)
    brush.run(label, x + 2.2, chipY + h / 2 + 3.2 * (ASCENT - 0.5), chip)
    x += w + 3
  }

  x += brush.run(input.title, x, baseline, titleInk) + 3
  brush.run(meta.name, x, baseline, { sizeMm: 3.4, weight: 600, color: MUTED })

  if (pageCount > 1) {
    const no: Ink = { sizeMm: 3, weight: 400, color: MUTED }
    const label = `${page + 1} / ${pageCount}`
    brush.run(label, left + PAGE.widthMm - PAGE.marginMm * 2 - brush.width(label, no), baseline, no)
  }

  // 밑줄
  doc.setLineWidth(0.4)
  doc.setDrawColor(...rgb(INK))
  const ruleY = top + PAGE.titleMm - 0.2
  doc.line(left, ruleY, PAGE.widthMm - PAGE.marginMm, ruleY)
}

function drawGuide(brush: Brush, input: PdfInput): void {
  const meta = input.blank ? BLANK_META[input.blank] : SHEET_META[input.type]
  const top = PAGE.marginMm + PAGE.titleMm
  const size = 3
  // 세로 가운데 정렬(line-height 1.3)에서 밑선이 오는 자리
  const baseline = top + (PAGE.guideMm - size * 1.3) / 2 + (size * 1.3 - size) / 2 + size * ASCENT
  const ink: Ink = { sizeMm: size, weight: 400, color: GUIDE_INK }
  const bold: Ink = { ...ink, weight: 600 }
  let x = PAGE.marginMm

  x += brush.run('★', x, baseline, bold) + 1
  x += brush.run(meta.guide, x, baseline, ink) + 1

  if (!input.blank && input.options.showSpaceMark) {
    x += brush.run('네모 칸 사이의', x, baseline, ink) + 1
    x += brush.run('∨', x, baseline, { ...bold, color: SPACE_MARK }) + 1
    x += brush.run('는 띄어쓰기예요.', x, baseline, ink) + 1
  }
  if (input.blank !== 'line') {
    brush.run('문장부호(. , ! ?)도 한 칸에 써 주세요.', x, baseline, ink)
  }
}

function drawPage(doc: jsPDF, brush: Brush, input: PdfInput, page: SheetPage, pageIndex: number): void {
  const m = input.layout.metrics
  const left = PAGE.marginMm
  const cellsX = left + m.numberColMm

  drawHeader(doc, brush, input, pageIndex, input.layout.pageCount)
  drawGuide(brush, input)

  const empty: GridStyle = {
    cellMm: m.cellMm,
    lineMm: 0.35,
    radiusMm: 0.6,
    line: CELL_LINE,
    fill: '#ffffff',
    ink: null,
  }
  const trace: GridStyle = {
    ...empty,
    ink: { sizeMm: m.cellMm * 0.62, weight: 300, color: TRACE_INK },
  }
  const answer: GridStyle = {
    cellMm: m.answerCellMm,
    lineMm: 0.25,
    radiusMm: 0.5,
    line: ANSWER_LINE,
    fill: ANSWER_BG,
    ink: { sizeMm: m.answerCellMm * 0.62, weight: 400, color: ANSWER_INK },
  }

  let y = PAGE.marginMm + PAGE.titleMm + PAGE.guideMm
  const numberInk: Ink = { sizeMm: 3.6, weight: 600, color: MUTED }

  for (const item of page.items) {
    if (input.blank === 'line') {
      // 번호를 줄에 붙인다 — 위에 떠 있으면 어느 줄의 번호인지 헷갈린다
      brush.run(String(item.index), left, y + item.heightMm - 1.2 - 3.6 * (1 - ASCENT), numberInk)
      doc.setLineWidth(0.35)
      doc.setDrawColor(...rgb(CELL_LINE))
      doc.line(cellsX, y + item.heightMm, cellsX + m.cellsWidthMm, y + item.heightMm)
    } else {
      brush.run(String(item.index), left, y + (3.6 * 1.6 - 3.6) / 2 + 3.6 * ASCENT, numberInk)

      if (input.type === 'see' && !input.blank) {
        // 보고 쓰기: 답안 줄이 쓰기 줄 위에 얹힌다
        let lineY = y
        for (const line of item.lines) {
          drawGrid(doc, brush, [line], cellsX, lineY, m, answer, input.options.showSpaceMark, 0.4)
          lineY += m.answerCellMm + m.answerGapMm
          drawGrid(doc, brush, [line], cellsX, lineY, m, empty, input.options.showSpaceMark, 1)
          lineY += m.cellMm + m.lineGapMm
        }
      } else {
        const style = input.type === 'trace' && !input.blank ? trace : empty
        drawGrid(doc, brush, item.lines, cellsX, y, m, style, input.blank ? false : input.options.showSpaceMark, 1)
      }
    }
    y += item.heightMm + page.itemGapMm
  }
}

/** 학습지 한 벌을 PDF로 만든다 */
export async function buildPdf(input: PdfInput): Promise<Blob> {
  // 무거운 라이브러리다. 인쇄만 하는 사람에게는 내려받게 하지 않는다
  const { jsPDF: JsPDF } = await import('jspdf')
  // 캔버스로 글자를 뜨기 전에 폰트가 준비돼야 한다. 아니면 기본 고딕으로 떨어진다
  if (document.fonts?.ready) await document.fonts.ready

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const brush = new Brush(doc)

  input.layout.pages.forEach((page, i) => {
    if (i > 0) doc.addPage()
    drawPage(doc, brush, input, page, i)
  })

  return doc.output('blob')
}

/** 파일 이름에 쓸 수 없는 글자를 걷어낸다 */
export function pdfFilename(title: string, label: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '').trim() || '받아쓰기'
  return `${safe} ${label}.pdf`
}
