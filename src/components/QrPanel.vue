<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'

/**
 * 부모 폰으로 불러주기 화면을 여는 QR (PLAN §8.1).
 * Q7에 따라 종이에는 넣지 않는다 — 화면에만 나온다.
 */
const props = defineProps<{ url: string; size?: number }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const failed = ref(false)

async function render() {
  if (!canvas.value) return
  try {
    await QRCode.toCanvas(canvas.value, props.url, {
      width: props.size ?? 160,
      margin: 1,
      color: { dark: '#1c1917', light: '#ffffff' },
    })
    failed.value = false
  } catch {
    failed.value = true
  }
}

onMounted(render)
watch(() => props.url, render)
</script>

<template>
  <div class="qr">
    <canvas ref="canvas" class="qr-canvas" :class="{ 'is-hidden': failed }" />
    <p v-if="failed" class="t-xs">QR을 만들지 못했습니다. 링크를 복사해 주세요.</p>
  </div>
</template>

<style scoped>
.qr {
  display: flex;
  justify-content: center;
}

.qr-canvas {
  border-radius: var(--r-inner);
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 6px;
}

.is-hidden {
  display: none;
}
</style>
