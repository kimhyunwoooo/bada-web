import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createDefaultOptions, type SheetOptions, type SheetSet } from '../types'
import { createId } from '../lib/id'
import { sheetRepository } from '../lib/storage'
import { MAX_SENTENCES } from '../lib/bulkInput'
import { todayTitle } from '../lib/date'

export function createEmptySet(): SheetSet {
  const now = Date.now()
  return {
    id: createId(),
    version: 1,
    title: todayTitle(),
    grade: null,
    sentences: [],
    createdAt: now,
    updatedAt: now,
    options: createDefaultOptions(),
  }
}

export const useSheetStore = defineStore('sheets', () => {
  /** 저장된 세트 목록 */
  const sets = ref<SheetSet[]>([])
  /** 지금 만들고 있거나 보고 있는 세트 */
  const current = ref<SheetSet>(createEmptySet())
  const loaded = ref(false)

  const recent = computed(() => sets.value.slice(0, 6))

  async function loadAll(): Promise<void> {
    sets.value = await sheetRepository.list()
    loaded.value = true
  }

  /** 저장본 → 없으면 메모리의 current → 그래도 없으면 null */
  async function open(id: string): Promise<SheetSet | null> {
    if (current.value.id === id) return current.value
    const found = await sheetRepository.get(id)
    if (found) current.value = found
    return found
  }

  function startNew(): void {
    current.value = createEmptySet()
  }

  function startFrom(texts: string[], title?: string): void {
    const set = createEmptySet()
    set.sentences = texts.slice(0, MAX_SENTENCES).map((text) => ({ id: createId(), text }))
    if (title) set.title = title
    current.value = set
  }

  /** 세트 복제 (PLAN §8.2) — 받아쓰기는 매주 반복되는 일이다 */
  function duplicate(set: SheetSet): SheetSet {
    const now = Date.now()
    const copy: SheetSet = {
      ...set,
      id: createId(),
      title: `${set.title} 사본`,
      sentences: set.sentences.map((s) => ({ id: createId(), text: s.text })),
      createdAt: now,
      updatedAt: now,
      options: { ...set.options },
    }
    current.value = copy
    return copy
  }

  async function persist(set: SheetSet = current.value): Promise<void> {
    const saved = await sheetRepository.save(set)
    current.value = saved
    await loadAll()
  }

  async function remove(id: string): Promise<void> {
    await sheetRepository.remove(id)
    await loadAll()
  }

  function updateOptions(patch: Partial<SheetOptions>): void {
    current.value = {
      ...current.value,
      options: { ...current.value.options, ...patch },
      updatedAt: Date.now(),
    }
  }

  /** 링크로 들어온 세트를 받아들인다 */
  function adopt(set: SheetSet): void {
    current.value = set
  }

  return {
    sets,
    current,
    loaded,
    recent,
    loadAll,
    open,
    startNew,
    startFrom,
    duplicate,
    persist,
    remove,
    updateOptions,
    adopt,
  }
})
