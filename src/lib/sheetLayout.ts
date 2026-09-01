/**
 * 학습지 레이아웃 엔진 (PLAN §2 R5, §5).
 *
 * 줄바꿈을 CSS flex-wrap에 맡기지 않고 JS로 직접 계산한다.
 * 이유: 화면 미리보기와 실제 인쇄 결과가 한 칸도 어긋나면 안 되기 때문.
 * 모든 치수는 mm 고정 (px/rem은 브라우저·배율마다 결과가 달라진다).
 */

import { parseSentence, type ParsedWord } from './gridParser'
import type { CellSize, SheetOptions, SheetType } from '../types'

/** A4 세로 및 블록 높이 (mm) */
export const PAGE = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 12,
  /** 문항 번호 열 */
  numberColMm: 9,
  /** 제목 블록 */
  titleMm: 12,
  /** 이름/날짜/점수 머리글 */
  headerMm: 13,
  /** 안내 문구 블록 */
  guideMm: 9,
} as const

const CELL_GAP_MM = 1.2
const SPACE_MARK_MM = 4.5
const LINE_GAP_MM = 2.5
const ITEM_GAP_MM = 4.5
/** 보고 쓰기의 답안 칸은 쓰기 칸의 55% 크기 */
const ANSWER_RATIO = 0.55
const ANSWER_GAP_MM = 1.5

const FIXED_CELL_MM: Record<Exclude<CellSize, 'auto'>, number> = {
  sm: 10,
  md: 12,
  lg: 14,
}

const AUTO_MAX_MM = 15
const AUTO_MIN_MM = 8
const AUTO_STEP_MM = 0.5
/**
 * 칸을 무한정 키우지 않는다. 첨부 학습지도 칸은 12~14mm 선을 지키고
 * 남는 세로 공간은 문항 사이 여백으로 흘려보낸다. 칸만 키우면 저학년 손 크기에 비해
 * 과하게 커지고, 한 줄에 들어가는 칸 수가 줄어 문장이 불필요하게 두 줄이 된다.
 */
const MAX_ITEM_GAP_MM = 16
const EPSILON = 0.001

export interface SheetMetrics {
  cellMm: number
  answerCellMm: number
  cellGapMm: number
  spaceMarkMm: number
  lineGapMm: number
  itemGapMm: number
  answerGapMm: number
  /** 여백을 뺀 본문 폭 */
  contentWidthMm: number
  /** 번호 열까지 뺀, 칸이 실제로 놓이는 폭 */
  cellsWidthMm: number
  numberColMm: number
}

export function buildMetrics(cellMm: number): SheetMetrics {
  const contentWidthMm = PAGE.widthMm - PAGE.marginMm * 2
  return {
    cellMm,
    answerCellMm: round(cellMm * ANSWER_RATIO),
    cellGapMm: CELL_GAP_MM,
    spaceMarkMm: SPACE_MARK_MM,
    lineGapMm: LINE_GAP_MM,
    itemGapMm: ITEM_GAP_MM,
    answerGapMm: ANSWER_GAP_MM,
    contentWidthMm,
    cellsWidthMm: contentWidthMm - PAGE.numberColMm,
    numberColMm: PAGE.numberColMm,
  }
}

/** 어절 하나가 차지하는 폭. 뒤따르는 V 마커 폭까지 포함한다 */
export function wordWidthMm(word: ParsedWord, m: SheetMetrics, withSpaceMark: boolean): number {
  const n = word.cells.length
  if (n === 0) return 0
  const cells = n * m.cellMm + (n - 1) * m.cellGapMm
  return cells + (word.trailingSpace && withSpaceMark ? m.spaceMarkMm : 0)
}

/** 한 줄에 들어가는 최대 칸 수 (R5) */
export function maxCellsPerLine(m: SheetMetrics): number {
  return Math.max(1, Math.floor((m.cellsWidthMm + m.cellGapMm) / (m.cellMm + m.cellGapMm)))
}

export type LayoutLine = ParsedWord[]

/**
 * 어절을 줄에 채운다 (R4 — 어절은 쪼개지지 않는다).
 * 예외: 어절 하나가 한 줄보다 길면 그때만 강제로 쪼갠다. 넘쳐서 잘리는 것보다 낫다.
 */
export function layoutWords(
  words: ParsedWord[],
  m: SheetMetrics,
  showSpaceMark = true,
): LayoutLine[] {
  const limit = maxCellsPerLine(m)
  const lines: LayoutLine[] = []
  let current: LayoutLine = []
  let currentWidth = 0

  for (const word of words) {
    for (const piece of splitOversized(word, limit)) {
      const width = wordWidthMm(piece, m, showSpaceMark)
      if (current.length > 0 && currentWidth + width > m.cellsWidthMm + EPSILON) {
        lines.push(current)
        current = []
        currentWidth = 0
      }
      current.push(piece)
      currentWidth += width
    }
  }

  if (current.length > 0) lines.push(current)
  return lines
}

/** 한 줄보다 긴 어절을 최대 칸 수 단위로 나눈다 */
function splitOversized(word: ParsedWord, limit: number): ParsedWord[] {
  if (word.cells.length <= limit) return [word]
  const pieces: ParsedWord[] = []
  for (let i = 0; i < word.cells.length; i += limit) {
    const chunk = word.cells.slice(i, i + limit)
    const isLast = i + limit >= word.cells.length
    pieces.push({ cells: chunk, trailingSpace: isLast ? word.trailingSpace : false })
  }
  return pieces
}

export function layoutSentence(
  text: string,
  m: SheetMetrics,
  showSpaceMark = true,
): LayoutLine[] {
  return layoutWords(parseSentence(text), m, showSpaceMark)
}

