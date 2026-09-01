/**
 * 칸 나누기 규칙 (PLAN §2 R1~R6) — 이 제품의 심장.
 *
 * R1. 글자 1개 = 칸 1개 (한글 음절·숫자·영문자 동일)
 * R2. 문장부호도 독립된 한 칸
 * R3. 띄어쓰기는 칸이 아니라 칸 사이의 V 마커
 * R4. 줄바꿈은 어절 단위로만 (어절이 두 줄로 쪼개지지 않음)
 * R5. 한 줄 최대 슬롯 수는 용지 폭에서 역산 → sheetLayout.ts
 * R6. 닫는 문장부호가 줄 첫머리에 오면 이전 줄 끝에 매단다
 *
 * 이 파일은 순수 함수만 둔다. DOM·Vue 의존 금지.
 */

/** 앞 글자에 붙어야 하는 닫는 부호 — 줄 첫머리에 올 수 없다 (R6) */
const CLOSING = '.,!?;:…)]}”’」』'
/** 뒤 글자에 붙어야 하는 여는 부호 — 줄 끝에 홀로 남을 수 없다 */
const OPENING = '([{“‘「『'

const CLOSING_RE = new RegExp(`\\s+([${escapeClass(CLOSING)}])`, 'g')
const OPENING_RE = new RegExp(`([${escapeClass(OPENING)}])\\s+`, 'g')

function escapeClass(chars: string): string {
  return chars.replace(/[\\\]^-]/g, '\\$&')
}

/**
 * 입력 정규화 (PLAN §2).
 * 앞뒤 공백 제거, 연속 공백 축약, 그리고 R6의 실제 구현 —
 * 부호 앞뒤의 공백을 없애 부호가 어절에서 떨어져 나가지 않게 한다.
 */
export function normalize(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(CLOSING_RE, '$1')
    .replace(OPENING_RE, '$1')
    .trim()
}

export interface ParsedWord {
  /** 이 어절이 차지하는 칸들. 글자 하나가 한 칸 (R1, R2) */
  cells: string[]
  /** 뒤에 띄어쓰기 V 마커가 붙는가 (R3). 문장 마지막 어절이면 false */
  trailingSpace: boolean
}

/**
 * 문장을 어절 단위로 쪼갠다 (R4).
 * 어절은 절대 쪼개지지 않는 최소 단위이므로, 어절 단위로만 줄을 바꾸면
 * R4와 R6이 동시에 만족된다.
 */
export function parseSentence(text: string): ParsedWord[] {
  const normalized = normalize(text)
  if (!normalized) return []

  const chunks = normalized.split(' ').filter(Boolean)
  return chunks.map((chunk, i) => ({
    cells: Array.from(chunk),
    trailingSpace: i < chunks.length - 1,
  }))
}

/** 문장이 차지하는 총 칸 수. 띄어쓰기는 칸이 아니므로 세지 않는다 (R3) */
export function countCells(text: string): number {
  return parseSentence(text).reduce((sum, w) => sum + w.cells.length, 0)
}

/** 띄어쓰기(V 마커) 개수 */
export function countSpaces(text: string): number {
  return parseSentence(text).filter((w) => w.trailingSpace).length
}
