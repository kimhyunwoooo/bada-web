<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import SheetThumb from '../components/SheetThumb.vue'
import GradeTag from '../components/GradeTag.vue'
import QrPanel from '../components/QrPanel.vue'
import { useSheetStore } from '../stores/sheets'
import { useClipboard } from '../composables/useClipboard'
import { buildReadUrl, buildShareUrl } from '../lib/share'
import { SHEET_META, type SheetType } from '../types'

const route = useRoute()
const router = useRouter()
const store = useSheetStore()
const { copy, copied } = useClipboard()

const ready = ref(false)
const showQr = ref(false)

/** 서비스 이름이 "잘들어"인 만큼 듣고 쓰기를 앞에 세운다 */
const order: SheetType[] = ['listen', 'trace', 'see']

const set = computed(() => store.current)
const texts = computed(() => set.value.sentences.map((s) => s.text))
const shareUrl = computed(() => buildShareUrl(set.value))
const readUrl = computed(() => buildReadUrl(set.value))

onMounted(async () => {
  const id = String(route.params.id ?? '')
  const found = await store.open(id)
  if (!found && store.current.sentences.length === 0) {
    router.replace({ name: 'intro' })
    return
  }
  ready.value = true
})

function openSheet(type: SheetType) {
  router.push({ name: 'sheet', params: { id: set.value.id, type } })
}

function openRead() {
  router.push({ name: 'read', params: { id: set.value.id } })
}

function edit() {
  router.push({ name: 'create' })
}

function duplicate() {
  store.duplicate(set.value)
  router.push({ name: 'create' })
}

/**
 * 삭제는 되돌릴 수 없다 (브라우저 저장소에만 있고 휴지통이 없다).
 * 그래서 한 번 더 묻는다 — 대화상자를 띄우는 대신 버튼 자리에서 바로 확인받는다.
 */
const confirmingDelete = ref(false)

function askDelete() {
  confirmingDelete.value = true
}

function cancelDelete() {
  confirmingDelete.value = false
}

async function remove() {
  await store.remove(set.value.id)
  router.replace({ name: 'intro' })
}
</script>

<template>
  <div v-if="ready" class="page">
    <div class="container">
      <header class="page-head">
        <div>
          <div class="head-line">
            <GradeTag :grade="set.grade" />
            <h1 class="t-h1 head-title">{{ set.title }}</h1>
          </div>
          <p class="t-lead t-muted">문장 {{ set.sentences.length }}개</p>
        </div>
        <div class="row head-actions">
          <template v-if="confirmingDelete">
            <span class="confirm-ask t-sm">이 받아쓰기를 지울까요?</span>
            <button class="btn btn-danger btn-sm" @click="remove">
              <Icon name="trash" :size="15" />
              삭제
            </button>
            <button class="btn btn-outline btn-sm" @click="cancelDelete">취소</button>
          </template>

          <template v-else>
            <button class="btn btn-outline btn-sm" @click="edit">
              <Icon name="pen" :size="15" />
              문장 수정
            </button>
            <button class="btn btn-outline btn-sm" @click="duplicate">
              <Icon name="copy" :size="15" />
              복제
            </button>
            <button class="btn btn-quiet btn-sm delete-btn" @click="askDelete">
              <Icon name="trash" :size="15" />
              삭제
            </button>
          </template>
        </div>
      </header>

      <section class="block">
        <ul class="cards">
          <li v-for="type in order" :key="type">
            <!-- 카드 전체가 하나의 클릭 대상. 위성 화살표는 그 표식이다 -->
            <button class="card card-hover sheet-card" @click="openSheet(type)">
              <span class="card-top">
                <span class="card-icon"><Icon :name="SHEET_META[type].icon" :size="22" /></span>
                <span class="satellite"><Icon name="arrow-right" :size="18" /></span>
              </span>

              <span class="eyebrow">{{ SHEET_META[type].level }}</span>
              <span class="t-h3 card-title">{{ SHEET_META[type].name }}</span>
              <span class="t-sm t-muted card-desc">{{ SHEET_META[type].desc }}</span>

              <span class="card-figure">
                <!-- 견본 칸을 크게. 폭은 좁은 화면에서 잘리지 않는 선(78mm ≈ 295px)에 맞춘다 -->
                <SheetThumb :type="type" :texts="texts" :cell-mm="8.5" :width-mm="78" />
              </span>

              <span class="card-foot">
                <Icon name="printer" :size="15" />
                <span>인쇄 미리보기 열기</span>
              </span>
            </button>
          </li>

          <!-- 부모용 화면 -->
          <li>
            <button class="card card-hover sheet-card" @click="openRead">
              <span class="card-top">
                <span class="card-icon"><Icon name="volume" :size="22" /></span>
                <span class="satellite"><Icon name="arrow-right" :size="18" /></span>
              </span>

              <span class="eyebrow">부모용 화면</span>
              <span class="t-h3 card-title">불러주기</span>
              <span class="t-sm t-muted card-desc">
                듣고 쓰기 학습지에는 답이 없습니다. 문장을 한 개씩 크게 띄워 드릴 테니 읽어 주세요.
              </span>

              <span class="card-figure read-figure">
                <span class="read-counter">01 / {{ String(texts.length).padStart(2, '0') }}</span>
                <span class="read-sample">{{ texts[0] }}</span>
              </span>

              <span class="card-foot">
                <Icon name="arrow-right" :size="15" />
                <span>화면으로 열기</span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <section class="block">
        <div class="share card card-lift">
          <div class="share-copy">
            <p class="eyebrow">공유</p>
            <h2 class="t-h2 share-title">다른 기기에서 열기</h2>
            <p class="t-lead t-muted share-line">
              부모 휴대폰으로 불러주기 화면을 띄워 둘 때 씁니다.
            </p>
            <div class="row share-actions">
              <button class="btn btn-ink" @click="copy(shareUrl)">
                <Icon :name="copied ? 'check' : 'link'" :size="16" />
                {{ copied ? '복사했어요' : '링크 복사' }}
              </button>
              <button class="btn btn-outline" @click="showQr = !showQr">
                <Icon name="qr" :size="16" />
                {{ showQr ? 'QR 숨기기' : '불러주기 QR' }}
              </button>
            </div>
          </div>

          <div v-if="showQr" class="share-qr">
            <QrPanel :url="readUrl" :size="148" />
            <p class="t-xs t-muted qr-note">
              휴대폰 카메라로 찍으면<br />불러주기 화면이 열립니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.head-line {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-wrap: wrap;
  margin-bottom: var(--sp-1);
}

