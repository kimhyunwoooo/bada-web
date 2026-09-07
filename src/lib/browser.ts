/**
 * 인앱 브라우저 감지와 파일 내려받기.
 *
 * 카카오톡·인스타그램 등의 인앱 웹뷰는 window.print()를 아예 무시한다.
 * 눌러도 아무 일이 없으니 사용자는 앱이 고장 난 줄 안다.
 * 그래서 인쇄 대신 PDF를 내려받게 하고, 그마저 막히면 바깥 브라우저로 안내한다.
 */

export type InApp = 'kakaotalk' | 'other' | null

export function detectInApp(ua: string = navigator.userAgent): InApp {
  if (/KAKAOTALK/i.test(ua)) return 'kakaotalk'
  // 인스타그램·페이스북·라인·네이버 앱도 같은 제약이 있다
  if (/Instagram|FBAN|FBAV|Line\/|NAVER\(inapp/i.test(ua)) return 'other'
  return null
}

export function isIos(ua: string = navigator.userAgent): boolean {
  return /iPad|iPhone|iPod/.test(ua)
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

export type SaveResult = 'downloaded' | 'opened'

/**
 * 파일을 내려받는다.
 *
 * iOS 웹뷰는 <a download>를 무시한다 — 눌러도 아무 일이 없다.
 * 그래서 iOS 인앱에서는 내려받는 대신 PDF를 화면에 띄운다.
 * 사용자는 공유 버튼으로 저장하거나 그 자리에서 인쇄할 수 있다.
 */
export function saveBlob(blob: Blob, filename: string): SaveResult {
  const url = URL.createObjectURL(blob)

  if (isIos() && detectInApp()) {
    window.location.href = url
    // 이 창이 PDF로 바뀌므로 폐기는 넉넉히 미룬다
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return 'opened'
  }

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
