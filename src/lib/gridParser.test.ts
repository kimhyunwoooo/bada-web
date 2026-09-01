import { describe, expect, it } from 'vitest'
import { countCells, countSpaces, normalize, parseSentence } from './gridParser'

/** PLAN §2의 표를 그대로 테스트로 옮긴 것 — 첨부 학습지 이미지에서 역산한 기준값 */
describe('첨부 이미지에서 역산한 기준 문장', () => {
  it('신나요. → 4칸, V 없음', () => {
    expect(countCells('신나요.')).toBe(4)
    expect(countSpaces('신나요.')).toBe(0)
    expect(parseSentence('신나요.')).toEqual([
      { cells: ['신', '나', '요', '.'], trailingSpace: false },
    ])
  })

  it('예쁘게 말해요. → 7칸 + V 1개', () => {
    expect(countCells('예쁘게 말해요.')).toBe(7)
    expect(countSpaces('예쁘게 말해요.')).toBe(1)
    expect(parseSentence('예쁘게 말해요.')).toEqual([
      { cells: ['예', '쁘', '게'], trailingSpace: true },
      { cells: ['말', '해', '요', '.'], trailingSpace: false },
    ])
  })

  it('곰이 그림책을 봅니다. → 10칸 + V 2개', () => {
    expect(countCells('곰이 그림책을 봅니다.')).toBe(10)
    expect(countSpaces('곰이 그림책을 봅니다.')).toBe(2)
  })

  it('동실동실 → 4칸, 부호 없음', () => {
    expect(countCells('동실동실')).toBe(4)
    expect(countSpaces('동실동실')).toBe(0)
  })

  it('친구에게 미안했어요. → 10칸 + V 1개', () => {
    expect(countCells('친구에게 미안했어요.')).toBe(10)
    expect(countSpaces('친구에게 미안했어요.')).toBe(1)
  })
})

describe('R1 — 글자 1개 = 칸 1개', () => {
  it('숫자와 영문자도 한 칸씩 차지한다', () => {
    expect(countCells('3반 ok')).toBe(4)
  })
})

describe('R2 — 문장부호도 독립된 한 칸', () => {
  it('물음표', () => {
    expect(countCells('갈까?')).toBe(3)
  })

  it('느낌표', () => {
    expect(countCells('얼음처럼 꽁꽁!')).toBe(7)
  })

  it('여는 따옴표도 한 칸을 차지한다', () => {
    expect(parseSentence('"안녕?"')).toEqual([
      { cells: ['"', '안', '녕', '?', '"'], trailingSpace: false },
    ])
  })
})

describe('R3 — 띄어쓰기는 칸이 아니다', () => {
  it('공백은 칸 수에 포함되지 않는다', () => {
    expect(countCells('가 나 다')).toBe(3)
    expect(countSpaces('가 나 다')).toBe(2)
  })

  it('마지막 어절에는 V가 붙지 않는다', () => {
    const words = parseSentence('가 나')
    expect(words[0].trailingSpace).toBe(true)
    expect(words[1].trailingSpace).toBe(false)
  })
})

describe('R6 — 닫는 부호는 앞 어절에 매달린다', () => {
  it('부호 앞의 공백을 제거해 앞 어절에 붙인다', () => {
    expect(parseSentence('봅니다 .')).toEqual([
      { cells: ['봅', '니', '다', '.'], trailingSpace: false },
    ])
  })

  it('쉼표도 마찬가지', () => {
    expect(normalize('가 , 나')).toBe('가, 나')
  })

  it('여는 부호는 뒤 어절에 붙는다', () => {
    expect(normalize('( 가나 )')).toBe('(가나)')
  })
})

describe('입력 정규화', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalize('  가나  ')).toBe('가나')
  })

  it('연속 공백을 하나로 줄인다', () => {
    expect(normalize('가    나')).toBe('가 나')
  })

  it('탭과 줄바꿈도 공백으로 취급한다', () => {
    expect(normalize('가\t\n나')).toBe('가 나')
  })

  it('빈 문자열은 빈 배열', () => {
    expect(parseSentence('   ')).toEqual([])
    expect(countCells('')).toBe(0)
  })
})
