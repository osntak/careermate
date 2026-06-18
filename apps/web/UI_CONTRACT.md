# CareerMate dashboard — page module contract

> **먼저 `DESIGN_GUIDE.md`(디자인 원칙·안티-AI-슬롭 규칙)를 읽으세요.** 이 문서는 *어떻게 짜는가*(컴포넌트·API), `DESIGN_GUIDE.md`는 *어떻게 보여야 하는가*(위계·카피·셸 컨벤션)를 규정합니다.

Read this + `DESIGN_GUIDE.md` + `apps/web/public/pages/home.js` (the reference implementation) before writing any page. Every page must look and behave like home.js. No frameworks, no build, no CDN. Korean-first. **XSS-safe: never use innerHTML with user/DB content — `el()` puts strings into textContent. Render document/cover-letter bodies as text inside a `.doc-preview` element (CSS already does `white-space: pre-wrap`).**

## File shape
Create `apps/web/public/pages/<name>.js`:
```js
import { el, get, post, put, del, icon, navigate, Card, Badge, Btn, IconBtn, Stat,
  EmptyState, Chips, Field, Input, Textarea, Select, PageHead, openModal, closeModal,
  confirmDialog, toast, toastOk, toastError, copyText, downloadUrl, fmtDate, fmtRelative,
  scoreClass, mount, meta } from '/lib.js';

export async function render(ctx) {
  // fetch data, build a root node, then:  mount(ctx.view, root);
  // set page actions in the topbar:  ctx.setActions([Btn(...)]);
  // after any mutation that changes counts: await ctx.refreshNav();
}
```
`ctx = { view, params, setTitle(str), setActions(node|nodes), navigate, refreshNav }`. `params` are the path segments after the page id (e.g. `#/jobs/abc` → params=['abc']).

## lib.js component API (use these — do not hand-roll styles)
- `el(tag, props, ...children)` — props: class, text, value, placeholder, type, href, disabled, dataset:{}, style:{}, attrs:{}, onClick/onInput/onChange/onSubmit/onKeydown. children: strings (safe text) or nodes; null/false ignored; arrays flattened.
- `icon(name, cls?)` → svg. Names: home,user,briefcase,layers,file,mic,settings,plus,edit,trash,copy,download,external,check,sparkle,clock,link,lock,search,inbox,target,info,chevronRight.
- API: `get(path)`, `post(path,body)`, `put(path,body)`, `del(path)` → parsed JSON; throw Error(message) on failure (wrap mutations in try/catch + toastError).
- Components: `Card({title,sub,actions,body,clickable,onClick})`, `Stat({label,value,hint,iconName})`, `Badge(statusCode,label)`, `Btn(label,{icon,variant,sm,onClick,type,disabled,title})` (variant: primary|ghost|danger), `IconBtn(name,{onClick,title,variant})`, `EmptyState({iconName,title,body,action})`, `Chips(items,{accent})`, `ListRow({leading,title,sub,trailing,onClick})` (dense list row — leading node + title/sub + right-aligned trailing node(s); becomes clickable when onClick is set), `CheckRow({done,label,onClick})` (onboarding checklist row — hollow dot + accent link when todo, green check + strikethrough when done), `Field(label,control,hint)`, `Input(props)`, `Textarea(props)`, `Select(options,props)` where options=[{value,label,selected}], `PageHead({title,desc,actions})`.
- Overlays: `openModal({title, body, footer, size})` — body is a node or `(close)=>node`; footer is `(close)=>node|nodes`; size 'lg' optional. `closeModal()`. `confirmDialog({title,message,confirmLabel,danger})` → Promise<boolean>.
- Feedback: `toast(msg,{title,type})`, `toastOk(msg)`, `toastError(err)`.
- Utils: `copyText(str)`, `downloadUrl(url)` (GET file download), `fmtDate(iso)`, `fmtRelative(iso)`, `scoreClass(score)` → 'score-strong|score-mid|score-weak|muted', `mount(view, ...nodes)`, `meta()` → {statuses:[{value,label}], document_kinds:[{value,label}]}.

## CSS classes available (styles.css) — reuse, don't invent
Layout: `.stack-2/.stack-3/.stack-4` (vertical gap), `.grid .grid--2/3/4`, `.flex .between .center .wrap .gap-2/3/4 .ml-auto`, `.divider`, `.mt-2..4 .mb-2..4`.
Surfaces: `.card .card__head .card__body`, `.stat`, `.callout .callout--privacy`, `.doc-preview`, `.kv`(dt/dd), `.timeline .tl-item .tl-item__rail .tl-item__dot .tl-item__line .tl-item__body` (+`.is-current`), `.board .board__col .board__col-head .board__cards .board-card` (kanban).
Lists/feed/pipeline (prefer the `ListRow`/`CheckRow` helpers over these classes): `.list-row .list-row__lead(.--chip) .list-row__dot .list-row__main .list-row__title .list-row__sub .list-row__trail`, `.pipebar .pipebar__seg` + `.pipefunnel .pipefunnel__tile .pipefunnel__label .pipefunnel__dot .pipefunnel__value .pipefunnel__conv` (application funnel), `.check-row(.is-done) .check-row__dot .check-row__icon .check-row__label(.is-link)`, `.feed-group .feed-item .feed-item__icon .feed-item__body .feed-item__text .feed-item__time`, `.firstrun-hero` (day-one single-card canvas).
Bits: `.badge .badge--<status>`, `.chip .chip--accent .chips`, `.btn ...`, `.input .textarea .select .field`, `.progress .progress__bar`, `.tabs .tab .is-active`, `.table`, `.empty`, `.muted .text-sm .text-secondary .strong .truncate .tnum`, score colors `.score-strong/.score-mid/.score-weak`.
Status codes (for Badge + classes): draft(작성 중), planned(지원 예정), applied(지원 완료), document_passed(서류 합격), interview(면접 진행), final_passed(최종 합격), rejected(불합격), on_hold(보류).

## Conventions
- Build forms with Field+Input/Textarea/Select inside `openModal`; submit → post/put → toastOk → closeModal → re-render the page (re-run render or refetch+remount) → `ctx.refreshNav()` if counts changed.
- Always provide a friendly empty state (see home.js) with an action.
- Tables/rows that navigate use `class:'is-clickable'` + onClick navigate.
- Dense, calm, real-product feel. Avoid emoji-heavy or flashy "AI" styling.
- Tabs: render a `.tabs` bar; clicking re-renders the panel; keep selected tab in a local variable (or in `location.hash` query if you prefer, but local is fine).
