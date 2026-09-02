<script setup lang="ts">
    import { computed, nextTick, onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import CellGrid from '../components/CellGrid.vue';
    import Icon from '../components/Icon.vue';
    import GradeTag from '../components/GradeTag.vue';
    import { useSheetStore } from '../stores/sheets';
    import { MAX_SENTENCES, countBulk, parseBulk } from '../lib/bulkInput';
    import { GRADES } from '../types';
    import { countCells, parseSentence } from '../lib/gridParser';
    import { buildMetrics, layoutWords, maxCellsPerLine } from '../lib/sheetLayout';
    import { createId } from '../lib/id';
    import { todayTitle } from '../lib/date';

    const router = useRouter();
    const store = useSheetStore();

    /** 실시간 미리보기의 기준 칸 크기. 실제 인쇄는 auto로 다시 계산된다 */
    const previewMetrics = buildMetrics(12);
    const lineLimit = maxCellsPerLine(previewMetrics);

    const MIN_VISIBLE = 3;

    type InputMode = 'bulk' | 'single';

    const title = ref('');
    const grade = ref<number | null>(null);
    const texts = ref<string[]>([]);
    const mode = ref<InputMode>('bulk');
    const bulkText = ref('');
    const inputs = ref<HTMLInputElement[]>([]);

    onMounted(() => {
        title.value = store.current.title || todayTitle();
        grade.value = store.current.grade ?? null;

        const existing = store.current.sentences.map(s => s.text);
        texts.value = existing.length ? [...existing] : Array.from({ length: MIN_VISIBLE }, () => '');

        // 이미 문장이 있으면 고치러 온 것이므로 개별 입력으로 시작한다
        mode.value = existing.length ? 'single' : 'bulk';
    });

    const filled = computed(() => texts.value.map(t => t.trim()).filter(Boolean));

    /**
     * 지금 화면이 들고 있는 문장 목록.
     * 두 모드는 서로 다른 입력 수단이 아니라 **같은 목록을 보는 두 가지 방식**이다 —
     * 붙여넣기는 목록을 텍스트로, 한 문장씩은 같은 목록을 행으로 볼 뿐이다.
     */
    const sentences = computed(() => (mode.value === 'bulk' ? parseBulk(bulkText.value) : filled.value));
    const canSubmit = computed(() => sentences.value.length > 0);

    const bulkCount = computed(() => countBulk(bulkText.value));
    const bulkOverflow = computed(() => Math.max(0, bulkCount.value - MAX_SENTENCES));

    /** 모드를 바꿔도 내용은 그대로 따라간다. 전환은 표현 방식만 바꾼다 */
    function setMode(next: InputMode) {
        if (next === mode.value) return;
        if (next === 'bulk') {
            bulkText.value = filled.value.join('\n');
        } else {
            texts.value = parseBulk(bulkText.value);
            padToMinimum();
        }
        mode.value = next;
    }

    /** 각 입력창 아래에 붙는 칸 배치 미리보기 */
    const previews = computed(() =>
        texts.value.map(text => {
            const trimmed = text.trim();
            if (!trimmed) return null;
            const lines = layoutWords(parseSentence(trimmed), previewMetrics, true);
            return { lines, cells: countCells(trimmed), lineCount: lines.length };
        })
    );

    function padToMinimum() {
        while (texts.value.length < MIN_VISIBLE) texts.value.push('');
    }

    /**
     * v-model 대신 :value + @input을 직접 쓴다.
     *
     * v-model은 IME 조합 중(한글 한 글자를 만드는 동안) 모델 갱신을 일부러 막는다.
     * 그래서 마지막 글자가 확정되기 전까지 칸 미리보기에 반영되지 않는다 —
     * 포커스를 옮겨야 그제서야 나타나는 것처럼 보인다.
     *
     * 값을 항상 그대로 되돌려 쓰기 때문에(가공하지 않는다) Vue가 input.value를
     * 다시 건드릴 일이 없고, 따라서 조합 중인 글자가 깨지지 않는다.
     * compositionend도 함께 받는 것은 브라우저마다 마지막 input 이벤트 순서가 다르기 때문이다.
     */
    function readValue(event: Event): string {
        return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    }

    function onInput(index: number, event: Event) {
        texts.value[index] = readValue(event);

        // 마지막 칸을 채우면 다음 칸이 생긴다 — 빈 칸 10개를 한꺼번에 보여주지 않는다
        const isLast = index === texts.value.length - 1;
        if (isLast && texts.value[index].trim() && texts.value.length < MAX_SENTENCES) {
            texts.value.push('');
        }
    }

    function removeAt(index: number) {
        texts.value.splice(index, 1);
        padToMinimum();
    }

    async function addRow() {
        if (texts.value.length >= MAX_SENTENCES) return;
        texts.value.push('');
        await nextTick();
        inputs.value[texts.value.length - 1]?.focus();
    }

    async function submit() {
        if (!canSubmit.value) return;
        const set = {
            ...store.current,
            title: title.value.trim() || todayTitle(),
            grade: grade.value,
            sentences: sentences.value.map(text => ({ id: createId(), text }))
        };
        store.adopt(set);
        await store.persist(set);
        router.push({ name: 'result', params: { id: set.id } });
    }
</script>

<template>
    <div class="page">
        <div class="container">
            <div class="measure">
                <header class="page-head">
                    <div>
                        <h1 class="t-h1 head-title">문장 입력</h1>
                        <p class="t-lead t-muted">최대 {{ MAX_SENTENCES }}문장. 4문장만 넣어도 만들어집니다.</p>
                    </div>
                </header>

                <!-- 제목 · 급수. 급수는 선택 사항이라 라벨 옆에 작게 둔다 -->
                <div class="label-row">
                    <label class="field-label" for="set-title">학습지 제목</label>
                    <div class="grade-picker">
                        <select v-model="grade" class="grade-select" aria-label="급수">
                            <option :value="null">급수 없음</option>
                            <option v-for="g in GRADES" :key="g" :value="g">{{ g }}급</option>
                        </select>
                        <Icon name="chevron-right" :size="12" class="grade-caret" />
                    </div>
                </div>

                <div class="title-row">
                    <GradeTag :grade="grade" />
                    <input id="set-title" :value="title" class="input title-input" type="text" :placeholder="todayTitle()" @input="title = readValue($event)" @compositionend="title = readValue($event)" />
                </div>

                <!-- 입력 방식 -->
                <p class="field-label modes-label">문장 넣는 방법</p>
                <div class="modes">
                    <button class="mode" :class="{ 'is-on': mode === 'bulk' }" @click="setMode('bulk')">
                        <span class="mode-icon"><Icon name="clipboard" :size="20" /></span>
                        <span class="mode-text">
                            <strong>여러 문장 붙여넣기</strong>
                            <span class="mode-desc">알림장·학급 카톡에서 복사한 급수표를 그대로</span>
                        </span>
                        <span v-if="mode === 'bulk'" class="mode-check"><Icon name="check" :size="16" /></span>
                    </button>
                    <button class="mode" :class="{ 'is-on': mode === 'single' }" @click="setMode('single')">
                        <span class="mode-icon"><Icon name="rows" :size="20" /></span>
                        <span class="mode-text">
                            <strong>한 문장씩 입력</strong>
                            <span class="mode-desc">칸에 하나씩 직접 적기</span>
                        </span>
                        <span v-if="mode === 'single'" class="mode-check"><Icon name="check" :size="16" /></span>
                    </button>
                </div>

                <!-- ① 붙여넣기 -->
                <section v-if="mode === 'bulk'" class="panel">
                    <textarea :value="bulkText" class="textarea" rows="8" placeholder="1. 신나요.&#10;2. 뿌듯해요.&#10;3. 곰이 그림책을 봅니다." @input="bulkText = readValue($event)" @compositionend="bulkText = readValue($event)" />
                    <div class="row panel-actions">
                        <span class="help">
                            <template v-if="bulkCount">
                                <b class="found">{{ bulkCount }}문장</b>을 찾았어요.
                                <template v-if="bulkOverflow">앞의 {{ MAX_SENTENCES }}문장만 가져옵니다.</template>
                            </template>
                            <template v-else> 한 줄에 한 문장씩. 앞의 번호(1. · ① · -)는 자동으로 지워집니다. </template>
                        </span>
                        <button class="btn btn-outline btn-sm" :disabled="!bulkCount" @click="setMode('single')">
                            <Icon name="rows" :size="15" />
                            한 문장씩 다듬기
                        </button>
                    </div>
                </section>

                <!-- ② 개별 입력 + 실시간 칸 미리보기 -->
                <template v-else>
                    <ol class="rows">
                        <li v-for="(_, i) in texts" :key="i" class="row-item">
                            <div class="row-top">
                                <span class="row-no">{{ String(i + 1).padStart(2, '0') }}</span>
                                <div class="row-input">
                                    <input :ref="el => (inputs[i] = el as HTMLInputElement)" :value="texts[i]" class="input" type="text" :placeholder="i === 0 ? '예: 곰이 그림책을 봅니다.' : '문장을 입력하세요'" @input="onInput(i, $event)" @compositionend="onInput(i, $event)" />
                                    <button v-if="texts.length > MIN_VISIBLE" class="row-remove" :aria-label="`${i + 1}번 문장 지우기`" @click="removeAt(i)">
                                        <Icon name="close" :size="15" />
                                    </button>
                                </div>
                            </div>

                            <!-- 미리보기는 번호 칸에 맞추지 않고 줄 전체 폭을 쓴다 — 칸이 더 많이 보인다 -->
                            <div v-if="previews[i]" class="preview">
                                <CellGrid :lines="previews[i]!.lines" :metrics="previewMetrics" variant="trace" :show-space-mark="true" />
                                <p class="preview-meta" :class="{ 'is-warn': previews[i]!.lineCount > 2 }">
                                    {{ previews[i]!.cells }}칸
                                    <template v-if="previews[i]!.lineCount > 1"> · {{ previews[i]!.lineCount }}줄 </template>
                                    <template v-if="previews[i]!.lineCount > 2"> — 문장이 길어 칸이 작아집니다. 나눠 쓰는 편이 좋아요. </template>
                                </p>
                            </div>
                        </li>
                    </ol>

                    <button v-if="texts.length < MAX_SENTENCES" class="btn btn-quiet add-row" @click="addRow">
                        <Icon name="plus" :size="15" />
                        문장 추가
                    </button>

                    <p class="help hint">한 줄에 최대 {{ lineLimit }}칸까지 들어갑니다. 띄어쓰기는 칸이 아니라 <b class="v">∨</b> 로 표시돼요.</p>
                </template>

                <!-- 만들기는 두 모드 어디서나 — 붙여넣고 바로 만들 수 있어야 한다 -->
                <div class="submit-row">
                    <button class="btn btn-ink btn-lg" :disabled="!canSubmit" @click="submit">
                        <Icon name="check" :size="16" />
                        학습지 만들기
                    </button>
                    <span v-if="canSubmit" class="help">{{ sentences.length }}문장으로 3종을 만듭니다</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .head-title {
        margin-bottom: var(--sp-1);
    }

    /* 라벨 줄에 급수 선택을 얹는다. 중요도가 낮으므로 입력창 절반 크기로 */
    .label-row {
        display: flex;
        align-items: center;
        gap: var(--sp-1);
        margin-bottom: var(--sp-1);
    }

    .label-row .field-label {
        margin-bottom: 0;
    }

    .grade-picker {
        position: relative;
        flex: 0 0 auto;
    }

    .grade-select {
        appearance: none;
        -webkit-appearance: none;
        height: 26px;
        padding: 0 24px 0 12px;
        border: 1.5px solid var(--line);
        border-radius: var(--r-pill);
        background: var(--white);
        color: var(--slate);
        font-family: inherit;
        font-size: var(--fs-xs);
        font-weight: var(--w-mid);
        cursor: pointer;
        transition:
            border-color var(--ease),
            color var(--ease);
    }

    .grade-select:hover,
    .grade-select:focus {
        border-color: var(--ink);
        color: var(--ink);
        outline: none;
    }

    .grade-caret {
        position: absolute;
        right: 9px;
        top: 50%;
        transform: translateY(-50%) rotate(90deg);
        color: var(--slate);
        pointer-events: none;
    }

    /* 제목 앞에 급수 태그 */
    .title-row {
        display: flex;
        align-items: center;
        gap: var(--sp-1);
    }

    .title-input {
        flex: 1 1 auto;
        min-width: 0;
    }

    .modes-label {
        margin-top: var(--sp-4);
    }

    .modes {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--sp-2);
    }

    /* 고른 쪽만 잉크로 채운다 */
    .mode {
        display: flex;
        align-items: flex-start;
        gap: var(--sp-2);
        padding: var(--sp-3);
        border: 1.5px solid var(--line);
        border-radius: var(--r-inner);
        background: var(--white);
        text-align: left;
        transition: all var(--ease);
    }

    .mode:hover {
        border-color: var(--ink);
    }

    .mode:active {
        transform: var(--press);
    }

    .mode-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        flex: 0 0 auto;
        border-radius: var(--r-circle);
        background: var(--accent-wash);
        color: var(--clay);
    }

    .mode-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1 1 auto;
        min-width: 0;
        padding-top: 4px;
    }

    .mode-text strong {
        font-size: var(--fs-body);
        font-weight: var(--w-mid);
        letter-spacing: var(--ls-tight);
    }

    .mode-desc {
        font-size: var(--fs-sm);
        line-height: 1.4;
        color: var(--slate);
    }

    .mode-check {
        margin-top: 12px;
    }

    .mode.is-on {
        background: var(--ink);
        border-color: var(--ink);
        color: var(--on-ink);
    }

    .mode.is-on .mode-icon {
        background: rgba(255, 255, 255, 0.12);
        color: var(--accent);
    }

    .mode.is-on .mode-desc {
        color: var(--on-ink-soft);
    }

    .panel {
        margin-top: var(--sp-3);
    }

    .panel-actions {
        justify-content: space-between;
        margin-top: var(--sp-2);
    }

    .found {
        color: var(--ink);
        font-weight: var(--w-bold);
    }

    /* ── 개별 입력 ──────────────────────────────────────── */

    .rows {
        list-style: none;
        margin: var(--sp-3) 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--sp-3);
    }

    .row-item {
        display: flex;
        flex-direction: column;
        gap: var(--sp-1);
    }

    .row-top {
        display: flex;
        align-items: center;
        gap: var(--sp-2);
    }

    .row-no {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: var(--r-circle);
        background: var(--canvas);
        font-size: var(--fs-xs);
        font-weight: var(--w-bold);
        color: var(--slate);
    }

    .row-input {
        position: relative;
        flex: 1 1 auto;
        min-width: 0;
    }

    .row-remove {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: var(--r-circle);
        color: var(--taupe);
        transition: all var(--ease);
    }

    .row-remove:hover {
        color: var(--error);
        background: var(--canvas);
    }

    /**
     * 칸 미리보기.
     *
     * 종이를 흉내 내는 자리이므로 바탕은 흰색이다 — 캔버스와 같은 색이면 경계가 사라진다.
     * 넘칠 때 좌우 그림자가 나타나 "더 있다"를 알린다.
     * 덮개 그라데이션은 내용과 함께 스크롤(local)하고 그림자는 상자에 고정(scroll)이라,
     * 끝까지 밀면 그쪽 그림자가 덮개에 가려 자동으로 사라진다. 자바스크립트가 필요 없다.
     */
    .preview {
        margin-top: var(--sp-1);
        padding: var(--sp-2) var(--sp-3);
        border: 1.5px solid var(--line);
        border-radius: var(--r-inner);
        overflow-x: auto;
        overscroll-behavior-x: contain;

        background-color: var(--white);
        background-image:
            linear-gradient(to right, var(--white) 40%, rgba(255, 255, 255, 0)),
            linear-gradient(to left, var(--white) 40%, rgba(255, 255, 255, 0)),
            radial-gradient(farthest-side at 0 50%, rgba(20, 20, 19, 0.16), rgba(20, 20, 19, 0)),
            radial-gradient(farthest-side at 100% 50%, rgba(20, 20, 19, 0.16), rgba(20, 20, 19, 0));
        background-position: left center, right center, left center, right center;
        background-repeat: no-repeat;
        background-size: 48px 100%, 48px 100%, 16px 100%, 16px 100%;
        background-attachment: local, local, scroll, scroll;
    }

    /* 그림자만으로는 약하다. 얇은 스크롤바를 함께 남겨 둔다 */
    .preview {
        scrollbar-width: thin;
        scrollbar-color: var(--line) transparent;
    }

    .preview::-webkit-scrollbar {
        height: 6px;
    }

    .preview::-webkit-scrollbar-track {
        background: transparent;
    }

    .preview::-webkit-scrollbar-thumb {
        background: var(--line);
        border-radius: var(--r-pill);
    }

    .preview:hover::-webkit-scrollbar-thumb {
        background: var(--taupe);
    }

    .preview-meta {
        margin-top: var(--sp-1);
        font-size: var(--fs-xs);
        color: var(--slate);
    }

    .preview-meta.is-warn {
        color: var(--error);
        font-weight: var(--w-mid);
    }

    .add-row {
        margin-top: var(--sp-2);
    }

    .hint {
        margin-top: var(--sp-3);
    }

    .hint .v {
        color: var(--mark-space);
        font-weight: var(--w-bold);
    }

    .submit-row {
        display: flex;
        align-items: center;
        gap: var(--sp-3);
        flex-wrap: wrap;
        margin-top: var(--sp-5);
        padding-top: var(--sp-3);
        border-top: 1px solid var(--line-soft);
    }

    @media (max-width: 640px) {
        .modes {
            grid-template-columns: minmax(0, 1fr);
        }

        .panel-actions {
            flex-direction: column;
            align-items: stretch;
        }

        .panel-actions .btn,
        .submit-row .btn {
            width: 100%;
        }
    }
</style>
