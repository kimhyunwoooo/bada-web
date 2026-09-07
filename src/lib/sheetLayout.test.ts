import { describe, expect, it } from 'vitest'
import {
  availableHeightMm,
  buildAutoLayout,
  buildBlankLayout,
  buildLayout,
  buildMetrics,
  layoutSentence,
  maxCellsPerLine,
  resolveCellMm,
} from './sheetLayout'
import { createDefaultOptions, type SheetOptions } from '../types'

const opts = (over: Partial<SheetOptions> = {}): SheetOptions => ({
  ...createDefaultOptions(),
  ...over,
})

const ten = [
  '신나요.',
  '뿌듯해요.',
  '동실동실',
  '예쁘게 말해요.',
  '활짝 피었습니다.',
  '얼음처럼 꽁꽁!',
  '곰이 그림책을 봅니다.',
  '계곡에서 첨벙첨벙',
  '보고 싶어요.',
  '친구에게 미안했어요.',
]

describe('R5 — 한 줄 최대 칸 수는 용지 폭에서 나온다', () => {
  it('12mm 칸이면 A4 한 줄에 13칸 이상 들어간다', () => {
    expect(maxCellsPerLine(buildMetrics(12))).toBeGreaterThanOrEqual(13)
  })

  it('칸이 커지면 한 줄에 들어가는 칸 수가 줄어든다', () => {
    expect(maxCellsPerLine(buildMetrics(15))).toBeLessThan(maxCellsPerLine(buildMetrics(10)))
  })
})

describe('R4 — 어절은 두 줄로 쪼개지지 않는다', () => {
  it('짧은 문장은 한 줄', () => {
    const lines = layoutSentence('곰이 그림책을 봅니다.', buildMetrics(12))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toHaveLength(3)
  })

  it('넘치면 어절 경계에서만 줄이 바뀐다', () => {
    const lines = layoutSentence('아침에 일어나서 세수를 하고 밥을 먹었습니다.', buildMetrics(14))
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      for (const word of line) {
        expect(word.cells.length).toBeGreaterThan(0)
      }
    }
    // 어절 개수는 보존된다 — 쪼개지지 않았다는 뜻
    const total = lines.reduce((n, line) => n + line.length, 0)
    expect(total).toBe(6)
  })

  it('한 줄보다 긴 어절 하나는 예외적으로 쪼갠다 (넘쳐서 잘리는 것보다 낫다)', () => {
    const metrics = buildMetrics(15)
    const limit = maxCellsPerLine(metrics)
    const long = '가'.repeat(limit + 3)
    const lines = layoutSentence(long, metrics)
    expect(lines.length).toBe(2)
    expect(lines[0][0].cells).toHaveLength(limit)
    expect(lines[1][0].cells).toHaveLength(3)
  })

  it('어떤 줄도 용지 폭을 넘지 않는다', () => {
    const metrics = buildMetrics(12)
    for (const text of ten) {
      for (const line of layoutSentence(text, metrics)) {
        const cells = line.reduce((n, w) => n + w.cells.length, 0)
        expect(cells).toBeLessThanOrEqual(maxCellsPerLine(metrics))
      }
    }
  })
})

