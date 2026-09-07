<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { detectInApp, openInExternalBrowser } from '../lib/browser'
import PaperStage from '../components/PaperStage.vue'
import SheetPaper from '../components/SheetPaper.vue'
import { useSheetStore } from '../stores/sheets'
import { buildAutoLayout, resolveCellMm } from '../lib/sheetLayout'
import { SHEET_META, SHEET_TYPES, type CellSize, type SheetType } from '../types'

const route = useRoute()
const router = useRouter()
const store = useSheetStore()

const ready = ref(false)
const printing = ref(false)
const inApp = ref(detectInApp())

const CELL_SIZES: { value: CellSize; label: string }[] = [
  { value: 'auto', label: '자동' },
  { value: 'sm', label: '작게' },
  { value: 'md', label: '보통' },
  { value: 'lg', label: '크게' },
]

const type = computed<SheetType>(() => {
  const raw = String(route.params.type ?? '')
  return (SHEET_TYPES as string[]).includes(raw) ? (raw as SheetType) : 'listen'
})

const set = computed(() => store.current)
const options = computed(() => set.value.options)
const texts = computed(() => set.value.sentences.map((s) => s.text))

const layout = computed(() => buildAutoLayout(texts.value, type.value, options.value))
const cellMm = computed(() => resolveCellMm(texts.value, type.value, options.value))

onMounted(async () => {
  const id = String(route.params.id ?? '')
  const found = await store.open(id)
  if (!found && store.current.sentences.length === 0) {
    router.replace({ name: 'intro' })
    return
  }
  ready.value = true
})

function switchType(next: SheetType) {
  router.replace({ name: 'sheet', params: { id: set.value.id, type: next } })
}

function setCellSize(value: CellSize) {
  store.updateOptions({ cellSize: value })
  void store.persist()
}

/**
 * 머리글(이름·날짜·점수)은 항상 켠다 — 토글을 없앴다.
 * 옵션 자체는 남겨 두어 레이아웃 계산은 그대로 두고, 나중에 되살릴 여지를 남긴다.
 */
function toggleSpaceMark() {
  store.updateOptions({ showSpaceMark: !options.value.showSpaceMark })
  void store.persist()
}

/**
 * 폰트가 다 내려오기 전에 인쇄가 걸리면 칸 안 글자가 깨진다.
 * Pretendard는 dynamic subset이라 첫 인쇄에서 특히 그렇다.
 */
async function print() {
  // 인앱 브라우저에서는 print()가 조용히 무시된다. 바깥 브라우저로 보낸다
  if (inApp.value) {
    openInExternalBrowser()
    return
  }

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
  <div v-if="ready" class="sheet-view">
    <!-- 인쇄에는 나오지 않는 조작 바.
         인쇄는 여기 두지 않는다 — 어디까지 스크롤해도 따라오는 떠 있는 버튼이 맡는다 -->
    <div class="toolbar no-print">
      <div class="container toolbar-inner">
        <div class="tb-row tb-main">
          <button
            class="tb-back"
            aria-label="뒤로"
            @click="router.push({ name: 'result', params: { id: set.id } })"
          >
            <Icon name="chevron-left" :size="18" />
            <span class="tb-back-label">뒤로</span>
          </button>

          <div class="seg seg-type">
            <button
              v-for="t in SHEET_TYPES"
              :key="t"
              class="seg-btn"
              :class="{ 'is-on': t === type }"
              @click="switchType(t)"
            >
              <Icon :name="SHEET_META[t].icon" :size="15" />
              <span>{{ SHEET_META[t].short }}</span>
            </button>
          </div>
        </div>

        <div class="tb-row tb-options">
          <div class="seg seg-size">
            <button
              v-for="size in CELL_SIZES"
              :key="size.value"
              class="seg-btn"
              :class="{ 'is-on': options.cellSize === size.value }"
              @click="setCellSize(size.value)"
            >
              {{ size.label }}
            </button>
          </div>
          <button
            class="chip"
            :class="{ 'is-on': options.showSpaceMark }"
            @click="toggleSpaceMark"
          >
            ∨ 표시
          </button>
        </div>
      </div>
    </div>


    <!-- 인앱 브라우저는 window.print()를 무시한다. 눌러도 반응이 없으니 미리 안내한다 -->
    <div v-if="inApp" class="inapp-note no-print">
      <div class="container inapp-inner">
        <Icon name="printer" :size="17" />
        <p class="t-sm">
          지금 브라우저에서는 인쇄가 되지 않습니다. 크롬·사파리로 열어 주세요.
        </p>
        <button class="btn btn-ink btn-sm" @click="openInExternalBrowser()">
          브라우저로 열기
        </button>
      </div>
    </div>

    <div class="container status-bar no-print">
      <span class="status-chip">
        <Icon :name="SHEET_META[type].icon" :size="15" />
        {{ SHEET_META[type].name }}
      </span>
      <p class="t-sm t-soft">칸 {{ cellMm }}mm</p>
      <span class="status-dot" aria-hidden="true"></span>
      <p class="t-sm" :class="layout.pageCount > 1 ? 'is-warn' : 't-soft'">
        <template v-if="layout.pageCount > 1">{{ layout.pageCount }}장이 인쇄됩니다</template>
        <template v-else>A4 1장</template>
      </p>
    </div>

    <div class="container stage-wrap">
      <PaperStage :page-count="layout.pageCount">
        <SheetPaper
          v-for="(page, i) in layout.pages"
          :key="i"
          :title="set.title"
          :grade="set.grade"
          :type="type"
          :layout="layout"
          :options="options"
          :page="page"
          :page-index="i"
          :page-count="layout.pageCount"
        />
      </PaperStage>
    </div>

    <!-- 떠 있는 인쇄 버튼 — 이 시스템의 서명 요소. 어디까지 스크롤해도 따라온다 -->
    <button class="fab no-print" :disabled="printing" @click="print">
      <Icon name="printer" :size="20" />
      <span>인쇄</span>
    </button>
  </div>
</template>
