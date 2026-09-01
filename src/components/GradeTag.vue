<script setup lang="ts">
/**
 * 급수 태그. 제목 앞에 붙는다.
 * 급수는 선택 사항이므로 고르지 않았으면 아무것도 그리지 않는다.
 */
defineProps<{ grade: number | null; size?: 'sm' | 'md' }>()
</script>

<template>
  <span v-if="grade" class="grade-tag" :class="`is-${size ?? 'md'}`">{{ grade }}급</span>
</template>

<style scoped>
.grade-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: var(--r-pill);
  background: var(--accent-wash);
  color: var(--clay);
  font-weight: var(--w-bold);
  letter-spacing: var(--ls-eyebrow);
  white-space: nowrap;
}

.is-md {
  height: 32px;
  padding: 0 14px;
  font-size: var(--fs-sm);
}

.is-sm {
  height: 22px;
  padding: 0 9px;
  font-size: var(--fs-xs);
}
</style>
