# Data layer

Axios + TanStack Query. The rule that shapes everything here:

> **Components render. Hooks decide.**
> Toasts, redirects, cache writes and error handling live in hooks — never in a
> page or component.

## Hooks return the query or mutation, unchanged

No hook invents its own return shape. Query hooks return the React Query result
and mutation hooks return the mutation, so a component destructures exactly what
it needs and nothing is hidden behind a hand-written wrapper:

```jsx
// query — everything React Query exposes is available
const { data: user, isLoading, isError, refetch } = useCurrentUser();

// mutation — rename `mutate` at the call site to read well
const { mutate: login, isPending, error } = useLogin();
login({ email, password, rememberMe });

// field-level API errors hang off the error object
<CommonInput error={error?.fieldErrors?.email} />
```

The page still never learns whether two-factor was required, never calls
`router.push`, never calls `toast` — all of that stays in the hook.

Screens in a multi-step flow pair a mutation with `useAuthFlowGuard`, which owns
the "no challenge in progress" redirect so the mutation hooks stay pure:

```jsx
const { challengeEmail } = useAuthFlowGuard("twoFactor", "/sign-in");
const { mutate: verify, isPending } = useVerifyTwoFactor();
```

## Layout

```
src/
├── config/
│   └── query.config.js env-driven timings + named presets
├── lib/
│   ├── axios.js        configured instance: cookies, CSRF, error shape, refresh
│   ├── queryClient.js  the global client + invalidate/clear helpers
│   ├── queryKeys.js    every query key, in one place
│   ├── toast.js        the only place goey-toast is imported
│   └── user.js         display helpers (role labels, full name)
├── providers/
│   └── QueryProvider.jsx   wraps the app, mounts <Toaster />
├── services/
│   └── auth.service.js     thin HTTP wrappers — no side effects
├── hooks/
│   └── auth/               one file per operation
└── store/
    └── useAuthStore.js     UI-only flow state (zustand, sessionStorage)
```

**Services do HTTP and nothing else.** No toasts, no navigation, no cache. That
keeps them reusable from anywhere and trivial to reason about.

## Query timings live in env, not in hooks

No hook hard-codes a `staleTime` or a `retry`. Everything comes from
`config/query.config.js`, which reads `NEXT_PUBLIC_QUERY_*` (see
`.env.example`), so cache behaviour is a deployment change rather than a code
change.

Hooks pick a **named preset** describing the kind of data they hold:

| Preset | For | Behaviour |
|---|---|---|
| `session` | `GET /auth/me` | long stale, **retry off** — a 401 is the ordinary signed-out state |
| `standard` | ordinary lists and details | global defaults |
| `static` | airports, aircraft types, roles | very long stale, no focus refetch |
| `live` | dashboards, flight tracking | always stale, polls on an interval |

```js
useQuery({ queryKey, queryFn, ...queryPresets.session, ...options });
```

`shouldRetry` is shared: a 4xx is never retried, because the server already
answered definitively and retrying only delays the error the user needs to see.
Retryable failures back off exponentially from `RETRY_DELAY` up to
`RETRY_DELAY_MAX`.

## Adding an endpoint

1. Add the call to `src/services/<domain>.service.js`
2. Add its key to `src/lib/queryKeys.js`
3. Add `src/hooks/<domain>/useThing.js`, which owns the side effects
4. Export it from `src/hooks/<domain>/index.js`

## Global cache invalidation

`lib/queryClient.js` exports a module-level client, so any hook file — or a
plain helper, or an axios interceptor — can touch the cache without being
inside a component that could call `useQueryClient()`:

```js
import { invalidate, clearAllQueries } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";

await invalidate(queryKeys.clients.all);   // refetch anything mounted
clearAllQueries();                          // on sign-out
```

Keys are arrays, so a prefix invalidates everything beneath it: `["clients"]`
also clears `["clients", "detail", id]`.

`QueryProvider` uses that same instance rather than `useState(new
QueryClient())` — otherwise invalidating from a hook file would update a cache
nothing is subscribed to.

## The API is proxied

The browser only ever talks to its own origin. `next.config.mjs` rewrites
`/api/*` to `API_PROXY_TARGET`, and `NEXT_PUBLIC_API_URL` defaults to the
relative `/api`.

That makes session cookies **first-party**: no CORS preflight, no SameSite
negotiation, and nothing for a browser's third-party-cookie rules to block. It
also means the API host is never exposed to the client.

`API_PROXY_TARGET` has no `NEXT_PUBLIC_` prefix on purpose — it is read by the
Next server at build/start time and never shipped to the browser.

Point `NEXT_PUBLIC_API_URL` at an absolute URL to bypass the proxy; the API's
`CORS_ORIGINS` must then include the web origin.

> **Client IPs survive the proxy.** Next forwards `X-Forwarded-For`, and the API
> runs with `trust proxy`, so per-IP rate limiting still identifies real
> clients. Verified end to end — without it, one user hitting the login limit
> would lock out everyone.

## Three layers of auth, on purpose

No single check is sufficient, and each covers the one below it:

| Layer | File | Answers | Cost |
|---|---|---|---|
| 1. Edge gate | `src/proxy.js` | "Any sign of a session?" | Cookie read, before render |
| 2. Response interceptor | `lib/axios.js` → `handleSessionExpiry` | "Did the server just reject us?" | Free — reuses a failed request |
| 3. **The API** | NestJS middleware + guards | "May you do this?" | Per request |

