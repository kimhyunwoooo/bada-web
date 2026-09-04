import { createRouter, createWebHistory } from 'vue-router'
import IntroView from '../views/IntroView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'intro', component: IntroView },
    {
      path: '/create',
      name: 'create',
      component: () => import('../views/CreateView.vue'),
    },
    {
      path: '/result/:id?',
      name: 'result',
      component: () => import('../views/ResultView.vue'),
    },
    {
      path: '/sheet/:id/:type',
      name: 'sheet',
      component: () => import('../views/SheetView.vue'),
    },
    {
      // 문장 없이 바로 뽑는 빈 시험지
      path: '/blank',
      name: 'blank',
      component: () => import('../views/BlankView.vue'),
    },
    {
      // QR·공유 링크는 /read?s=... 로도 들어온다 (PLAN §8.1)
      path: '/read/:id?',
      name: 'read',
      component: () => import('../views/ReadView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'intro' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
