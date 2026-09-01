<script setup lang="ts">
import { computed } from 'vue'

/**
 * 인라인 SVG 아이콘 세트.
 *
 * 외부 아이콘 라이브러리를 쓰지 않는다 — 자체 번들 부담 없이,
 * 선 굵기와 끝단 처리를 이 디자인 시스템에 맞춰 직접 통일하기 위해서다.
 * 모든 아이콘은 24 그리드, 1.5 굵기, 둥근 끝단, currentColor.
 */
export type IconName =
  | 'eye'
  | 'pen'
  | 'volume'
  | 'printer'
  | 'link'
  | 'qr'
  | 'clipboard'
  | 'rows'
  | 'plus'
  | 'close'
  | 'check'
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-left'
  | 'chevron-right'
  | 'copy'
  | 'sheet'
  | 'diamond'
  | 'grid'
  | 'ruler'

const PATHS: Record<IconName, string> = {
  // 보고 쓰기
  eye: '<path d="M2.5 12S6.6 5.5 12 5.5 21.5 12 21.5 12 17.4 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  // 따라 쓰기 · 수정
  pen: '<path d="M12.5 20.5H21"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.6 18.4l-4 1 1-4Z"/>',
  // 듣고 쓰기 · 불러주기
  volume:
    '<path d="M11 5 6.5 9H3.5v6h3L11 19Z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5"/><path d="M17.8 6.5a7.5 7.5 0 0 1 0 11"/>',
  printer:
    '<path d="M7 9V3.5h10V9"/><path d="M7 18.5H4.5A1.5 1.5 0 0 1 3 17v-5.5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 14.5h10v6H7Z"/>',
  link: '<path d="M10.5 13.5a4.5 4.5 0 0 0 6.8.5l2.5-2.5a4.5 4.5 0 0 0-6.4-6.4l-1.4 1.4"/><path d="M13.5 10.5a4.5 4.5 0 0 0-6.8-.5l-2.5 2.5a4.5 4.5 0 0 0 6.4 6.4l1.4-1.4"/>',
  qr: '<path d="M3.5 3.5h6v6h-6Z"/><path d="M14.5 3.5h6v6h-6Z"/><path d="M3.5 14.5h6v6h-6Z"/><path d="M14.5 14.5h2.5v2.5h-2.5Z"/><path d="M18 18h2.5v2.5H18Z"/>',
  // 여러 문장 붙여넣기
  clipboard:
    '<path d="M9.5 3.5h5v2.5h-5Z"/><path d="M14.5 4.75H17A1.5 1.5 0 0 1 18.5 6.25V19A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V6.25A1.5 1.5 0 0 1 7 4.75h2.5"/><path d="M9 11h6"/><path d="M9 14.5h6"/><path d="M9 18h3.5"/>',
  // 한 문장씩 입력
  rows: '<path d="M4 6.5h.01"/><path d="M4 12h.01"/><path d="M4 17.5h.01"/><path d="M8.5 6.5H20"/><path d="M8.5 12H20"/><path d="M8.5 17.5H20"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  'arrow-left': '<path d="M19.5 12H4.5"/><path d="m10.5 18-6-6 6-6"/>',
  'arrow-right': '<path d="M4.5 12h15"/><path d="m13.5 6 6 6-6 6"/>',
  'chevron-left': '<path d="m14.5 5.5-6 6.5 6 6.5"/>',
  'chevron-right': '<path d="m9.5 5.5 6 6.5-6 6.5"/>',
  copy: '<path d="M8.5 8.5h11v12h-11Z"/><path d="M15.5 5.5v-2h-11v12h2"/>',
  sheet:
    '<path d="M6 3.5h8l4 4v13H6Z"/><path d="M14 3.5v4h4"/><path d="M9 12h6"/><path d="M9 15.5h6"/>',
  // 금색 작은 강조 표식 (배지 대신)
  diamond: '<path d="M12 3.5 16.5 12 12 20.5 7.5 12Z"/>',
  grid: '<path d="M3.5 4.5h7v7h-7Z"/><path d="M13.5 4.5h7v7h-7Z"/><path d="M3.5 14.5h7v5h-7Z"/><path d="M13.5 14.5h7v5h-7Z"/>',
  // 칸 크기를 맞추는 동작
  ruler:
    '<path d="M3.5 8.5h17v7h-17Z"/><path d="M7 8.5v3"/><path d="M10.5 8.5v4.5"/><path d="M14 8.5v3"/><path d="M17.5 8.5v4.5"/>',
}

const props = withDefaults(
  defineProps<{ name: IconName; size?: number | string; stroke?: number }>(),
  { size: 20, stroke: 1.5 },
)

const inner = computed(() => PATHS[props.name] ?? '')
const px = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <svg
    class="icon"
    :style="{ width: px, height: px }"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="stroke"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="inner"
  />
</template>

<style scoped>
.icon {
  display: block;
  flex: 0 0 auto;
}
</style>
