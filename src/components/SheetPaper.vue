<script setup lang="ts">
import { computed } from 'vue'
import CellGrid from './CellGrid.vue'
import { PAGE, type SheetLayout, type SheetPage } from '../lib/sheetLayout'
import { SHEET_META, type SheetOptions, type SheetType } from '../types'

/** A4 한 장. 화면 미리보기와 인쇄가 같은 컴포넌트를 쓴다 */
const props = defineProps<{
  title: string
  grade: number | null
  type: SheetType
  layout: SheetLayout
  options: SheetOptions
  page: SheetPage
  pageIndex: number
  pageCount: number
}>()

const meta = computed(() => SHEET_META[props.type])
</script>

<template>
  <div
    class="paper"
    :style="{
      '--page-w': `${PAGE.widthMm}mm`,
      '--page-h': `${PAGE.heightMm}mm`,
      '--page-margin': `${PAGE.marginMm}mm`,
      '--item-gap': `${page.itemGapMm}mm`,
      '--number-col': `${layout.metrics.numberColMm}mm`,
      '--answer-gap': `${layout.metrics.answerGapMm}mm`,
      '--title-h': `${PAGE.titleMm}mm`,
      '--header-h': `${PAGE.headerMm}mm`,
      '--guide-h': `${PAGE.guideMm}mm`,
    }"
  >
    <header class="paper-title">
      <span v-if="grade" class="grade">{{ grade }}급</span>
      <h1 class="title">{{ title }}</h1>
      <span class="type">{{ meta.name }}</span>
      <span v-if="pageCount > 1" class="page-no">{{ pageIndex + 1 }} / {{ pageCount }}</span>
    </header>

    <div v-if="options.showHeader" class="paper-header">
      <span class="field">이름 <i></i></span>
      <span class="field">날짜 <i></i></span>
      <span class="field is-score">점수 <i></i></span>
    </div>

    <p class="paper-guide">
      <b>★</b> {{ meta.guide }}
      <template v-if="options.showSpaceMark">
        네모 칸 사이의 <b class="v">∨</b> 는 띄어쓰기예요.
      </template>
      문장부호(. , ! ?)도 한 칸에 써 주세요.
    </p>

    <ol class="paper-items">
      <li v-for="item in page.items" :key="item.index" class="sheet-item">
        <span class="no">{{ item.index }}</span>
        <div class="rows">
          <!-- 보고 쓰기: 답안 줄이 쓰기 줄 위에 얹힌다 -->
          <template v-if="type === 'see'">
            <div v-for="(line, li) in item.lines" :key="li" class="see-line">
              <CellGrid
                :lines="[line]"
                :metrics="layout.metrics"
                variant="answer"
                :show-space-mark="options.showSpaceMark"
              />
              <CellGrid
                :lines="[line]"
                :metrics="layout.metrics"
                variant="empty"
                :show-space-mark="options.showSpaceMark"
              />
            </div>
          </template>

          <CellGrid
            v-else
            :lines="item.lines"
            :metrics="layout.metrics"
            :variant="type === 'trace' ? 'trace' : 'empty'"
            :show-space-mark="options.showSpaceMark"
          />
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.paper {
  width: var(--page-w);
  height: var(--page-h);
  padding: var(--page-margin);
  /* 종이는 크림색이 아니라 흰색이다 — 배경색을 인쇄하면 잉크만 먹고 지저분해진다 */
  background: #fff;
  color: #1c1917;
  /* 학습지 전체가 고딕. UI의 명조가 종이로 새어 들어오면 안 된다 */
  font-family: var(--font-paper);
  letter-spacing: 0;
  border-radius: 2px;
  /* 화면 위의 "제품"은 이 종이다 */
  box-shadow: var(--e-paper);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.paper-title {
  display: flex;
  align-items: baseline;
  gap: 3mm;
  height: var(--title-h);
  flex: 0 0 auto;
  border-bottom: 0.4mm solid #1c1917;
  padding-bottom: 1.5mm;
}

/* 종이는 토큰 밖에 있다 — 인쇄에서 확실히 나오는 고정값 */
.grade {
  align-self: center;
  padding: 0.6mm 2.2mm;
  border: 0.3mm solid #1a1a1a;
  border-radius: 99mm;
  font-size: 3.2mm;
  font-weight: 700;
  line-height: 1.3;
}

.title {
  font-size: 5mm;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.type {
  font-size: 3.4mm;
  font-weight: 600;
  color: #7a7a7a;
}

.page-no {
  margin-left: auto;
  font-size: 3mm;
  color: #7a7a7a;
}

.paper-header {
  display: flex;
  gap: 6mm;
  align-items: center;
  height: var(--header-h);
  flex: 0 0 auto;
  font-size: 3.4mm;
  color: #333;
}

.field {
  display: flex;
  align-items: baseline;
  gap: 2mm;
}

.field i {
  display: block;
  width: 32mm;
  border-bottom: 0.3mm solid #c8c6c3;
}

.field.is-score i {
  width: 18mm;
}

.paper-guide {
  height: var(--guide-h);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 1mm;
  font-size: 3mm;
  line-height: 1.3;
  color: #333;
}

.paper-guide b {
  font-weight: 600;
}

.paper-guide .v {
  color: var(--mark-space);
}

.paper-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--item-gap);
  flex: 1 1 auto;
  min-height: 0;
}

.sheet-item {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

.no {
  width: var(--number-col);
  flex: 0 0 auto;
  font-size: 3.6mm;
  font-weight: 600;
  color: #7a7a7a;
  line-height: 1.6;
}

.rows {
  flex: 1 1 auto;
  min-width: 0;
}

.see-line {
  display: flex;
  flex-direction: column;
  gap: var(--answer-gap);
}

.see-line + .see-line {
  margin-top: 2.5mm;
}
</style>
