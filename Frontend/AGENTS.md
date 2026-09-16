<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Design system & component rules

This project uses shadcn/ui (the `base-nova` style, built on Base UI — `@base-ui/react`, not Radix) as its component layer, with every color/radius/shadow centralized as CSS variables in `src/app/globals.css`. Light theme only — there is no dark mode, no `.dark` class is ever applied.

- **Never hardcode a color, radius, or shadow.** Check `src/app/globals.css` (`:root` + `@theme inline`) first. If the value you need isn't there, add it as a token in `globals.css` and consume it via a Tailwind utility (`bg-success`, `text-purple`, `shadow-card`, `rounded-sm`, etc.) — never a raw hex/`rgba()`/`px` arbitrary value in a component. Tinted/translucent variants should use Tailwind's opacity modifier on an existing token (`bg-success/10`) rather than a new hardcoded rgba.
- **Check `src/components/ui/` (shadcn primitives) and `src/components/common/` (our reusable wrappers) before writing new markup.** If shadcn has the component (button, input, checkbox, avatar, badge, table, sidebar, dropdown-menu, tooltip, sheet, collapsible, etc.), use it — don't hand-roll a `<button>`/`<input>`/status pill from scratch.
- **Never import a `ui/*` primitive directly into a page or feature component.** Customize the primitive itself (its `cva` variants in `ui/button.jsx`, `ui/input.jsx`, etc.) so its *default* look already matches Figma, and/or wrap it in a `common/` component for anything with app-specific behavior (`CommonInput`, `CommonOTPInput`, `UserAvatar`, `StatusBadge`). Feature code imports from `common/` or the customized `ui/*`, never a raw unstyled primitive.
- **Forms**: use `CommonInput` (`src/components/common/CommonInput.jsx`) for every text/email/password/textarea field — pass `type`. Password show/hide state lives inside `CommonInput`, not in the parent. Use `CommonOTPInput` for any digit-code input.
- **Icons**: prefer the Figma-exported SVGs under `public/dashboard/icons/` and `public/auth/icons/`. Only reach for `lucide-react` when Figma didn't export the icon you need (e.g. the password-hidden `EyeOff` state, or icons shadcn primitives require internally like sidebar/dropdown chevrons) — and when mixing is unavoidable for a matched pair (e.g. show/hide eye), use the same icon family for both states rather than mixing Figma + lucide within one control.
- **Images**: always `next/image`, never `<img>`, never the `unoptimized` prop. Local assets under `public/` need no remote-pattern config. Use `fill` + a sized `relative` parent for background/cover photos, explicit `width`/`height` for everything else.
- **Layouts, not wrappers**: if a visual shell wraps every page in a route group (the auth hero-split panel, the dashboard sidebar), it belongs in that group's `layout.js` — never re-imported and wrapped around each page's JSX by hand. `src/app/(auth)/layout.js` and `src/app/dashboard/layout.js` are the examples to follow.
- **Reuse, don't duplicate.** Before adding a new status-color map, badge variant, or avatar treatment, check `src/components/common/StatusBadge.jsx` / `UserAvatar.jsx` first — these exist specifically because 4+ components used to hand-roll their own copies.

## Never duplicate code — extract a reusable component

If you are about to paste, retype, or closely re-derive a block of JSX/markup that already exists elsewhere in the codebase (even with different text/props), stop and extract it into a reusable component instead. This applies at any scale — a whole page section, a form-field group, a title+description header block, a status badge, a card shell. `AuthCardHeader`, `StatusBadge`, `SearchInput`, `UserMenu`, and `FilterTabs` all exist because the same markup was found copy-pasted across 2+ files; that duplication should have been caught before it landed. Before writing new markup:

1. Grep for a similar-looking block elsewhere in `src/`.
2. If found (even once, if you're about to add a second usage), extract a component to `src/components/common/` (generic) or the relevant feature folder (`src/components/auth/`, `src/components/dashboard/`) before proceeding.
3. Never let the same visual/structural pattern exist in 3+ places as separate hand-rolled copies — that's a signal a reusable component is overdue.

## Responsiveness is mandatory, not optional

Every screen and every new component must work across mobile, tablet, and desktop widths — this is a hard requirement, not a nice-to-have. Concretely:

- Default to mobile-first Tailwind classes (unprefixed = smallest screens) and add `sm:`/`md:`/`lg:`/`xl:` overrides for larger viewports — never ship a fixed-width layout that only works at one breakpoint.
- Multi-column layouts (dashboard grids, the Financial Attention two-column panel) must stack to a single column below `lg` (`grid-cols-1 lg:grid-cols-2`), not overflow or squeeze.
- Fixed pixel widths (`w-[Npx]`) on anything that isn't a small fixed-size icon/badge are a red flag — check whether it should be `flex-1`/`w-full`/`min-w-0` with a `sm:`-gated fixed size instead (see `CommonOTPInput`'s `fixedWidth` variant for the pattern: fluid by default, fixed-width only from `sm:` up).
- Test/verify at minimum three widths before considering a screen done: ~375px (mobile), ~768px (tablet), ~1440px (desktop).
- The dashboard sidebar's built-in mobile behavior (shadcn `Sidebar` collapses to an off-canvas `Sheet` below `md`) is the reference pattern for "component that adapts by breakpoint automatically" — prefer primitives that already do this over hand-rolled `hidden md:block` toggles where possible.
- **Mobile-only sizing must reproduce the existing value verbatim at `sm:` and up.** When shrinking padding/gap/font/icon size for small screens, gate the smaller value unprefixed and repeat the *original* value at `sm:` (e.g. `gap-3 sm:gap-6` where `gap-6` was the prior constant) — never introduce an intermediate step (`gap-3 sm:gap-4 lg:gap-6`) or shift alignment/breakpoints that change how the design already looks at tablet/desktop. Verify by screenshotting ~768px and ~1440px, not just mobile, before calling a responsive change done.
- **Stat/metric tiles go 2-column on mobile, not 1-column.** `StatsGrid`/`StatCard` (dashboard), `SimpleStatsRow` (trips, operator sourcing, schedule), and `TripDetailsView`'s financial `StatBox` grid all use `grid-cols-2` as the base (unprefixed) class with tighter padding/icon/font sizes below `sm`, then match the original desktop values at `sm:`+. Follow this pattern for any new stat/KPI tile group instead of stacking to a single column.
- **Tables get a card view below `lg`, not horizontal scroll.** A data table wider than it is usable on mobile (search/filters + `overflow-x-auto` table) gets a companion per-row `*Card.jsx` component and a `*CardsContainer.jsx` that lists them, rendered `lg:hidden` beside the original `<Table>` wrapped in `hidden lg:block` — see `TripCard`/`TripsCardsContainer`/`UpcomingTripsContainer` and `SourcingRequestCard`/`OperatorSourcingCardsContainer`. The search/filter toolbar and `TablePagination` footer stay shared (rendered once, not duplicated per breakpoint); only the row-rendering body swaps. Row-action-menu items and navigation handlers are extracted into one function (e.g. `getRowActions(row)`) so the table rows and the cards call identical logic.
- **Dense grid views (calendar week/month) get a genuine mobile layout, not a scroll wrapper.** `ScheduleView`'s `WeekGrid`/`MonthGrid` render a compact mobile view `lg:hidden` (day-chip picker + single-day agenda for week; small tap-to-select day grid + agenda for month, both using `FlightEventCard`) beside the original dense grid wrapped `hidden lg:block`/`hidden lg:flex`. Reuse existing store state (e.g. `useScheduleStore`'s `currentDate`/`goToDate`) for the "selected day" instead of adding new local state.
- **TopNav is sticky** (`sticky top-0 z-30`) so it stays visible while the page scrolls; keep new overlay z-indexes below the shadcn popover/dialog/sheet default of `z-50`. Header controls (notification bell, profile menu) share the same explicit height per breakpoint (`h-9 sm:h-11` / `size-9 sm:size-11`) rather than relying on intrinsic content height, so they stay visually aligned.