.head-actions {
  gap: var(--sp-1);
}

/* 삭제는 되돌릴 수 없으니 평소에는 눈에 덜 띄게 둔다 */
.delete-btn {
  color: var(--slate);
}

.delete-btn:hover {
  color: var(--error);
  background: rgba(200, 32, 20, 0.06);
}

.confirm-ask {
  color: var(--error);
  font-weight: var(--w-mid);
}

/* ── 카드 ───────────────────────────────────────────── */

/* 2열 2행. 카드가 넓어지는 만큼 설명이 한 줄에 들어가 높이는 오히려 줄어든다 */
.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-2);
}

.sheet-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  text-align: left;
  padding: var(--sp-3);
  box-shadow: var(--e-float);
}

.sheet-card:active {
  transform: var(--press);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  margin-bottom: var(--sp-2);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--r-circle);
  background: var(--accent-wash);
  color: var(--clay);
}

.card-top .satellite {
  width: 40px;
  height: 40px;
}

.card-top .satellite {
  background: var(--canvas);
  box-shadow: none;
  flex: 0 0 auto;
}

.sheet-card:hover .satellite {
  background: var(--ink);
  color: var(--on-ink);
}

.card-title {
  display: block;
  margin-top: 2px;
}

/* 두 줄까지만 잡아 카드 높이를 서로 맞춘다 */
.card-desc {
  display: block;
  margin-top: 2px;
  min-height: 2.9em;
}

.card-figure {
  margin: var(--sp-2) 0;
  padding: var(--sp-2);
  background: var(--canvas);
  border-radius: var(--r-inner);
  overflow: hidden;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 68px;
}

.read-figure {
  flex-direction: column;
  gap: 2px;
  text-align: center;
}

.read-counter {
  font-size: var(--fs-xs);
  font-weight: var(--w-bold);
  letter-spacing: var(--ls-eyebrow);
  color: var(--taupe);
}

.read-sample {
  font-size: var(--fs-lead);
  font-weight: var(--w-mid);
  letter-spacing: var(--ls-tight);
  line-height: 1.25;
}

.card-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: var(--sp-1);
  font-size: var(--fs-sm);
  font-weight: var(--w-mid);
  color: var(--slate);
  transition: color var(--ease);
}

.sheet-card:hover .card-foot {
  color: var(--ink);
}

/* ── 공유 ───────────────────────────────────────────── */

.share {
  display: flex;
  align-items: center;
  gap: var(--sp-6);
  flex-wrap: wrap;
  padding: var(--sp-5);
}

.share-copy {
  flex: 1 1 360px;
}

.share-title {
  margin: var(--sp-1) 0;
}

.share-line {
  max-width: 46ch;
}

.share-actions {
  margin-top: var(--sp-3);
}

.share-qr {
  text-align: center;
}

.qr-note {
  margin-top: var(--sp-1);
}

/* 좁은 화면: 한 줄에 하나씩. 대신 안쪽 여백을 전반적으로 조인다 */
@media (max-width: 640px) {
  .head-actions {
    width: 100%;
  }

  .cards {
    grid-template-columns: minmax(0, 1fr);
  }

  .sheet-card {
    padding: var(--sp-2);
  }

  .card-top {
    margin-bottom: var(--sp-1);
  }

  .card-icon {
    width: 38px;
    height: 38px;
  }

  .card-top .satellite {
    width: 34px;
    height: 34px;
  }

  /* 한 줄로 쌓이면 카드끼리 높이를 맞출 이유가 없다 */
  .card-desc {
    min-height: 0;
  }

  .card-figure {
    min-height: 0;
    margin: var(--sp-1) 0;
    padding: 10px;
  }

  .card-foot {
    padding-top: 0;
  }

  .share {
    padding: var(--sp-3);
  }

  .share-actions .btn {
    width: 100%;
  }
}
</style>
