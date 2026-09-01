/** 학습지 제목의 기본값 — 오늘 날짜 (Q10: 급수는 사용자가 칩으로 덮어쓴다) */
export function todayTitle(now = new Date()): string {
  return `받아쓰기 ${now.getMonth() + 1}월 ${now.getDate()}일`
}

/** 목록에 보여 주는 날짜 */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}