## Animation convention

This project uses **Framer Motion** (`framer-motion`) for entrance/reveal animations — smooth, relaxing, premium-feeling, never abrupt or bouncy-by-default. Reusable primitives live in `src/components/common/`:

- `Reveal` — scroll-triggered fade+slide-up (`whileInView`, animates once). Use for dashboard sections/cards that appear as the user scrolls down a long page.
- `StaggerContainer` + `StaggerItem` — mount-triggered cascade (`initial`/`animate`), used for auth screens where the whole card is above the fold. Wrap the group in `StaggerContainer`, wrap each direct visual chunk (header, form, button) in `StaggerItem`. Pass `as={motion.form}` (imported from `framer-motion`, not a bare string) when the item needs to render as a real `<form>`.

Don't hand-roll a new `motion.div` with bespoke `initial`/`animate`/`variants` for a standard reveal — reuse `Reveal`/`StaggerContainer`/`StaggerItem` first. Only reach for a bespoke `motion.*` block (as `AuthCard`'s card-level scale-in and `SuccessCard`'s checkmark pop do) for a genuinely one-off entrance effect that the shared primitives don't cover.

Overlays (Popover/Dialog/Sheet content) get the same treatment: don't ship shadcn's default 100ms overlay transition — customize the primitive's own open/close animation classes (see `ui/popover.jsx`) to the project's slower, smoother duration/easing instead of overriding it per-callsite.

## Dummy data and state: never inline, always store-backed

This project has no backend yet, but components must be written as if the data source could be swapped for a real API tomorrow. Two rules, always applied together:

- **All placeholder content lives in `src/dummyData/`, one file per page/section/component it feeds** (`src/dummyData/trips.js`, `src/dummyData/schedule.js`, `src/dummyData/operatorSourcing.js`, etc.). A dummy-data file exports plain data (arrays/objects) and nothing else — no components, no JSX.
- **All state and the functions that mutate it live in `src/store/`, as Zustand stores, one store per page/section/component domain** (`src/store/useTripsStore.js`, `src/store/useScheduleStore.js`, ...), built with `zustand`'s `create()`. A store seeds its initial state from the matching `dummyData` file and exposes both the state and the actions that operate on it (filters, selection, pagination, sorting, etc.) as one hook.
- **Components never define dummy content inline and never hold this kind of state in local `useState`.** A page/section imports the store hook (`const { trips, statusFilter, setStatusFilter } = useTripsStore()`) and calls its actions — it does not construct arrays of fake rows, hardcode option lists, or manage filter/selection state itself. Local `useState` is still fine for things that are genuinely local and disposable (an input's uncontrolled draft value, a popover's open/closed flag) — the line is: if another component might need to read or react to it, or if it represents "the data," it belongs in a store, not `useState`.

Before adding a new table, list, or filterable view: create its `dummyData/*.js` file, create its `store/use*Store.js` file, then build the component against the store hook. Never take a shortcut and inline the array "just for now."

- **Always use optional chaining (`?.`) when referencing object properties, arrays, store states, and function callbacks** (e.g. `items?.map()`, `priorities?.length`, `stat?.label`, `onActionClick?.()`, `agent?.name`), ensuring runtime safety against undefined/null states when data is loading or empty.


---

# Data layer: once a module has an API, it is API-backed

The "Dummy data and state" section above describes how a screen is built **before** its backend exists. As each module's API lands, that module graduates and the rules below take over. Both states coexist — `trips` may still be dummy-backed while `users` is live.

When a module graduates:

- **Server data comes from React Query, never from a zustand store.** Delete the store's data array, its filter/pagination getters and its mutating actions. A store may keep genuinely client-only state (which dialog is open, which row is selected) — nothing that the server owns.
- **Its `dummyData/*.js` file goes away** with the store's dependency on it. Do not leave a stale copy "for reference".
- Read the module's `src/hooks/<module>/README.md` if there is one; `src/hooks/auth/` is the reference implementation for everything below.