describe('auto 칸 크기 — 문항 수에 맞춰 A4 한 장을 채운다 (Q5)', () => {
  it('문항이 적으면 칸이 같거나 커진다', () => {
    const few = resolveCellMm(ten.slice(0, 3), 'see', opts())
    const many = resolveCellMm(ten, 'see', opts())
    expect(few).toBeGreaterThan(many)
  })

  it('칸이 상한에 걸리면 남는 공간은 칸이 아니라 문항 간격으로 간다', () => {
    // 칸만 무한정 키우면 저학년 손 크기에 비해 과해지고 한 줄 칸 수가 줄어든다
    const few = buildAutoLayout(ten.slice(0, 4), 'listen', opts())
    const many = buildAutoLayout(ten, 'listen', opts())
    expect(few.itemGapMm).toBeGreaterThan(many.itemGapMm)
    expect(few.metrics.cellMm).toBeLessThanOrEqual(20)
  })

  it('간격을 벌려도 어느 페이지도 넘치지 않는다', () => {
    const configs = [
      ...[1, 2, 3, 5, 7, 10].map((n) => ({ texts: ten.slice(0, n), size: 'auto' as const })),
      // 칸을 크게 고정해 일부러 두 장으로 넘긴 경우까지 본다
      { texts: ten, size: 'lg' as const },
      { texts: ten, size: 'md' as const },
    ]

    for (const { texts, size } of configs) {
      for (const type of ['see', 'trace', 'listen'] as const) {
        const layout = buildAutoLayout(texts, type, opts({ cellSize: size }))
        for (const page of layout.pages) {
          const used =
            page.items.reduce((sum, item) => sum + item.heightMm, 0) +
            Math.max(0, page.items.length - 1) * page.itemGapMm
          expect(used).toBeLessThanOrEqual(layout.availableHeightMm + 0.01)
        }
      }
    }
  })

  it('두 장으로 넘어가도 문항 번호는 이어지고 하나도 빠지지 않는다 (Q11)', () => {
    const layout = buildAutoLayout(ten, 'see', opts({ cellSize: 'lg' }))
    expect(layout.pageCount).toBeGreaterThan(1)
    const numbers = layout.pages.flatMap((page) => page.items.map((item) => item.index))
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('보고 쓰기는 답안 줄이 더 있으므로 칸이 더 작아진다', () => {
    const see = resolveCellMm(ten, 'see', opts())
    const listen = resolveCellMm(ten, 'listen', opts())
    expect(see).toBeLessThan(listen)
  })

  it('10문항 3종 모두 A4 한 장에 들어간다', () => {
    for (const type of ['see', 'trace', 'listen'] as const) {
      const layout = buildAutoLayout(ten, type, opts())
      expect(layout.pageCount).toBe(1)
      expect(layout.totalHeightMm).toBeLessThanOrEqual(layout.availableHeightMm)
    }
  })

  it('칸 크기를 크게 고정하면 두 장으로 넘어갈 수 있다 (Q11)', () => {
    const layout = buildLayout(ten, 'see', opts({ cellSize: 'lg' }), 14)
    expect(layout.pageCount).toBeGreaterThanOrEqual(1)
    expect(layout.totalHeightMm).toBeGreaterThan(0)
  })
})

describe('세로 공간 계산', () => {
  it('제목과 안내 문구를 뺀 나머지가 문항 자리다', () => {
    // 이름·날짜·점수 머리글은 제거했다 — 쓰이지 않으면서 칸 자리만 먹었다
    expect(availableHeightMm()).toBe(297 - 8 * 2 - 11 - 8)
  })

  it('빈 문장 목록도 안전하게 처리한다', () => {
    const layout = buildAutoLayout([], 'listen', opts())
    expect(layout.items).toHaveLength(0)
    expect(layout.pageCount).toBe(1)
  })
})

describe('빈 시험지 (문장 없는 양식)', () => {
  it('언제나 10문항을 만든다', () => {
    expect(buildBlankLayout(10, 10, 'grid', opts()).items).toHaveLength(10)
  })

  it('칸 시험지는 한 줄에 요청한 칸 수를 정확히 놓는다', () => {
    for (const cells of [8, 10, 12, 14]) {
      const layout = buildBlankLayout(10, cells, 'grid', opts())
      for (const item of layout.items) {
        const count = item.lines[0].reduce((n, w) => n + w.cells.length, 0)
        expect(count).toBe(cells)
      }
    }
  })

  it('칸이 용지 폭을 넘지 않는다', () => {
    for (const cells of [8, 10, 12, 14]) {
      const { metrics } = buildBlankLayout(10, cells, 'grid', opts())
      const used = cells * metrics.cellMm + (cells - 1) * metrics.cellGapMm
      expect(used).toBeLessThanOrEqual(metrics.cellsWidthMm + 0.01)
    }
  })

  it('줄 시험지는 칸을 만들지 않는다', () => {
    const layout = buildBlankLayout(10, 10, 'line', opts())
    expect(layout.items.every((item) => item.lines.length === 0)).toBe(true)
  })

  it('칸이 많아지면 칸이 작아진다 — 가로 제약', () => {
    const wide = buildBlankLayout(10, 8, 'grid', opts()).metrics.cellMm
    const narrow = buildBlankLayout(10, 14, 'grid', opts()).metrics.cellMm
    expect(wide).toBeGreaterThan(narrow)
  })

  it('모든 조합이 A4 한 장에 들어간다', () => {
    for (const kind of ['grid', 'line'] as const) {
      for (const rows of [10]) {
        for (const cells of [8, 10, 12, 14]) {
          const layout = buildBlankLayout(rows, cells, kind, opts())
          expect(layout.pageCount).toBe(1)
          for (const page of layout.pages) {
            const used =
              page.items.reduce((sum, item) => sum + item.heightMm, 0) +
              Math.max(0, page.items.length - 1) * page.itemGapMm
            expect(used).toBeLessThanOrEqual(layout.availableHeightMm + 0.01)
          }
        }
      }
    }
  })
})