**Layer 3 is the only real security boundary.** 1 and 2 are UX: they decide what
renders, not what a user is allowed to have.

**Why layer 1 exists:** a client guard cannot stop a server component from
rendering. Without the proxy, an unauthenticated visitor hitting a dashboard URL
still causes that page's server component to run, and its output lands in the
RSC payload before anything checked who they are. The proxy redirects first, so
nothing renders at all — and a hard refresh no longer flashes the splash.

**Why layer 1 is not enough:** the session cookies are httpOnly and opaque, so
the edge can see that a cookie *exists*, never that it is valid. A revoked or
expired session still carries cookies and sails straight through.

**Why layer 2 catches the rest:** it reacts to what the server actually said.
Any 401 that survives a refresh attempt means the session is dead, whichever
endpoint reported it — so expiry is handled once, centrally, instead of every
screen checking for itself.

There is deliberately **no wrapper component** gating the dashboard. One would
add a blocking `/auth/me` round trip and a splash to every navigation, to catch
a case the interceptor already handles for free.

> `src/proxy.js`, not `middleware.js` — the middleware convention is
> **deprecated in Next.js 16** and renamed to `proxy`. Same behaviour, new file
> and export name.

### Which cookie the edge gate checks

`tj_refresh` is path-scoped to `/api/auth`, so the browser never sends it to a
page route — the proxy cannot see it. And `tj_access` lives 15 minutes while the
session behind it lasts days, so gating on that alone would sign people out
every quarter hour despite a healthy refresh token.

It checks `tj_access` **or** `tj_csrf`: the latter is issued and cleared with the
session and shares the refresh token's lifetime, making it the honest signal for
*maybe* signed in.

### Returning to the requested page

When the proxy bounces someone it appends `?next=`, and `useRedirectTarget`
sends them there after sign-in. Only root-relative paths are honoured —
`https://evil.com` and `//evil.com` both fall back to `/dashboard`. A
plausible-looking `?next=` on a real sign-in page is exactly how phishing
redirects get laundered.

## Session expiry

`handleSessionExpiry` is registered with the axios layer in `QueryProvider`, at
module scope, so it is wired before any component can render or any request can
fail. It fires when a 401 survives a refresh attempt — from any endpoint, not
just the session check.

Concurrent 401s are common (a dashboard has several queries in flight), so a
module-level latch makes sure only the first one tears down and navigates.

It then tears down everything that identifies the user, *before* redirecting:

1. `POST /auth/logout` so the server clears the httpOnly cookies — JavaScript
   cannot touch `tj_access` / `tj_refresh` itself. Skipped when the 401 already
   told us the session is gone.
2. Deletes the readable cookies it can (`tj_csrf`), across every path prefix
   they might be scoped to — a cookie on `/api/auth` is not removed by deleting
   it at `/`.
3. Clears the zustand auth store **and its persisted sessionStorage copy**.
4. `clearAllQueries()`.

Redirect is a full page load rather than a router push: it guarantees nothing
in memory survives, and the edge proxy then handles the request normally on the
way in. Session expiry is rare and terminal, so losing the SPA transition is the
right trade. `?next=` preserves where the user was.

On an auth screen it tears down quietly without redirecting — there is nowhere
to send them.

## Auth specifics

Sessions are **httpOnly cookies**. There is no token in JavaScript, so:

- `withCredentials: true` is mandatory or the cookie is never sent.
- Writes carry `X-CSRF-Token`, read from the deliberately-readable `tj_csrf`
  cookie. The request interceptor does this automatically for POST/PATCH/DELETE.
- The app cannot decode a token to find out who is signed in — `useCurrentUser`
  (`GET /auth/me`) is the source of truth.

**Refresh is single-flight.** Access tokens last 15 minutes, so several queries
can 401 at once. Without a shared promise each would fire its own refresh, and
the API's rotation-reuse detection would read the concurrent attempts as a
stolen token and kill the session.

`clearAllQueries()` on sign-out is a security measure, not tidiness: leaving one
user's clients and financials cached for whoever signs in next on the same
browser is a data leak.

## Toasts

`lib/toast.js` is the only module that imports `goey-toast`, so the library is
swappable from one file. Use `toastSuccess`, `toastInfo`, `toastApiError` and
`toastDevCode` rather than calling the library directly — durations and class
names are set once there.

## Errors

Every failure is normalised to one shape, so hooks never dig through
`error.response.data`:

```js
{ message, statusCode, fieldErrors, isNetworkError }
```

`fieldErrors` mirrors the API's Zod output (`{ email: "Invalid email address" }`)
and is what `CommonInput`'s `error` prop binds to. Hooks toast `message` and
return `fieldErrors` for the form.

## The 6-digit codes in development

With no SMTP configured the API returns the code in `devCode`, and the hooks
surface it as a long-lived toast — so the OTP screens work without a mailbox. It
disappears once `SMTP_*` is set, and the API refuses to start in production
without SMTP.

## Configuration

`NEXT_PUBLIC_API_URL` in `.env.local` (see `.env.example`). It must include the
`/api` prefix.

In production the API must share a parent domain with the web app
(`api.tribecajetscommandcenter.com` vs the apex) or the session cookie will not
be valid for both.
