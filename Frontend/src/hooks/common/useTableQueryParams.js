"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps a table's tab, page, search, filters and sort in the URL.
 *
 * The URL is the state, not a mirror of it. A pasted or reloaded link
 * reproduces exactly what the user was looking at, and back/forward step
 * through those views — neither of which is possible when this lives in a
 * store or in `useState`.
 *
 * Every table in the app uses this hook rather than hand-rolling
 * `useSearchParams` juggling, because the fiddly parts (defaults omitted from
 * the URL, resetting the page when a filter changes, clamping hostile values,
 * debouncing search) are easy to get subtly wrong once per table.
 *
 * @param schema  Field definitions, keyed by param name. Each entry is
 *                `{ default, parse?, serialise?, resetsPage? }`.
 *                `parse` receives the raw string and returns the value to use,
 *                returning `undefined` to fall back to the default.
 * @param options `{ pageKey }` — the field that holds the page number, reset to
 *                its default whenever a `resetsPage` field changes.
 */
export function useTableQueryParams(schema, { pageKey = "page" } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(() => {
    const result = {};
    for (const [key, field] of Object.entries(schema)) {
      const raw = searchParams.get(key);
      if (raw === null || raw === "") {
        result[key] = field.default;
        continue;
      }
      // URL content is untrusted: a hand-edited `?page=-5&limit=99999` must
      // degrade to the default rather than reach the API and 400 (or worse,
      // succeed and pull the whole table).
      const parsed = field.parse ? field.parse(raw) : raw;
      result[key] = parsed === undefined || parsed === null ? field.default : parsed;
    }
    return result;
  }, [schema, searchParams]);

  /**
   * Writes the next query string.
   *
   * `replace`, not `push`: a filter change is a refinement of the current view,
   * not a navigation. Pushing would make the back button walk backwards through
   * every intermediate filter state instead of leaving the page.
   */
  const setValues = useCallback(
    (patch, { replace = true } = {}) => {
      const next = new URLSearchParams(searchParams.toString());

      const touchesFilter = Object.keys(patch).some(
        (key) => schema[key]?.resetsPage,
      );

      for (const [key, value] of Object.entries(patch)) {
        const field = schema[key];
        if (!field) continue;
        const serialised = field.serialise ? field.serialise(value) : value;
        // Defaults are omitted, so page 1 with no filters is a bare URL rather
        // than a wall of `?page=1&role=ALL&sortOrder=desc`.
        if (
          serialised === undefined ||
          serialised === null ||
          serialised === "" ||
          serialised === field.default
        ) {
          next.delete(key);
        } else {
          next.set(key, String(serialised));
        }
      }

      // Landing on page 4 of a now-single-page result set shows an empty table
      // with no way back, so any filter change returns to the first page.
      if (touchesFilter && !(pageKey in patch)) {
        next.delete(pageKey);
      }

      const query = next.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      // `scroll: false` — re-filtering a table should not throw the user back
      // to the top of the page.
      router[replace ? "replace" : "push"](url, { scroll: false });
    },
    [pathname, router, schema, searchParams, pageKey],
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  /**
   * What actually goes to the API — and, because it is also the query key,
   * what a refetch is keyed on.
   *
   * Two things are dropped. Fields marked `local` never leave the browser (a
   * tab id is view state, and including it would refetch the table every time
   * someone switched tabs). Empty values are omitted rather than sent as `""`,
   * which the API rejects as an invalid enum.
   *
   * Built here rather than in each module's hook because every module was
   * writing the same memo, and the `local` distinction is the kind of thing
   * that gets forgotten once per table.
   */
  const queryParams = useMemo(() => {
    const params = {};
    for (const [key, field] of Object.entries(schema)) {
      if (field.local) continue;
      const value = values[key];
      if (value === undefined || value === null || value === "") continue;
      params[key] = value;
    }
    return params;
  }, [schema, values]);

  /**
   * One `setX` per field, derived from the schema.
   *
   * These were hand-written per module — a dozen near-identical `useCallback`
   * wrappers whose only job was to name the field they set. Generating them
   * means a new filter needs a schema entry and nothing else.
   */
  const setters = useMemo(() => {
    const result = {};
    for (const key of Object.keys(schema)) {
      const name = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      result[name] = (value) => setValues({ [key]: value });
    }
    return result;
  }, [schema, setValues]);

  /**
   * Page movement, clamped.
   *
   * `pageCount` comes from the server's `meta.totalPages`. Clamping here rather
   * than at each call site is why containers no longer carry their own
   * `Math.max(page - 1, 1)`, which was easy to write as `Math.min` by mistake.
   */
  const goToPage = useCallback(
    (page, pageCount = Number.MAX_SAFE_INTEGER) => {
      const clamped = Math.min(Math.max(Number(page) || 1, 1), Math.max(pageCount, 1));
      setValues({ [pageKey]: clamped });
    },
    [setValues, pageKey],
  );

  return { values, setValues, reset, queryParams, setters, goToPage };
}

/**
 * A search box that stays instant while the URL lags behind it.
 *
 * Writing every keystroke to the URL would put one history entry and one
 * request per character. Writing only the debounced value would make the input
 * feel broken. So the field is controlled locally and the URL catches up.
 *
 * @returns `[value, setValue]` for the input to bind to.
 */
export function useDebouncedParam(value, onCommit, delay = 350) {
  const [draft, setDraft] = useState(value ?? "");
  const committed = useRef(value ?? "");

  // Keep the field honest when the URL changes from somewhere else — a back
  // navigation, or a "clear filters" button — without clobbering typing.
  useEffect(() => {
    const incoming = value ?? "";
    if (incoming !== committed.current) {
      committed.current = incoming;
      setDraft(incoming);
    }
  }, [value]);

  useEffect(() => {
    if (draft === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = draft;
      onCommit(draft);
    }, delay);
    return () => clearTimeout(timer);
  }, [draft, delay, onCommit]);

  return [draft, setDraft];
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/** A positive integer, clamped to `[min, max]`. Anything else → default. */
export function intParam(min = 1, max = Number.MAX_SAFE_INTEGER) {
  return (raw) => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return undefined;
    return Math.min(Math.max(parsed, min), max);
  };
}