## Services and hooks

- One service per module: `src/services/<module>.service.js`, exporting plain functions that call the shared `request()` from `src/lib/axios.js`. A service does nothing but shape the request and return `data` — no toasts, no navigation, no cache access.
- One hook per operation, one file per hook, under `src/hooks/<module>/`, re-exported from that folder's `index.js`.
- **Query hooks return the query object itself. Mutation hooks return the mutation itself.** Never a hand-built `{ data, loading, error }` shape — the component destructures what it needs.
- **Timing never appears in a hook.** `staleTime`, `gcTime`, retry and refetch behaviour come from the presets in `src/config/query.config.js`, which read `NEXT_PUBLIC_QUERY_*` env vars. A raw number in a hook is a bug.
- Query keys come from `src/lib/queryKeys.js`. Never inline an array literal as a key.

## Hooks own the side effects; components stay clean

**All of it lives in the hook** — success and error toasts, cache invalidation, redirects, session teardown. A component calls `mutate(values)` and renders state. If you find yourself writing `onSuccess` inside a component, the logic belongs in the hook instead.

Invalidation goes through the module-level query client (`src/lib/queryClient.js`) so any hook file can invalidate any other module's keys without prop-drilling a client.

## URL is the source of truth for table state

**Every tab, page, filter, sort and search term lives in the URL query string.** Not in a store, not in `useState`.

This is not cosmetic. A pasted or reloaded URL must reproduce exactly what the user was looking at — same tab, same page, same filters — and back/forward must step through those states.

Use the shared `useTableQueryParams` hook (`src/hooks/common/useTableQueryParams.js`); do not hand-roll `useSearchParams` juggling per table.

- **Defaults are omitted from the URL.** Page 1 with no filters is a bare `/dashboard/users`, not `?page=1&role=ALL`. Reading a missing param yields the default.
- **Changing any filter, search term or tab resets `page` to 1.** Landing on page 4 of a 1-page result set is a bug.
- **Filter/tab changes use `replace`, not `push`**, so back does not walk through every keystroke. Only a genuine navigation pushes.
- **Search input is debounced before it reaches the URL** (the field itself stays controlled and instant).
- URL values are **untrusted input**: validate and clamp every one before it reaches a request. A hand-edited `?page=-5&limit=99999` must degrade to the default, not 500 the API.
- The wire vocabulary is the backend's enum casing (`SENIOR_BROKER`), and that is what goes in the URL. Display labels are mapped at render time.

## Table state is assembled from shared builders, never hand-written

`useTableQueryParams` is the whole engine; a module's hook declares only what
is actually specific to it. Everything below already exists — writing a second
copy is the bug this section exists to prevent.

| Need | Use |
|---|---|
| page / limit / sortBy / sortOrder fields | `paginationFields(SORTABLE_COLUMNS)` |
| a debounced text search field | `searchField()` |
| a dropdown filter over a fixed set | `filterField(ALLOWED_VALUES)` |
| the object to send to the API | the hook's `queryParams` |
| `setPage`, `setRole`, `setStatus`, … | the hook's `setters` (generated from the schema) |
| moving pages, clamped | the hook's `goToPage(page, pageCount)` |
| the rows-per-page dropdown | `<PageSizeSelect value onChange />`, in the toolbar beside the filters |
| the bulk-remove button | `<BulkDeleteButton count itemLabel onClick />`, beside the table's primary action |
| the bulk-remove confirmation | `<BulkDeleteDialog items itemLabel onConfirm />` |
| the archived view | an `archived` field in the schema, surfaced as a tab |
| the restored marker | `<RestoredBadge at by />` |
| archive field labels | `toArchiveFields(record)` from `@/lib/archive` |
| page numbers with collapsed gaps | `<TablePagination onPageChange />`, windowed by `buildPageItems` |

- **Mark view-only fields `local: true`.** A tab id belongs in the URL but must
  never reach the API — it is not part of the query key, and including it
  refetches the table every time someone switches tabs.
