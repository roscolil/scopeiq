# Admin Console

The Admin Console provides a protected interface for managing taxonomy resources that enhance AI search, disambiguation, and contextual understanding: **Categories** and **Abbreviations**.

## Access & Authorization

- Route: `/admin`
- Guarded by `AdminGuard` (`src/components/routing/AdminGuard.tsx`), which permits only users whose role satisfies `isAuthorized({ requireRole: 'Admin' })`.
- Navigation link appears conditionally in `Navbar.tsx` only when the current user is an Admin.

## Data Model

### Category

| Field               | Type    | Notes                                  |
| ------------------- | ------- | -------------------------------------- |
| `id`                | string  | Backend identifier                     |
| `name`              | string  | Required, unique per tenant (assumed)  |
| `description`       | string? | Optional contextual info               |
| `abbreviationCount` | number? | Provided by backend for quick UI badge |

### Abbreviation

| Field           | Type      | Notes                                              |
| --------------- | --------- | -------------------------------------------------- |
| `id`            | string    | Backend identifier                                 |
| `term`          | string    | Short form (e.g., PPE)                             |
| `expansion`     | string    | Full meaning (e.g., Personal Protective Equipment) |
| `categoryId`    | string?   | Optional link to a Category                        |
| `usageExamples` | string[]? | Optional examples (multi-line input)               |

## Pagination

The UI uses page + pageSize. Service translates to `skip` + `limit` query parameters.

- Default page size: 24 (AdminConsole) but service functions accept a custom value.
- Backend response normalization handles both envelope `{ data, total, skip, limit }` and raw arrays.
- `hasMore` computed via `skip + items.length < total`.

## Services

Implemented in `src/services/api/admin-taxonomy.ts`:

- `listCategories(page, pageSize)` → `GET /api/v1/categories/` with `?skip&limit`
- `createCategory(input)` → `POST /api/v1/categories`
- `updateCategory(id, input)` → `PUT /api/v1/categories/:id`
- `deleteCategory(id)` → `DELETE /api/v1/categories/:id`
- `listAbbreviations(page, pageSize, categoryId?)` → `GET /api/v1/abbreviations/`
- `createAbbreviation(input)` → `POST /api/v1/abbreviations`
- `updateAbbreviation(id, input)` → `PUT /api/v1/abbreviations/:id`
- `deleteAbbreviation(id)` → `DELETE /api/v1/abbreviations/:id`

### Trailing Slash Behavior

The backend currently issues a `307` redirect (and incorrectly downgrades scheme) if the collection endpoints are requested without a trailing slash. The service proactively appends `/` to `categories` and `abbreviations` list URLs to avoid fetch failures.

## Environment Variables

| Variable                              | Default         | Purpose                                               |
| ------------------------------------- | --------------- | ----------------------------------------------------- |
| `VITE_PYTHON_AI_BACKEND_URL`          | (required)      | Base URL for Python backend (no trailing slash)       |
| `VITE_TAXONOMY_API_VERSION_PREFIX`    | `/api/v1`       | API version segment; configurable for future versions |
| `VITE_TAXONOMY_CATEGORIES_SEGMENT`    | `categories`    | Allows backend path override                          |
| `VITE_TAXONOMY_ABBREVIATIONS_SEGMENT` | `abbreviations` | Allows backend path override                          |

## Auth Strategy

- Authorization header currently **disabled for diagnostics**. Re-enable by injecting JWT from Amplify (`getAuthToken()`) and adding `Authorization: Bearer <token>` in `jsonFetch` if backend enforces auth.
- Guard-level protection still prevents casual UI access.

## Error Handling & Diagnostics

- Non-OK responses log status + body (development only).
- JSON parse errors logged distinctly.
- Abbreviation list includes defensive remapping of legacy keys: `definition` → `expansion`, `abbreviation` → `term`.
- Unknown list envelopes emit a warning.

## UI Behavior

- Categories displayed as responsive cards with abbreviation count badge.
- Abbreviations displayed as a vertical list; category names resolved client-side via in-memory map.
- Create/Edit forms validate required fields and provide inline error messages.
- Delete actions use confirmation dialogs.
- Refresh button reloads both lists concurrently.

## Extension Points

1. **Search / Filter**: Add text filter state and pass as query param (e.g., `q=...`) once backend supports it.
2. **Bulk Actions**: Introduce checkbox selection + batch delete route.
3. **Import/Export**: Add upload (CSV/JSON) and download endpoints for taxonomy portability.
4. **Role Expansion**: Allow Owners to have read-only access by adjusting `AdminGuard` logic to `requireRole: ['Admin','Owner']` and gating mutations.
5. **Inline Editing**: Replace modal with inline editable rows/cards with optimistic updates.
6. **Server-Side Sorting**: Add `sort` param mapping when backend implements sorting.

## Re-Enabling Auth (Checklist)

1. Remove the temporary diagnostic comment around auth in `jsonFetch`.
2. Retrieve token via `getAuthToken()`; if present append `Authorization` header.
3. Confirm CORS allows `Authorization` in `Access-Control-Allow-Headers`.
4. Test 401 fallback path and provide user-facing toast for session expiry.

## Testing Suggestions

- Unit test `transformListResponse` with envelope + raw array shapes.
- Integration test (mock fetch) for trailing-slash path generation.
- Snapshot test for abbreviation legacy key remapping.

## Known Caveats

- Trailing slash requirement is a temporary backend quirk; remove code comments once backend normalizes redirects.
- No optimistic update rollback on failure—currently reverts only by refetch or manual correction.

## Quick Dev Notes

- To add a new taxonomy entity type (e.g., Synonyms), replicate the pattern: segment constants, service CRUD, tab UI, list + form, integrate into Admin Console Tabs.
- Keep all new docs in `src/docs` for internal developer reference; user-facing documentation should live in root `/README.md` or a dedicated external docs site.

---

Maintainer Notes: Update this file whenever API versioning or authentication model changes to keep onboarding smooth.
