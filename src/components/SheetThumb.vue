<script setup lang="ts">
import { computed } from 'vue'
import CellGrid from './CellGrid.vue'
import { buildMetrics, layoutWords, type SheetMetrics } from '../lib/sheetLayout'
import { parseSentence } from '../lib/gridParser'
import type { SheetType } from '../types'

/** 인트로·결과 화면에서 학습지 모양을 미리 보여주는 축소 견본 */
const props = withDefaults(
  defineProps<{
    type: SheetType
    texts: string[]
    cellMm?: number
    widthMm?: number
    /** 보여줄 문항 수. 견본이므로 한 줄이면 충분하다 */
    rows?: number
  }>(),
  { cellMm: 5, widthMm: 70, rows: 1 },
)

const metrics = computed<SheetMetrics>(() => ({
  ...buildMetrics(props.cellMm),
  cellsWidthMm: props.widthMm,
}))

const lineGroups = computed(() =>
  props.texts.slice(0, props.rows).map((text) => {
    const lines = layoutWords(parseSentence(text), metrics.value, true)
    const first = lines[0] ?? []
    // 견본은 첫 줄만 보여준다. 잘린 자리에 V만 덩그러니 남으면 오히려 헷갈리므로 떼어낸다
    if (lines.length > 1 && first.length > 0) {
      const last = first[first.length - 1]
      return [[...first.slice(0, -1), { ...last, trailingSpace: false }]]
    }
    return [first]
  }),
)
</script>

<template>
  <div class="thumb">
    <div v-for="(lines, i) in lineGroups" :key="i" class="thumb-row">
      <template v-if="type === 'see'">
        <CellGrid :lines="lines" :metrics="metrics" variant="answer" :show-space-mark="true" />
        <CellGrid :lines="lines" :metrics="metrics" variant="empty" :show-space-mark="true" />
      </template>
      <CellGrid
        v-else
        :lines="lines"
        :metrics="metrics"
        :variant="type === 'trace' ? 'trace' : 'empty'"
        :show-space-mark="true"
      />
    </div>
  </div>
</template>

<style scoped>
.thumb {
  display: flex;
  flex-direction: column;
  gap: 3mm;
}

.thumb-row {
  display: flex;
  flex-direction: column;
  gap: 1.2mm;
}
</style>
