import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from './share'
import { createDefaultOptions, type SheetSet } from '../types'

const sample: SheetSet = {
  id: 'abc123',
  version: 1,
  title: '받아쓰기 9월 1일',
  grade: 3,
  sentences: [
    { id: 'a', text: '신나요.' },
    { id: 'b', text: '곰이 그림책을 봅니다.' },
    { id: 'c', text: '친구에게 미안했어요.' },
  ],
  createdAt: 1,
  updatedAt: 2,
  options: { ...createDefaultOptions(), cellSize: 'lg', showSpaceMark: false },
}

describe('URL 공유 (Q4)', () => {
  it('문장과 제목이 왕복해도 그대로다', () => {
    const restored = decodeShare(encodeShare(sample))
    expect(restored).not.toBeNull()
    expect(restored!.title).toBe('받아쓰기 9월 1일')
    expect(restored!.sentences.map((s) => s.text)).toEqual([
      '신나요.',
      '곰이 그림책을 봅니다.',
      '친구에게 미안했어요.',
    ])
  })

  it('급수도 함께 실린다', () => {
    expect(decodeShare(encodeShare(sample))!.grade).toBe(3)
  })

  it('급수를 고르지 않은 세트는 null로 돌아온다', () => {
    expect(decodeShare(encodeShare({ ...sample, grade: null }))!.grade).toBeNull()
  })

  it('옵션도 함께 실린다 — 받는 쪽에서 칸 크기가 달라지면 안 된다', () => {
    const restored = decodeShare(encodeShare(sample))!
    expect(restored.options.cellSize).toBe('lg')
    expect(restored.options.showSpaceMark).toBe(false)
  })

  it('받는 쪽에서는 새 ID를 받는다 — 남의 세트를 덮어쓰지 않게', () => {
    const restored = decodeShare(encodeShare(sample))!
    expect(restored.id).not.toBe(sample.id)
  })

  it('10문장 링크도 카톡으로 보낼 만한 길이다', () => {
    const ten: SheetSet = {
      ...sample,
      sentences: Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: '친구에게 미안했어요.',
      })),
    }
    expect(encodeShare(ten).length).toBeLessThan(500)
  })

  it('망가진 링크는 null을 돌려준다 — 앱이 깨지면 안 된다', () => {
    expect(decodeShare('!!!not-valid!!!')).toBeNull()
    expect(decodeShare('')).toBeNull()
  })

  it('문장이 하나도 없는 링크도 null', () => {
    expect(decodeShare(encodeShare({ ...sample, sentences: [] }))).toBeNull()
  })
})
