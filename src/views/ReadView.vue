<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSheetStore } from '../stores/sheets'
import { decodeShare } from '../lib/share'
import Icon from '../components/Icon.vue'

/**
 * 불러주기 화면 (PLAN §3.4).
 *
 * 듣고 쓰기 학습지에는 정의상 답이 없다. 부모가 육성으로 읽어 주기로 했으므로(Q2)
 * 읽을 문장을 보여 주는 화면이 필요하다. 음성 합성은 쓰지 않는다 —
 * 문장 하나를 크게 띄우고 넘기는 것이 전부다.
 */
const route = useRoute()
const router = useRouter()
const store = useSheetStore()

const ready = ref(false)
const index = ref(0)
const listOpen = ref(false)
const touchStartX = ref<number | null>(null)

const texts = computed(() => store.current.sentences.map((s) => s.text))
const total = computed(() => texts.value.length)
const currentText = computed(() => texts.value[index.value] ?? '')

onMounted(async () => {
  // 공유 링크(QR)로 바로 들어온 경우 (PLAN §8.1)
  const shared = route.query.s
  if (typeof shared === 'string' && shared) {
    const set = decodeShare(shared)
    if (set) {
      store.adopt(set)
      ready.value = true
      window.addEventListener('keydown', onKey)
      return
    }
  }

  const id = String(route.params.id ?? '')
  const found = id ? await store.open(id) : null
  if (!found && store.current.sentences.length === 0) {
    router.replace({ name: 'intro' })
    return
  }
  ready.value = true
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function go(delta: number) {
  const next = index.value + delta
  if (next < 0 || next >= total.value) return
  index.value = next
}

function jump(i: number) {
  index.value = i
  listOpen.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault()
    go(1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    go(-1)
  }
}

function onTouchStart(event: TouchEvent) {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

function onTouchEnd(event: TouchEvent) {
  if (touchStartX.value === null) return
  const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.value
  if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1)
  touchStartX.value = null
}
</script>

<template>
  <div v-if="ready" class="read">
    <header class="read-head">
      <button class="head-btn" @click="router.back()">
        <Icon name="chevron-left" :size="16" />
        <span>뒤로</span>
      </button>
      <span class="title">{{ store.current.title }}</span>
      <button class="head-btn" @click="listOpen = !listOpen">
        <Icon :name="listOpen ? 'close' : 'rows'" :size="16" />
        <span>{{ listOpen ? '닫기' : '전체' }}</span>
      </button>
    </header>

    <!-- 전체 목록 — 급수표를 훑어볼 때 -->
    <ol v-if="listOpen" class="list">
      <li v-for="(text, i) in texts" :key="i">
        <button class="list-item" :class="{ 'is-on': i === index }" @click="jump(i)">
          <span class="list-no">{{ i + 1 }}</span>
          <span>{{ text }}</span>
        </button>
      </li>
    </ol>

    <!-- 한 문장씩 크게 -->
    <main v-else class="stage" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
      <p class="counter">
        <b>{{ String(index + 1).padStart(2, '0') }}</b>
        <span class="counter-sep">/</span>
        <span>{{ String(total).padStart(2, '0') }}</span>
      </p>
      <hr class="rule-gold" />
      <p class="sentence">{{ currentText }}</p>
      <p class="tip">
        아이에게 두 번 읽어 주세요. 좌우 화살표 키나 화면을 옆으로 밀어도 넘어갑니다.
      </p>
    </main>

    <nav v-if="!listOpen" class="nav">
      <button class="btn btn-outline-on-ink nav-btn" :disabled="index === 0" @click="go(-1)">
        <Icon name="arrow-left" :size="16" />
        이전
      </button>
      <button class="btn btn-on-ink nav-btn" :disabled="index >= total - 1" @click="go(1)">
        다음
        <Icon name="arrow-right" :size="16" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
/**
 * 부모가 폰을 들고 소리 내어 읽는 화면.
 * 잉크 면을 화면 전체로 쓴다 — 눈부심이 적고 문장 하나에 시선이 모인다.
 */
.read {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--ink);
  color: var(--on-ink);
}

.read-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2);
}

.head-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--r-pill);
  border: 1.5px solid rgba(255, 255, 255, 0.24);
  color: var(--on-ink-soft);
  font-size: var(--fs-sm);
  font-weight: var(--w-mid);
  transition: all var(--ease);
}

.head-btn:hover {
  color: var(--white);
  border-color: rgba(255, 255, 255, 0.6);
}

.head-btn:active {
  transform: var(--press);
}

.title {
  flex: 1 1 auto;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--on-ink-soft);
  font-size: var(--fs-sm);
}

.stage {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-6) var(--sp-3);
  text-align: center;
  /* 스와이프 중 화면이 딸려 움직이지 않게 */
  touch-action: pan-y;
}

.counter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.1);
  font-size: var(--fs-sm);
  font-weight: var(--w-bold);
  letter-spacing: var(--ls-eyebrow);
  color: var(--on-ink-soft);
}

.counter b {
  color: var(--white);
}

.counter-sep {
  color: var(--accent);
}

.rule-gold {
  display: none;
}

.sentence {
  font-size: clamp(36px, 9vw, 80px);
  font-weight: var(--w-mid);
  line-height: 1.15;
  letter-spacing: var(--ls-tight);
  max-width: 16ch;
  word-break: keep-all;
}

.tip {
  max-width: 34ch;
  color: var(--on-ink-soft);
  font-size: var(--fs-sm);
}

.nav {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-2);
  padding-bottom: max(var(--sp-3), env(safe-area-inset-bottom));
}

.nav-btn {
  flex: 1 1 0;
  min-height: 60px;
}

.list {
  list-style: none;
  margin: 0;
  padding: var(--sp-2);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  flex: 1 1 auto;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--on-ink);
  text-align: left;
  font-size: var(--fs-body);
  transition: all var(--ease);
}

.list-item:hover {
  border-color: rgba(255, 255, 255, 0.5);
}

.list-item:active {
  transform: var(--press);
}

.list-item.is-on {
  background: var(--canvas);
  border-color: var(--canvas);
  color: var(--ink);
}

.list-no {
  flex: 0 0 auto;
  width: 26px;
  font-size: var(--fs-xs);
  font-weight: var(--w-bold);
  color: var(--on-ink-soft);
}

.list-item.is-on .list-no {
  color: var(--clay);
}
</style>
