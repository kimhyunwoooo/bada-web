<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
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

<style scoped>
.sheet-view {
  background: var(--canvas);
  min-height: 100vh;
  /* 떠 있는 인쇄 버튼이 종이 아래쪽을 가리지 않게 자리를 비워 둔다 */
  padding-bottom: var(--sp-7);
}

/* 도구막대도 화면에 붙지 않고 떠 있는 알약이다 */
.toolbar {
  position: sticky;
  top: 0;
  z-index: 40;
  padding: var(--sp-2) var(--gutter) 0;
  pointer-events: none;
}

.toolbar-inner {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  max-width: var(--w-content);
  padding: 8px;
  border-radius: var(--r-card);
  background: var(--white);
  box-shadow: var(--e-float);
  flex-wrap: wrap;
  pointer-events: auto;
}

.tb-row {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-width: 0;
}

.tb-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  height: 40px;
  padding: 0 14px 0 10px;
  border-radius: var(--r-pill);
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: var(--w-mid);
  transition: background-color var(--ease);
}

.tb-back:hover {
  background: var(--canvas);
}

.tb-back:active {
  transform: var(--press);
}

.seg {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--r-pill);
  background: var(--canvas);
  min-width: 0;
}

.seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 16px;
  border-radius: var(--r-pill);
  font-size: var(--fs-sm);
  font-weight: var(--w-mid);
  letter-spacing: var(--ls-btn);
  color: var(--slate);
  white-space: nowrap;
  transition: background-color var(--ease), color var(--ease);
}

.seg-btn:hover {
  color: var(--ink);
}

.seg-btn:active {
  transform: var(--press);
}

.seg-btn.is-on {
  background: var(--ink);
  color: var(--on-ink);
}

/* 넓은 화면: 한 줄. 옵션은 오른쪽 끝으로 */
@media (min-width: 768px) {
  .toolbar-inner {
    flex-wrap: nowrap;
  }

  .tb-options {
    margin-left: auto;
  }
}

/**
 * 좁은 화면: 두 줄.
 * 위는 이동(뒤로 + 타입), 아래는 표시 설정. 인쇄를 뺐기 때문에
 * 두 줄 모두 가로 스크롤 없이 들어간다.
 */
@media (max-width: 767px) {
  .tb-row {
    flex: 1 1 100%;
  }

  /* 아이콘만 남긴다 — 화살표 하나로 충분하다 */
  .tb-back {
    padding: 0;
    width: 40px;
    justify-content: center;
  }

  .tb-back-label {
    display: none;
  }

  /* 타입 전환이 이 화면의 주된 이동이므로 남는 폭을 다 준다 */
  .seg-type {
    flex: 1 1 auto;
  }

  .seg-type .seg-btn {
    flex: 1 1 0;
    padding: 6px 8px;
  }

  .seg-size {
    flex: 1 1 auto;
  }

  .seg-size .seg-btn {
    flex: 1 1 0;
    padding: 6px 8px;
  }

  .tb-options .chip {
    flex: 0 0 auto;
  }
}

.status-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding-top: var(--sp-3);
  padding-bottom: var(--sp-2);
  flex-wrap: wrap;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: var(--r-pill);
  background: var(--accent-wash);
  color: var(--clay);
  font-size: var(--fs-sm);
  font-weight: var(--w-mid);
}

.status-dot {
  width: 4px;
  height: 4px;
  border-radius: var(--r-circle);
  background: var(--taupe);
}

.is-warn {
  color: var(--error);
  font-weight: var(--w-mid);
}

.stage-wrap {
  padding-top: var(--sp-1);
}

/* ── 떠 있는 인쇄 버튼 ──────────────────────────────── */

.fab {
  position: fixed;
  right: var(--gutter);
  bottom: var(--sp-3);
  z-index: 45;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  height: 56px;
  padding: 0 26px;
  border-radius: var(--r-pill);
  background: var(--ink);
  color: var(--on-ink);
  font-size: var(--fs-body);
  font-weight: var(--w-mid);
  letter-spacing: var(--ls-btn);
  box-shadow: var(--e-card);
  transition: background-color var(--ease), transform var(--ease), box-shadow var(--ease);
}

.fab:hover {
  background: var(--charcoal);
}

.fab:active {
  transform: var(--press);
  box-shadow: var(--e-float);
}

.fab[disabled] {
  opacity: 0.5;
  pointer-events: none;
}

@media print {
  .sheet-view {
    background: #fff;
    min-height: 0;
    padding: 0;
  }

  .stage-wrap {
    padding: 0 !important;
    max-width: none;
  }
}
</style>
