/**
 * 인앱 브라우저 감지.
 *
 * 카카오톡·인스타그램 등의 인앱 웹뷰는 window.print()를 아예 무시한다.
 * 눌러도 아무 일이 없으니 사용자는 앱이 고장 난 줄 안다.
 * 그래서 인쇄를 시도하는 대신 바깥 브라우저로 나가는 길을 안내한다.
 */

export type InApp = 'kakaotalk' | 'other' | null

export function detectInApp(ua: string = navigator.userAgent): InApp {
  if (/KAKAOTALK/i.test(ua)) return 'kakaotalk'
  // 인스타그램·페이스북·라인·네이버 앱도 같은 제약이 있다
  if (/Instagram|FBAN|FBAV|Line\/|NAVER\(inapp/i.test(ua)) return 'other'
  return null
}

/**
 * 카카오톡 인앱 브라우저를 벗어나 기본 브라우저로 같은 주소를 연다.
 * 카카오가 제공하는 스킴이라 iOS·안드로이드 모두 동작한다.
 */
export function openInExternalBrowser(url: string = window.location.href): void {
  const target = encodeURIComponent(url)
  if (detectInApp() === 'kakaotalk') {
    window.location.href = `kakaotalk://web/openExternal?url=${target}`
    return
  }
  // 그 밖의 인앱은 표준 스킴이 없다. 새 창을 시도하고, 막히면 링크 복사로 안내한다.
  window.open(url, '_blank', 'noopener')
}