/** 문항 한 개의 높이 */
export function itemHeightMm(lineCount: number, type: SheetType, m: SheetMetrics): number {
  const perLine = type === 'see' ? m.answerCellMm + m.answerGapMm + m.cellMm : m.cellMm
  return lineCount * perLine + Math.max(0, lineCount - 1) * m.lineGapMm
}

/** 문항들이 놓일 수 있는 세로 공간 */
export function availableHeightMm(options: SheetOptions): number {
  return (
    PAGE.heightMm -
    PAGE.marginMm * 2 -
    PAGE.titleMm -
    (options.showHeader ? PAGE.headerMm : 0) -
    PAGE.guideMm
  )
}

export interface LayoutItem {
  /** 문항 번호 (1부터). 페이지가 나뉘어도 이어진다 */
  index: number
  text: string
  lines: LayoutLine[]
  heightMm: number
}

export interface SheetPage {
  items: LayoutItem[]
  /** 이 페이지의 남는 공간을 흘려보낸 뒤의 문항 간격 */
  itemGapMm: number
}

export interface SheetLayout {
  metrics: SheetMetrics
  items: LayoutItem[]
  /** 페이지별로 나눠 담은 문항 (Q11). 브라우저 자동 분할에 맡기지 않는다 */
  pages: SheetPage[]
  totalHeightMm: number
  availableHeightMm: number
  /** 첫 페이지의 문항 간격 (요약용) */
  itemGapMm: number
  /** 예상 인쇄 장수 (Q11) */
  pageCount: number
}

/**
 * 한 페이지의 남는 세로 공간을 문항 사이로 고르게 흘려보낸다.
 * 페이지마다 따로 계산해야 한다 — 첫 장 기준으로 계산한 간격을 다른 장에 그대로 쓰면
 * 그 장이 넘칠 수 있다.
 */
function fitGapMm(items: LayoutItem[], availableMm: number, baseGapMm: number): number {
  if (items.length < 2) return baseGapMm
  const used = items.reduce((sum, item) => sum + item.heightMm, 0)
  // 남은 높이를 간격 개수로 나눈 값이 곧 간격이다.
  // 기본 간격에 "더하면" (n-1) × 기본 간격만큼 페이지를 넘긴다.
  const spread = (availableMm - used) / (items.length - 1)
  // 반올림하면 한 장을 0.01mm 넘길 수 있다. 페이지를 채우는 값은 항상 내림.
  return floor2(Math.min(Math.max(baseGapMm, spread), MAX_ITEM_GAP_MM))
}

/**
 * 문항을 페이지에 담는다.
 * 미리보기와 인쇄 결과가 어긋나지 않도록 CSS가 아니라 여기서 확정한다.
 */
export function paginate(
  items: LayoutItem[],
  availableMm: number,
  itemGapMm: number,
): LayoutItem[][] {
  const pages: LayoutItem[][] = []
  let page: LayoutItem[] = []
  let used = 0

  for (const item of items) {
    const needed = page.length === 0 ? item.heightMm : used + itemGapMm + item.heightMm
    if (page.length > 0 && needed > availableMm + EPSILON) {
      pages.push(page)
      page = [item]
      used = item.heightMm
    } else {
      page.push(item)
      used = needed
    }
  }

  if (page.length > 0) pages.push(page)
  return pages
}

export function buildLayout(
  texts: string[],
  type: SheetType,
  options: SheetOptions,
  cellMm: number,
): SheetLayout {
  const metrics = buildMetrics(cellMm)
  const items: LayoutItem[] = texts.map((text, i) => {
    const lines = layoutSentence(text, metrics, options.showSpaceMark)
    return { index: i + 1, text, lines, heightMm: itemHeightMm(lines.length, type, metrics) }
  })

  const totalHeightMm =
    items.reduce((sum, item) => sum + item.heightMm, 0) +
    Math.max(0, items.length - 1) * metrics.itemGapMm

  const available = availableHeightMm(options)
  const pages: SheetPage[] = paginate(items, available, metrics.itemGapMm).map((pageItems) => ({
    items: pageItems,
    itemGapMm: fitGapMm(pageItems, available, metrics.itemGapMm),
  }))

  return {
    metrics,
    items,
    pages,
    totalHeightMm,
    availableHeightMm: available,
    itemGapMm: pages[0]?.itemGapMm ?? metrics.itemGapMm,
    pageCount: Math.max(1, pages.length),
  }
}

/**
 * 칸 크기 결정 (PLAN §5).
 * 'auto'는 A4 한 장을 가장 자연스럽게 채우는 가장 큰 칸을 고른다 —
 * 문항 수가 1~10으로 가변이므로(Q5) 4문항이면 크게, 10문항이면 작게.
 */
export function resolveCellMm(
  texts: string[],
  type: SheetType,
  options: SheetOptions,
): number {
  if (options.cellSize !== 'auto') return FIXED_CELL_MM[options.cellSize]
  if (texts.length === 0) return FIXED_CELL_MM.md

  const available = availableHeightMm(options)
  for (let mm = AUTO_MAX_MM; mm >= AUTO_MIN_MM; mm -= AUTO_STEP_MM) {
    const layout = buildLayout(texts, type, options, round(mm))
    if (layout.totalHeightMm <= available + EPSILON) return round(mm)
  }
  return AUTO_MIN_MM
}

export function buildAutoLayout(
  texts: string[],
  type: SheetType,
  options: SheetOptions,
): SheetLayout {
  return buildLayout(texts, type, options, resolveCellMm(texts, type, options))
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function floor2(n: number): number {
  return Math.floor(n * 100) / 100
}
