import { describe, expect, it } from 'vitest'
import { countBulk, parseBulk, stripLeadingMarker } from './bulkInput'

describe('앞머리 번호 제거 (Q9)', () => {
  it('1. 형태', () => {
    expect(stripLeadingMarker('1. 신나요.')).toBe('신나요.')
  })

  it('1) 형태', () => {
    expect(stripLeadingMarker('1) 신나요.')).toBe('신나요.')
  })

  it('(1) 형태', () => {
    expect(stripLeadingMarker('(1) 신나요.')).toBe('신나요.')
  })

  it('두 자리 번호', () => {
    expect(stripLeadingMarker('10. 친구에게 미안했어요.')).toBe('친구에게 미안했어요.')
  })

  it('원문자', () => {
    expect(stripLeadingMarker('① 신나요.')).toBe('신나요.')
  })

  it('불릿', () => {
    expect(stripLeadingMarker('- 신나요.')).toBe('신나요.')
  })

  it('번호가 없으면 그대로 둔다', () => {
    expect(stripLeadingMarker('신나요.')).toBe('신나요.')
  })

  it('문장이 숫자로 시작해도 지우지 않는다 — 구분자가 있어야만 번호로 본다', () => {
    expect(stripLeadingMarker('3반 친구들과 놀아요.')).toBe('3반 친구들과 놀아요.')
    expect(stripLeadingMarker('5일 뒤에 만나요.')).toBe('5일 뒤에 만나요.')
  })

  it('문장 안의 마침표는 건드리지 않는다', () => {
    expect(stripLeadingMarker('2. 곰이 그림책을 봅니다.')).toBe('곰이 그림책을 봅니다.')
  })
})

describe('여러 줄 분리', () => {
  it('카톡에서 복사한 급수표 형태', () => {
    const pasted = `1. 신나요.
2. 뿌듯해요.
3. 동실동실`
    expect(parseBulk(pasted)).toEqual(['신나요.', '뿌듯해요.', '동실동실'])
  })

  it('빈 줄은 버린다', () => {
    expect(parseBulk('가\n\n\n나')).toEqual(['가', '나'])
  })

  it('윈도우 줄바꿈도 처리한다', () => {
    expect(parseBulk('가\r\n나')).toEqual(['가', '나'])
  })

  it('10문장을 넘으면 잘라낸다', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `${i + 1}. 문장${i + 1}`).join('\n')
    expect(parseBulk(twelve)).toHaveLength(10)
    expect(countBulk(twelve)).toBe(12)
  })

  it('빈 입력은 빈 배열', () => {
    expect(parseBulk('')).toEqual([])
    expect(parseBulk('   \n  ')).toEqual([])
  })
})
