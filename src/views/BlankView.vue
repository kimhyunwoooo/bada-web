<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import PaperStage from '../components/PaperStage.vue'
import SheetPaper from '../components/SheetPaper.vue'
import { BLANK_CELL_COUNTS, BLANK_ROW_COUNT, buildBlankLayout } from '../lib/sheetLayout'
import { BLANK_KINDS, BLANK_META, createDefaultOptions, type BlankKind } from '../types'
import { todayTitle } from '../lib/date'

/**
 * 빈 시험지 인쇄 (문장 없이 바로 뽑아 쓰는 양식).
 *
 * 연습용 3종과 달리 저장할 것이 없다 — 세트에 매이지 않는 독립 화면이다.
 * 그래서 스토어를 쓰지 않고 화면 안에서만 상태를 들고 있는다.
 */
const router = useRouter()

const kind = ref<BlankKind>('grid')
const cellCount = ref(10)
const printing = ref(false)

/** 시험지는 이름·날짜·점수 칸이 항상 필요하다 */
const options = computed(() => ({ ...createDefaultOptions(), showSpaceMark: false }))

const layout = computed(() =>
  buildBlankLayout(BLANK_ROW_COUNT, cellCount.value, kind.value, options.value),
)

async function print() {
  printing.value = true
  try {
    if (document.fonts?.ready) await document.fonts.ready
    window.print()
  } finally {
    printing.value = false
  }
}
</script>

<template>
  <div class="sheet-view">
    <div class="toolbar no-print">
      <div class="container toolbar-inner">
        <div class="tb-row tb-main">
          <button class="tb-back" aria-label="뒤로" @click="router.push({ name: 'intro' })">
            <Icon name="chevron-left" :size="18" />
            <span class="tb-back-label">뒤로</span>
          </button>

          <div class="seg seg-type">
            <button
              v-for="k in BLANK_KINDS"
              :key="k"
              class="seg-btn"
              :class="{ 'is-on': k === kind }"
              @click="kind = k"
            >
              <Icon :name="BLANK_META[k].icon" :size="15" />
              <span>{{ BLANK_META[k].short }}</span>
            </button>
          </div>
        </div>

        <!-- 줄 시험지는 칸이 없으므로 이 줄 자체가 필요 없다 -->
        <div v-if="kind === 'grid'" class="tb-row tb-options">
          <div class="seg seg-size">
            <button
              v-for="n in BLANK_CELL_COUNTS"
              :key="n"
              class="seg-btn"
              :class="{ 'is-on': n === cellCount }"
              @click="cellCount = n"
            >
              {{ n }}칸
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="container status-bar no-print">
      <span class="status-chip">
        <Icon :name="BLANK_META[kind].icon" :size="15" />
        {{ BLANK_META[kind].name }}
      </span>
      <p class="t-sm t-muted">{{ BLANK_ROW_COUNT }}문항 · 칸 {{ layout.metrics.cellMm }}mm</p>
      <span class="status-dot" aria-hidden="true"></span>
      <p class="t-sm" :class="layout.pageCount > 1 ? 'is-warn' : 't-muted'">
        <template v-if="layout.pageCount > 1">{{ layout.pageCount }}장이 인쇄됩니다</template>
        <template v-else>A4 1장</template>
      </p>
    </div>

    <div class="container stage-wrap">
      <PaperStage :page-count="layout.pageCount">
        <SheetPaper
          v-for="(page, i) in layout.pages"
          :key="i"
          :title="todayTitle()"
          :grade="null"
          type="listen"
          :blank="kind"
          :layout="layout"
          :options="options"
          :page="page"
          :page-index="i"
          :page-count="layout.pageCount"
        />
      </PaperStage>
    </div>

    <button class="fab no-print" :disabled="printing" @click="print">
      <Icon name="printer" :size="20" />
      <span>인쇄</span>
    </button>
  </div>
</template>
