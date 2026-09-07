import { describe, expect, it } from 'vitest'
import { pdfFilename } from './pdf'

describe('PDF 파일 이름', () => {
  it('제목과 종류를 붙인다', () => {
    expect(pdfFilename('받아쓰기 9월 4일', '보고 쓰기')).toBe('받아쓰기 9월 4일 보고 쓰기.pdf')
  })

  it('파일 이름에 쓸 수 없는 글자를 걷어낸다', () => {
    // 제목은 사용자가 자유롭게 쓴다 — 날짜를 9/4처럼 적으면 경로로 잘못 읽힌다
    expect(pdfFilename('9/4 받아쓰기: 1회?', '듣고 쓰기')).toBe('94 받아쓰기 1회 듣고 쓰기.pdf')
  })

  it('제목이 비어 있어도 이름이 나온다', () => {
    expect(pdfFilename('   ', '칸 시험지')).toBe('받아쓰기 칸 시험지.pdf')
  })
})
