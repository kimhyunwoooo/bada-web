/** 학습지 종류 */
export type SheetType = 'see' | 'trace' | 'listen'

export type CellSize = 'auto' | 'sm' | 'md' | 'lg'

export interface Sentence {
  id: string
  /** 원문. 칸 분해는 렌더 시점에 파생한다 (PLAN §7) */
  text: string
}

export interface SheetOptions {
  cellSize: CellSize
  /** 띄어쓰기 V 표시 */
  showSpaceMark: boolean
  /** 이름/날짜/점수 머리글 */
  showHeader: boolean
}

export interface SheetSet {
  id: string
  version: 1
  title: string
  /**
   * 받아쓰기 급수. 선택 사항이므로 없을 수 있다.
   * 제목과 분리해 둔다 — 제목에 섞으면 급수를 고를 때마다 날짜가 지워진다.
   */
  grade: number | null
  sentences: Sentence[]
  createdAt: number
  updatedAt: number
  options: SheetOptions
}

export const SHEET_TYPES: SheetType[] = ['see', 'trace', 'listen']

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export const SHEET_META: Record<
  SheetType,
  {
    name: string
    short: string
    desc: string
    level: string
    guide: string
    icon: 'eye' | 'pen' | 'volume'
    order: string
  }
> = {
  see: {
    name: '보고 쓰기',
    short: '보고',
    icon: 'eye',
    order: 'I',
    desc: '위쪽 답을 보면서 아래 칸에 따라 씁니다.',
    level: '쉬움',
    guide: '위의 글자를 보고 아래 칸에 또박또박 써 보세요.',
  },
  trace: {
    name: '따라 쓰기',
    short: '따라',
    icon: 'pen',
    order: 'II',
    desc: '옅게 적힌 글자 위에 덧써서 손에 익힙니다.',
    level: '보통',
    guide: '옅은 글자 위에 덧써 보세요.',
  },
  listen: {
    name: '듣고 쓰기',
    short: '듣고',
    icon: 'volume',
    order: 'III',
    desc: '불러 주는 문장을 듣고 빈칸을 채웁니다.',
    level: '어려움',
    guide: '잘 듣고 또박또박 써 보세요.',
  },
}

export function createDefaultOptions(): SheetOptions {
  return { cellSize: 'auto', showSpaceMark: true, showHeader: true }
}
