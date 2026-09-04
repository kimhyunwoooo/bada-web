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

/**
 * 빈 시험지 종류.
 * 연습용 3종과 달리 문장이 필요 없다 — 부모가 불러 주고 아이가 받아 적는 실제 시험용이다.
 */
export type BlankKind = 'grid' | 'line'

export const BLANK_KINDS: BlankKind[] = ['grid', 'line']

export const BLANK_META: Record<
  BlankKind,
  { name: string; short: string; desc: string; guide: string; icon: 'grid' | 'rows' }
> = {
  grid: {
    name: '칸 시험지',
    short: '칸',
    desc: '한 줄에 네모 칸이 쳐져 있습니다. 한 글자씩 또박또박 쓰기 좋아요.',
    guide: '잘 듣고 한 칸에 한 글자씩 또박또박 써 보세요.',
    icon: 'grid',
  },
  line: {
    name: '줄 시험지',
    short: '줄',
    desc: '한 줄에 밑줄만 있습니다. 칸에 얽매이지 않고 길게 쓸 수 있어요.',
    guide: '잘 듣고 줄 위에 또박또박 써 보세요.',
    icon: 'rows',
  },
}

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
