/**
 * 세트 저장소 (PLAN §9).
 *
 * 1차는 localStorage지만 인터페이스는 처음부터 async로 둔다.
 * 2차에서 서버 저장으로 갈 때 이 파일만 갈아끼우면 되고, 호출부는 손대지 않는다.
 */

import type { SheetSet } from '../types'
import { createDefaultOptions } from '../types'

const STORAGE_KEY = 'bada.sheets.v1'
const MAX_SETS = 30

function readAll(): SheetSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSheetSet).map(migrate)
  } catch {
    // 사생활 보호 모드·저장소 차단 등에서 예외가 난다. 앱은 계속 동작해야 한다.
    return []
  }
}

function writeAll(sets: SheetSet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets.slice(0, MAX_SETS)))
  } catch {
    /* 저장 실패해도 화면은 계속 쓸 수 있어야 한다 */
  }
}

function isSheetSet(value: unknown): value is SheetSet {
  if (typeof value !== 'object' || value === null) return false
  const set = value as Partial<SheetSet>
  return typeof set.id === 'string' && Array.isArray(set.sentences)
}

/** 옛 스키마를 현재 형태로 끌어올린다 — version 필드를 처음부터 둔 이유 */
function migrate(set: SheetSet): SheetSet {
  return {
    ...set,
    version: 1,
    title: set.title ?? '받아쓰기',
    grade: set.grade ?? null,
    createdAt: set.createdAt ?? Date.now(),
    updatedAt: set.updatedAt ?? set.createdAt ?? Date.now(),
    options: { ...createDefaultOptions(), ...(set.options ?? {}) },
  }
}

export const sheetRepository = {
  async list(): Promise<SheetSet[]> {
    return readAll().sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async get(id: string): Promise<SheetSet | null> {
    return readAll().find((set) => set.id === id) ?? null
  },

  async save(set: SheetSet): Promise<SheetSet> {
    const sets = readAll()
    const index = sets.findIndex((s) => s.id === set.id)
    const next = { ...set, updatedAt: Date.now() }
    if (index >= 0) sets[index] = next
    else sets.unshift(next)
    writeAll(sets.sort((a, b) => b.updatedAt - a.updatedAt))
    return next
  },

  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((set) => set.id !== id))
  },
}
