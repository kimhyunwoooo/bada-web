/**
 * 붙여넣기 일괄 입력 (PLAN §4.2, Q9).
 *
 * 부모는 문장을 창작하지 않는다. 학교 알림장·학급 카톡으로 받은 급수표를 옮겨 적을 뿐이다.
 * 그래서 "1. 신나요." 같은 앞머리 번호를 자동으로 떼어낸다.
 */

export const MAX_SENTENCES = 10

/**
 * 앞머리 번호 패턴.
 * 숫자는 반드시 구분자(`.` `)` `]`)를 동반해야 제거한다 —
 * "3반 친구"의 `3`을 번호로 오인하면 안 되기 때문.
 */
const LEADING_MARKERS: RegExp[] = [
  /^\(?\d{1,2}\s*[).\]]\s*/, //  1.  1)  (1)  10.
  /^[①-⑳]\s*/, //  ①
  /^[-•*·]\s+/, //  - 신나요
]

export function stripLeadingMarker(line: string): string {
  let result = line.trim()
  for (const pattern of LEADING_MARKERS) {
    const stripped = result.replace(pattern, '')
    if (stripped !== result) {
      result = stripped.trim()
      break
    }
  }
  return result
}

/** 붙여넣은 여러 줄을 문장 배열로 나눈다 */
export function parseBulk(input: string, limit = MAX_SENTENCES): string[] {
  return input
    .split(/\r?\n/)
    .map(stripLeadingMarker)
    .filter((line) => line.length > 0)
    .slice(0, limit)
}

/** 붙여넣기로 받아들일 문장이 몇 개인지 (잘림 안내용) */
export function countBulk(input: string): number {
  return input
    .split(/\r?\n/)
    .map(stripLeadingMarker)
    .filter((line) => line.length > 0).length
}
