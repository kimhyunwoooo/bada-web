import { ref } from 'vue'

export function useClipboard(resetMs = 2000) {
  const copied = ref(false)
  const failed = ref(false)

  async function copy(text: string): Promise<void> {
    failed.value = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // http 등 clipboard API를 못 쓰는 환경 대비
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
      }
      copied.value = true
      window.setTimeout(() => (copied.value = false), resetMs)
    } catch {
      failed.value = true
    }
  }

  return { copy, copied, failed }
}
