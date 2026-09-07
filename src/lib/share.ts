/**
 * URL 공유 (PLAN §8.1, Q4).
 * 세트를 압축해 ?s= 쿼리에 담는다. 로그인 없이 링크 하나로 기기 간 전달된다.
 * 받는 쪽에서 칸 크기가 달라지면 안 되므로 옵션도 함께 싣는다.
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { createDefaultOptions, type CellSize, type SheetSet } from '../types'
import { createId } from './id'

const CELL_SIZES: CellSize[] = ['auto', 'sm', 'md', 'lg']

/** URL 길이를 줄이려고 키를 한 글자로 줄인 전송용 형태 */
interface SharePayload {
  v: 1
  t: string
  /** 급수. 고르지 않았으면 0 */
  g: number
  s: string[]
  /** [칸 크기 인덱스, V 표시]. 옛 링크에는 머리글 자리가 하나 더 있으나 무시한다 */
  o: [number, 0 | 1]
}

export function encodeShare(set: SheetSet): string {
  const payload: SharePayload = {
    v: 1,
    t: set.title,
    g: set.grade ?? 0,
    s: set.sentences.map((s) => s.text),
    o: [
      Math.max(0, CELL_SIZES.indexOf(set.options.cellSize)),
      set.options.showSpaceMark ? 1 : 0,
    ],
  }
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

/** 실패하면 null. 잘린 링크·옛 링크로 앱이 깨지지 않게 한다 */
export function decodeShare(encoded: string): SheetSet | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null

    const payload = JSON.parse(json) as Partial<SharePayload>
    if (!Array.isArray(payload.s) || payload.s.length === 0) return null

    const sentences = payload.s
      .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
      .slice(0, 10)
    if (sentences.length === 0) return null

    const options = createDefaultOptions()
    if (Array.isArray(payload.o)) {
      const [size, space] = payload.o
      options.cellSize = CELL_SIZES[size] ?? 'auto'
      options.showSpaceMark = space !== 0
    }

    const now = Date.now()
    return {
      id: createId(),
      version: 1,
      title: typeof payload.t === 'string' && payload.t.trim() ? payload.t : '받아쓰기',
      grade: typeof payload.g === 'number' && payload.g >= 1 && payload.g <= 10 ? payload.g : null,
      sentences: sentences.map((text) => ({ id: createId(), text })),
      createdAt: now,
      updatedAt: now,
      options,
    }
  } catch {
    return null
  }
}

export function buildShareUrl(set: SheetSet, origin = window.location.origin): string {
  return `${origin}/?s=${encodeShare(set)}`
}

/** 부모가 폰으로 열 불러주기 화면 링크 (PLAN §3.4) */
export function buildReadUrl(set: SheetSet, origin = window.location.origin): string {
  return `${origin}/read?s=${encodeShare(set)}`
}