/**
 * One of a fixed set, compared case-sensitively.
 *
 * Case-sensitive on purpose: the wire vocabulary is the backend's
 * `SCREAMING_SNAKE_CASE`, and silently accepting `senior_broker` here would
 * hide a bug that the API would reject anyway.
 */
export function enumParam(allowed) {
  const set = new Set(allowed);
  return (raw) => (set.has(raw) ? raw : undefined);
}

/** Free text, trimmed and length-capped so a huge URL cannot reach the API. */
export function stringParam(maxLength = 200) {
  return (raw) => {
    const trimmed = raw.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
  };
}

// ---------------------------------------------------------------------------
// Field builders
//
// Every table repeats the same page/limit/sort/search fields. Declaring them
// here means a module's schema states only what is actually specific to it:
// its filters and its sortable columns.
// ---------------------------------------------------------------------------

/**
 * Rows per page when the URL does not say.
 *
 * Must match `DEFAULT_PAGE_SIZE` in the API's `common/dto/pagination.dto.ts`,
 * so an unparameterised request and a freshly loaded table agree on what page
 * 1 contains.
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Choices in the rows-per-page dropdown.
 *
 * 100 is the API's hard cap (`MAX_PAGE_SIZE`); anything above it is refused
 * there, so it is the last option rather than a larger round number.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * The page, limit, sortBy and sortOrder fields every list screen needs.
 *
 * @param sortBy   Sortable columns, matching the API's allowlist exactly. A
 *                 value the API would reject must not survive the URL either.
 * @param defaults `{ sortBy, sortOrder, limit }` starting values.
 */
export function paginationFields(sortBy, { sortBy: defaultSortBy = "createdAt", sortOrder = "desc", limit = DEFAULT_PAGE_SIZE } = {}) {
  return {
    page: {
      default: 1,
      // Clamped rather than passed through: `?page=-5` must show page 1, not
      // produce a 400 from the API.
      parse: intParam(1, 10_000),
    },
    limit: {
      default: limit,
      // Capped at the API's own ceiling, so `?limit=99999` degrades to the
      // largest page the server would actually serve.
      parse: intParam(1, PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1]),
      // A different page size renumbers every page, so page 4 of 10-per-page
      // is not page 4 of 100-per-page.
      resetsPage: true,
    },
    sortBy: { default: defaultSortBy, parse: enumParam(sortBy), resetsPage: true },
    sortOrder: { default: sortOrder, parse: enumParam(["asc", "desc"]), resetsPage: true },
  };
}

/** A debounced free-text search field. Pair with `useDebouncedParam`. */
export function searchField(maxLength = 200) {
  return { default: "", parse: stringParam(maxLength), resetsPage: true };
}

/**
 * A dropdown filter over a fixed set, where empty means "all".
 *
 * `allowed` is the wire vocabulary (`SENIOR_BROKER`), not display labels — the
 * URL carries what the API carries, and the label mapping happens at render.
 */
export function filterField(allowed) {
  return { default: "", parse: enumParam(allowed), resetsPage: true };
}
