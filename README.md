# 잘들어 — 받아쓰기 연습장

부모가 받아쓰기 문장을 입력하면 **보고 쓰기 · 따라 쓰기 · 듣고 쓰기** 3종 학습지를
A4 한 장으로 만들어 인쇄합니다. 로그인·설치·서버 없음.

**https://badabada.vercel.app**

기획 배경과 결정 근거는 [PLAN.md](./PLAN.md), 디자인 토큰은 [DESIGN-mastercard.md](./DESIGN-mastercard.md).

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm test         # 칸 파서 · 레이아웃 · 붙여넣기 · 공유 링크 단위 테스트
npm run build    # 타입 검사 + 프로덕션 빌드
npm run preview  # 빌드 결과 확인
```

## 화면

| 경로 | 화면 | 설명 |
|---|---|---|
| `/` | 인트로 | 3종 소개, 최근 세트, 샘플. `?s=` 공유 링크도 여기로 들어온다 |
| `/create` | 입력 | 붙여넣기 일괄 입력 + 실시간 칸 미리보기 |
| `/result/:id` | 결과 | 학습지 3종 + 불러주기 카드, 링크 복사, QR |
| `/sheet/:id/:type` | 인쇄 미리보기 | A4 실물 비율, 타입·칸 크기 전환, 인쇄 |
| `/read/:id` | 불러주기 | 부모용. 문장 하나를 크게 띄우고 넘긴다 |

## 구조

```
src/
  lib/
    gridParser.ts     ← 칸 나누기 규칙 (R1~R6). 제품의 심장
    sheetLayout.ts    ← 줄바꿈·페이지 분할·auto 칸 크기. 모든 치수 mm
    bulkInput.ts      ← 붙여넣은 급수표에서 앞머리 번호 제거
    share.ts          ← 세트를 압축해 URL에 담기
    storage.ts        ← localStorage. 인터페이스는 async (2차 서버 전환 대비)
  components/
    CellGrid.vue      ← 칸 격자
    SheetPaper.vue    ← A4 한 장
    PaperStage.vue    ← 화면 폭에 맞춘 축소 (인쇄 시 1:1로 복원)
    Icon.vue          ← 인라인 SVG 아이콘 세트 (24 그리드 · 1.5 굵기)
  views/              ← 위 표의 5개 화면
  styles/
    tokens.css        ← DESIGN-mastercard.md 토큰
    base.css          ← 타이포·버튼·칩·입력·카드·색면 밴드
    print.css         ← @page A4, 축척 되돌리기
```

## 손대기 전에 알아야 할 것

**칸 규칙은 `gridParser.ts`에만 있습니다.** 글자 1칸, 문장부호도 1칸,
띄어쓰기는 칸이 아니라 `∨` 마커, 어절은 두 줄로 쪼개지지 않음.
바꿀 일이 있으면 여기와 테스트만 고치면 됩니다.

**줄바꿈과 페이지 분할은 CSS가 아니라 JS가 정합니다** (`sheetLayout.ts`).
화면 미리보기와 인쇄 결과가 한 칸도 어긋나면 안 되기 때문입니다.

**인쇄 치수는 전부 `mm`입니다.** px/rem을 섞으면 브라우저·배율마다 결과가 달라집니다.
`@page`의 margin은 0이고 종이 여백은 `.paper`의 padding이 담당합니다 (여백 이중 적용 방지).

**따라 쓰기의 옅은 글자에 `opacity`를 쓰지 마세요.** 프린터 드라이버에 따라 인쇄에서
사라집니다. `color`로 직접 회색을 지정합니다.

**화면과 종이는 다른 규칙을 따릅니다.** 화면은 퍼티 크림 캔버스 + 잉크 블랙이지만,
종이는 흰 바탕 + 흑백 + 빨강 ∨ 뿐입니다. 크림색을 인쇄하면 잉크만 먹고 지저분해집니다.
`SheetPaper.vue`와 `CellGrid.vue`는 일부러 토큰 대신 고정값을 씁니다 —
화면 컨셉이 또 바뀌어도 학습지 출력은 흔들리지 않게 하기 위해서입니다.

**인쇄 전에 폰트 로딩을 기다립니다** (`document.fonts.ready`).
Pretendard가 dynamic subset이라 첫 인쇄에서 글자가 깨질 수 있습니다.

## 검증 상태

- 단위 테스트 54개 통과 (칸 파서 / 레이아웃 / 붙여넣기 / 공유 링크)
- Chromium 인쇄 파이프라인에서 종이가 정확히 210×297mm, 페이지 경계 일치 확인
- **실제 프린터 출력은 아직 확인하지 않았습니다.** 칸 크기와 따라 쓰기 회색값은
  실물 인쇄를 보고 조정해야 합니다 (PLAN §5). Safari 인쇄도 미확인.
