<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import GradeTag from '../components/GradeTag.vue'
import { useSheetStore } from '../stores/sheets'
import { decodeShare } from '../lib/share'
import { formatDate } from '../lib/date'

const router = useRouter()
const route = useRoute()
const store = useSheetStore()

const linkError = ref(false)

onMounted(async () => {
  await store.loadAll()

  // 공유 링크로 들어온 경우
  const shared = route.query.s
  if (typeof shared === 'string' && shared) {
    const set = decodeShare(shared)
    if (set) {
      store.adopt(set)
      await store.persist(set)
      router.replace({ name: 'result', params: { id: set.id } })
      return
    }
    linkError.value = true
  }
})

function startNew() {
  store.startNew()
  router.push({ name: 'create' })
}

async function openSaved(id: string) {
  const found = await store.open(id)
  if (found) router.push({ name: 'result', params: { id } })
}
</script>

<template>
  <div class="page">
    <div class="container">
      <header class="page-head">
        <h1 class="t-h1">받아쓰기 만들기</h1>
        <button class="btn btn-ink btn-lg" @click="startNew">
          <Icon name="pen" :size="18" />
          새로 만들기
        </button>
      </header>

      <p v-if="linkError" class="link-error t-sm">
        링크가 올바르지 않거나 오래되어 문장을 불러오지 못했습니다. 새로 만들어 주세요.
      </p>

      <section class="block">
        <header class="archive-head">
          <h2 class="t-h2">보관함</h2>
          <span v-if="store.recent.length" class="archive-count">
            {{ store.recent.length }}개
          </span>
        </header>

        <ul v-if="store.recent.length" class="grid-cards">
          <li v-for="set in store.recent" :key="set.id">
            <button class="card set-card" @click="openSaved(set.id)">
              <span class="set-icon"><Icon name="sheet" :size="18" /></span>

              <span class="set-body">
                <span class="set-title-line">
                  <GradeTag :grade="set.grade" size="sm" />
                  <span class="set-title">{{ set.title }}</span>
                </span>
                <!-- 제목이 날짜뿐인 세트끼리 구별되도록 첫 문장을 함께 보여 준다 -->
                <span class="set-meta">
                  <span class="set-peek">{{ set.sentences[0]?.text }}</span>
                  <span class="set-dot" aria-hidden="true"></span>
                  <span>문장 {{ set.sentences.length }}개</span>
                  <span class="set-dot" aria-hidden="true"></span>
                  <span>{{ formatDate(set.updatedAt) }}</span>
                </span>
              </span>

              <span class="set-go"><Icon name="arrow-right" :size="17" /></span>
            </button>
          </li>
        </ul>

        <p v-else class="empty t-lead t-muted">
          아직 만든 받아쓰기가 없습니다.<br />
          문장을 한 번 넣어 두면 여기에서 다시 꺼내 인쇄할 수 있어요.
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.link-error {
  margin-bottom: var(--sp-3);
  color: var(--error);
}

.archive-head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}

.archive-count {
  font-size: var(--fs-sm);
  font-weight: var(--w-bold);
  letter-spacing: var(--ls-eyebrow);
  color: var(--clay);
}

.grid-cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: var(--sp-2);
}

/**
 * 세로로 쌓는 카드 대신 납작한 한 줄.
 * 보관함은 훑어보고 고르는 목록이지 전시물이 아니다.
 */
.set-card {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  text-align: left;
  padding: 14px 16px 14px 14px;
  border-radius: var(--r-pill);
  box-shadow: var(--e-float);
  transition: box-shadow var(--ease), transform var(--ease);
}

.set-card:hover {
  box-shadow: var(--e-card);
}

.set-card:active {
  transform: var(--press);
}

.set-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: var(--r-circle);
  background: var(--accent-wash);
  color: var(--clay);
}

.set-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}

.set-title-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.set-title {
  font-size: var(--fs-body);
  font-weight: var(--w-mid);
  letter-spacing: var(--ls-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.set-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-width: 0;
  font-size: var(--fs-xs);
  color: var(--slate);
  white-space: nowrap;
}

.set-peek {
  overflow: hidden;
  text-overflow: ellipsis;
}

.set-dot {
  width: 3px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: var(--r-circle);
  background: var(--taupe);
}

.set-go {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border-radius: var(--r-circle);
  background: var(--canvas);
  color: var(--ink);
  transition: background-color var(--ease), color var(--ease);
}

.set-card:hover .set-go {
  background: var(--ink);
  color: var(--on-ink);
}

.empty {
  max-width: 44ch;
}

@media (max-width: 640px) {
  .page-head .btn {
    width: 100%;
  }

  .grid-cards {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 좁은 화면에서는 날짜까지 다 넣으면 넘친다 */
  .set-meta > :nth-last-child(-n + 2) {
    display: none;
  }
}
</style>