- **`SORTABLE_COLUMNS` mirrors the API's allowlist exactly.** A value the API
  would reject with a 400 must not survive the URL either.
- **`DEFAULT_PAGE_SIZE` is 10 and `PAGE_SIZE_OPTIONS` ends at 100**, the API's
  hard cap. Both live in `hooks/common/useTableQueryParams.js` and are paired
  with `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE` on the backend.
- **Rows-per-page is a URL param like any other**, and changing it resets the
  page — page 4 of 10-per-page is not page 4 of 100-per-page. It belongs in the
  toolbar with the filters, not in the footer.
- **Tables open newest-first.** `paginationFields()` defaults to `createdAt`
  descending, matching the API. Do not override it per table without a reason.
- **A table with checkboxes gets bulk remove.** The button appears only when
  something is selected — never sitting there disabled — and the dialog
  **lists the rows by name**: "Delete 12 items?" asks someone to trust a count
  they cannot check, and a mis-click on select-all looks identical to a
  deliberate selection. Clear the selection after a successful removal, or the
  button keeps offering to remove rows that no longer exist.
- **Every module with soft delete gets an Archived tab.** It is the same list
  endpoint with `archived: true`, so it reuses the same table, filters and
  pager. The tab is derived from that one field rather than being separate
  state — two sources for "which half am I looking at" will disagree.
- **Users & Roles is the exception: no remove, no Archived tab.** A staff
  account is never deleted — suspending it is the way out, and that is a status
  change inside Edit. The module has no remove or restore hook, its service has
  no `remove`/`restore`, and `toTeamMember` carries no archive fields. Do not
  "restore consistency" by adding them back.
- **The Archived tab swaps columns and verbs.** It shows "Removed On" and
  "Removed By" in place of columns that mean nothing for a removed record, and
  its only row action is Restore — no Edit, no Remove, no Add button.
- **Whatever the checkbox column offers, both tabs offer.** If a table has
  selection it needs a bulk action on Archived too — Restore there, Remove on
  the live list. Checkboxes with no button is a selection that does nothing.
  Pass `action="restore"` to `BulkDeleteButton`/`BulkDeleteDialog` rather than
  writing a second button and a second dialog.
- **A detail view must open for an archived record.** The Archived tab links to
  it, so a detail endpoint that filters `deletedAt: null` lists a row and then
  404s it. Load it, say it is archived, and offer Restore instead of Edit and
  Remove.
- **A restored record keeps its badge for good.** It is a fact about the
  record, not a transient state; a table that stops saying it after thirty days
  quietly changed what it tells you.
- **There is no permanent delete.** Never add one, and never offer it in a
  menu.
- **A pager shows page numbers, not just the current page.** Pass
  `onPageChange` so they are jumps; `buildPageItems` (`src/lib/pagination.js`)
  decides which to render and where the ellipses fall. Never re-derive that
  windowing in a component.
- **`onPageChange` and the page-size control are opt-in, per module.** Tables
  that are still dummy-backed omit both and keep Prev/Next — that is correct,
  not an oversight. They get wired up when their own module is built. See
  "Fix a module when we reach it, not before" in the root `AGENTS.md`.
- A new filter should be one schema line and nothing else. If it needs a
  hand-written setter or a bespoke memo, extend the shared hook instead.

## Required fields must agree with the API

A form that marks only one field "(Optional)" while six more are optional is
lying, and so is a `required` attribute the server does not enforce. Three
things have to say the same thing: the Zod schema, the input's `required`, and
the label.

Blank numeric inputs are the sharp edge — an empty box sends `""`, which
`Number('')` turns into **0**. The API rejects that for required fields and
treats it as absent for optional ones, but the form should not send it in the
first place.

## Pagination is server-side

The API owns paging. Read `meta` from the response (`page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrevious`) and drive the pager from it. Never fetch a full list and slice it in the browser, and never compute `totalPages` on the client.

Use `placeholderData: keepPreviousData` so the table does not blank out between pages.
