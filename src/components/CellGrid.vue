<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutLine, SheetMetrics } from '../lib/sheetLayout'

/**
 * 칸 격자 (PLAN §2).
 * 줄바꿈은 이미 sheetLayout이 확정했다. 여기서는 받은 줄을 그대로 그리기만 한다 —
 * flex-wrap에 맡기면 화면과 인쇄가 어긋난다.
 */
const props = defineProps<{
  lines: LayoutLine[]
  metrics: SheetMetrics
  /** empty = 빈칸, trace = 옅은 글자, answer = 작은 답안 칸 */
  variant: 'empty' | 'trace' | 'answer'
  showSpaceMark: boolean
}>()

const cellMm = computed(() =>
  props.variant === 'answer' ? props.metrics.answerCellMm : props.metrics.cellMm,
)

const style = computed(() => ({
  '--cell': `${cellMm.value}mm`,
  '--gap': `${props.metrics.cellGapMm}mm`,
  '--space': `${props.metrics.spaceMarkMm}mm`,
  '--font': `${cellMm.value * 0.62}mm`,
}))

const showText = computed(() => props.variant !== 'empty')
</script>

<template>
  <div class="grid" :style="style" :class="`is-${variant}`">
    <div v-for="(line, li) in lines" :key="li" class="line">
      <span v-for="(word, wi) in line" :key="wi" class="word">
        <span v-for="(char, ci) in word.cells" :key="ci" class="cell">
          <span v-if="showText" class="char">{{ char }}</span>
        </span>
        <span v-if="word.trailingSpace && showSpaceMark" class="space" aria-hidden="true">∨</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: flex;
  flex-direction: column;
  gap: 2.5mm;
}

.line {
  display: flex;
  align-items: center;
  /* 어절은 절대 쪼개지지 않는다 (R4) */
  flex-wrap: nowrap;
}

.word {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.cell {
  width: var(--cell);
  height: var(--cell);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 종이는 토큰 밖에 있다 — 인쇄에서 확실히 나오는 진한 검정 */
  border: 0.35mm solid #1a1a1a;
  border-radius: 0.6mm;
  background: #fff;
}

.cell + .cell {
  margin-left: var(--gap);
}

.char {
  /* 종이는 언제나 고딕이다 — 아이가 따라 쓸 획 형태가 무너지면 안 된다 */
  font-family: var(--font-paper);
  font-size: var(--font);
  line-height: 1;
  font-weight: 400;
  letter-spacing: 0;
}

/* 띄어쓰기 표시 — 칸이 아니라 칸 사이의 기호다 (R3) */
.space {
  width: var(--space);
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  align-self: stretch;
  padding-bottom: 1mm;
  color: var(--mark-space);
  font-family: var(--font-paper);
  font-size: calc(var(--cell) * 0.42);
  line-height: 1;
  font-weight: 600;
}

/* 따라 쓰기: opacity가 아니라 색으로 흐리게 한다 (PLAN §5) */
.is-trace .char {
  color: var(--mark-trace);
  font-weight: 300;
}

/* 보고 쓰기의 답안 칸 — 작고 옅은 배경 */
.is-answer .cell {
  border-width: 0.25mm;
  border-color: #d8d6d3;
  border-radius: 0.5mm;
  background: #f5f5f4;
}

.is-answer .char {
  color: #333;
  font-weight: 600;
}

.is-answer .space {
  padding-bottom: 0.4mm;
}
</style>
