<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './components/Icon.vue'

const route = useRoute()

/** 인쇄 미리보기와 불러주기 화면은 전체 화면을 쓴다 */
const bare = computed(() => route.name === 'sheet' || route.name === 'read')

/** 입력 화면에서는 자기 자신으로 가는 버튼이라 숨긴다 */
const showNavCta = computed(() => route.name !== 'create')
</script>

<template>
  <a class="skip no-print" href="#main">본문으로 건너뛰기</a>

  <!-- 상단 고정 GNB — 화면 폭을 꽉 채우고 본문과 같은 기준선을 쓴다 -->
  <header v-if="!bare" class="gnb no-print">
    <div class="container gnb-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-mark" aria-hidden="true"><Icon name="grid" :size="17" /></span>
        <span class="brand-name">잘들어</span>
      </RouterLink>

      <RouterLink v-if="showNavCta" to="/create" class="btn btn-ink btn-sm">
        <Icon name="plus" :size="16" />
        <span>만들기</span>
      </RouterLink>
    </div>
  </header>

  <main id="main">
    <RouterView />
  </main>

  <footer v-if="!bare" class="footer band-ink no-print">
    <div class="container footer-inner">
      <p class="t-h3 footer-line">문장만 적어 주세요.</p>
      <p class="t-sm footer-note">
        만든 문장은 이 브라우저에만 저장됩니다. 다른 기기에서 열려면 링크를 공유하세요.
      </p>
    </div>
  </footer>
</template>

<style scoped>
.skip {
  position: absolute;
  left: -9999px;
}

.skip:focus {
  left: var(--sp-2);
  top: var(--sp-2);
  z-index: 100;
  padding: var(--sp-1) var(--sp-2);
  background: var(--white);
  border-radius: var(--r-pill);
}

/* 내비는 캔버스 맨 위에 닿지 않는다. 조금 내려와 떠 있는다 */
.gnb {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--white);
  border-bottom: 1px solid var(--line-soft);
}

.gnb-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  min-height: var(--nav-h);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--r-circle);
  background: var(--accent-wash);
  color: var(--clay);
}

.brand-name {
  font-size: var(--fs-lead);
  font-weight: var(--w-mid);
  letter-spacing: var(--ls-tight);
}

.nav-cta {
  flex: 0 0 auto;
}

/* ── Footer ─────────────────────────────────────────── */

/* .page가 이미 아래 여백을 갖고 있다. 여기서 또 주면 두 번 들어간다 */
.footer {
  padding-block: var(--sp-5);
}

.footer-line {
  color: var(--on-ink);
}

.footer-note {
  margin-top: var(--sp-1);
  max-width: 52ch;
  color: var(--on-ink-soft);
}

@media (max-width: 640px) {
  .nav {
    padding-left: 16px;
  }
}
</style>
