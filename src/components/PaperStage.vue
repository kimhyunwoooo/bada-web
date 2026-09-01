<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PAGE } from '../lib/sheetLayout'

/**
 * A4 종이를 화면 폭에 맞춰 축소해 보여준다 (반응형).
 * A4는 96dpi 기준 794px이라 휴대폰 화면에 그대로 들어가지 않는다.
 * 인쇄할 때는 print.css가 이 축척을 되돌려 항상 1:1로 나간다.
 */
const props = withDefaults(defineProps<{ pageCount: number; gapMm?: number }>(), { gapMm: 10 })

const MM_PX = 96 / 25.4
const PAPER_W_PX = PAGE.widthMm * MM_PX

const stage = ref<HTMLElement | null>(null)
const scale = ref(1)
let observer: ResizeObserver | null = null

/** 종이 장수로 자연 높이를 계산한다 — 실제 DOM을 재지 않아도 정확하다 */
const naturalHeightPx = computed(
  () => (props.pageCount * PAGE.heightMm + (props.pageCount - 1) * props.gapMm) * MM_PX,
)

const stageHeight = computed(() => `${Math.ceil(naturalHeightPx.value * scale.value)}px`)
const slotWidth = computed(() => `${Math.ceil(PAPER_W_PX * scale.value)}px`)

function measure() {
  const el = stage.value
  if (!el) return
  scale.value = Math.min(1, el.clientWidth / PAPER_W_PX)
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && stage.value) {
    observer = new ResizeObserver(measure)
    observer.observe(stage.value)
  } else {
    window.addEventListener('resize', measure)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', measure)
})

defineExpose({ scale })
</script>

<template>
  <div ref="stage" class="paper-stage">
    <!-- 축소된 종이는 레이아웃 폭이 그대로 남으므로, 자리를 따로 잡아 가운데 정렬한다 -->
    <div
      class="paper-slot"
      :style="{ width: slotWidth, height: stageHeight }"
    >
      <div
        class="paper-scaler"
        :style="{
          transform: `scale(${scale})`,
          width: `${PAPER_W_PX}px`,
          '--paper-gap': `${gapMm}mm`,
        }"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.paper-stage {
  width: 100%;
  display: flex;
  justify-content: center;
}

.paper-slot {
  position: relative;
}

.paper-scaler {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  display: flex;
  flex-direction: column;
  gap: var(--paper-gap);
}
</style>
