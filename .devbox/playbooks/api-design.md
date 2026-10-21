# API design

Read this when a feature adds or changes an HTTP, gRPC, GraphQL, event or webhook interface, when writing the Contracts section of `design.md`, or when reviewing with `devbox:backend-lens`.

An API is a product with users you cannot see and cannot update. Once published, its shape is a one-way door. Design the contract first, review it, then implement it.

## Rules

- **API first.** Write the OpenAPI 3.x (3.2 is current), protobuf, or GraphQL schema in `contracts/` (or the repo's schema directory), lint it, and get it reviewed before implementation.
- Design around **resources** (AIP-121): plural nouns, hierarchical names (`/publishers/{publisher}/books/{book}`, AIP-122).
- Use **standard methods** first: Get, List, Create, Update (PATCH with a field mask), Delete. Add custom methods (`POST /books/{book}:archive`) only when standard methods cannot express the operation.
- Be consistent within one API: one casing for properties (pick snake_case or camelCase and never mix), kebab-case paths, one date format (RFC 3339, UTC).
- Always return a JSON **object** at the top level, never a bare array, so the response can grow.
- Authenticate every endpoint and authorize every object access (BOLA is number one in the OWASP API Security Top 10). Define required scopes per operation.
- Validate requests against the schema at the edge; reject unknown or malformed input with a clear error.
- Paginate every list from day one.
- Make retries safe: idempotent methods are idempotent; non-idempotent ones accept idempotency keys.
- Never break clients within a version.

## Errors: RFC 9457 problem details

Return `application/problem+json`:

```json
{
  "type": "https://api.example.com/problems/insufficient-funds",
  "title": "Insufficient funds",
  "status": 422,
  "detail": "Balance is 30.00 EUR, the transfer needs 50.00 EUR.",
  "instance": "/transfers/7f3c",
  "balance_minor": 3000
}
```

- `type` is an absolute URI (defaults to `about:blank`); `status` matches the HTTP status.
- Extension members are allowed; clients ignore unknown members.
- Never expose stack traces, SQL or internal IDs.
- Use the most specific standard status: 400 malformed, 401 unauthenticated, 403 forbidden, 404 not found (also for objects the caller may not know exist), 409 conflict, 412 precondition failed (ETag), 422 semantically invalid, 429 rate limited, 503 temporarily unavailable.

## Pagination

- Prefer opaque cursor tokens over offsets (AIP-158): request `page_size`, `page_token`; response `next_page_token` (empty when done).
- Default page size when missing; cap at a documented maximum and clamp silently or reject consistently.
- Tokens are opaque and may expire; never let clients construct them.
- Ordering must be stable (include a unique tiebreaker such as id).

## Idempotency

- PUT and DELETE are idempotent by definition; make the implementation match.
- POST and PATCH that create or move value accept an `Idempotency-Key` header (de facto standard; the IETF draft expired but the pattern holds) or a client-supplied request id (AIP-155).
- Store the key, a fingerprint of the request, and the first response for a TTL (for example 24 hours).
- On retry with the same key and same payload, return the stored response. Same key with a different payload: 409 or 422.
- Make the key check and the write atomic (unique constraint), or concurrent retries will double-execute.

## Compatibility and versioning

Compatible within a version (additive only):

- Add optional request fields, new response fields, new endpoints, new enum values only if clients were told to tolerate unknown values.

Breaking (needs a new major version):

- Removing or renaming fields, changing types or meaning, making optional fields required, tightening validation, changing defaults, changing error codes clients rely on.

Pick **one** versioning convention per API and document it in an ADR:

| Style | Convention |
|-------|-----------|
| Google | major version in the path (`/v1/`), stability channels (alpha, beta) |
| Azure | `api-version` query parameter with date versions |
| Zalando | avoid versioning; media-type versioning when unavoidable |

Gate breaking changes in CI: `oasdiff breaking` for OpenAPI, `buf breaking` for protobuf, schema diff for GraphQL.

## Deprecation

- Announce with `Deprecation` and `Sunset` headers and a link to migration docs.
- Publish a deprecation policy (minimum notice period) and measure remaining usage before removal.

## Long-running operations

- Work that takes more than a few seconds returns an operation resource (AIP-151): `202 Accepted` with `{ "name": "operations/abc", "done": false }`. Clients poll `GET /operations/abc` or subscribe to a webhook.
- Operations report progress, result or error, and can be cancelled where possible.

## Rate limits

- Limit per client and per expensive operation. Return 429 with `Retry-After` and rate limit headers.
- Document limits. Cap payload sizes and query complexity.

## Events and webhooks

- Version event schemas like APIs; publish them (AsyncAPI, JSON Schema, protobuf).
- Use the **transactional outbox**: write the event to an outbox table in the same transaction as the state change, then relay. Never dual-write to the database and the broker.
- Consumers are **idempotent** (dedupe on event id) and tolerate out-of-order delivery.
- Webhooks: sign every payload (HMAC with a timestamp to block replays), retry with exponential backoff and jitter, provide a delivery log and manual redelivery, and tell receivers to respond fast and process async.

## gRPC and protobuf

- Follow the Buf style guide; lint with `buf lint`; gate with `buf breaking`.
- Never reuse or renumber a field. When removing one, mark its number and name `reserved`.
- Add new fields as optional; zero values must be safe defaults.
- Use standard error details (`google.rpc.Status`) and deadlines on every call.

## GraphQL

- Batch data loading with dataloaders to avoid N+1 queries.
- Enforce query depth and complexity limits; disable introspection in production if the schema is not public.
- Authorize at the field or resolver level, not only at the query entry.
- Evolve by adding fields and deprecating with `@deprecated(reason: ...)`; avoid versioned schemas.
- Use cursor-based connections for pagination.

## Checklist

- [ ] Contract written and reviewed before code; lives in the repo
- [ ] Resource names, methods and casing consistent
- [ ] Errors are RFC 9457 problem details; no internals leaked
- [ ] Every list paginated with a default and a max
- [ ] Non-idempotent writes accept idempotency keys, enforced atomically
- [ ] Authn and per-object authz on every operation, with tests for forbidden access
- [ ] Rate limits and payload caps documented
- [ ] Breaking-change check in CI
- [ ] Versioning convention recorded in an ADR
- [ ] Events go through an outbox; consumers idempotent; webhooks signed

## Anti-patterns

- RPC-over-HTTP with verbs in paths (`/getUserById`).
- Returning 200 with `{ "error": ... }`.
- Unbounded list endpoints.
- Retries without idempotency, which double-charge.
- Silent breaking changes "because nobody uses that field".
- Exposing database row shapes directly as the API.

## Sources

- Google AIP: https://google.aip.dev
- Microsoft API guidelines (azure/ and graph/): https://github.com/microsoft/api-guidelines
- Zalando RESTful API guidelines: https://opensource.zalando.com/restful-api-guidelines/
- RFC 9457 Problem Details: https://www.rfc-editor.org/rfc/rfc9457
- RFC 9110 HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110
- Idempotency-Key draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- OpenAPI: https://spec.openapis.org
- Buf style guide: https://buf.build/docs/best-practices/style-guide
- GraphQL best practices: https://graphql.org/learn/best-practices/
- OWASP API Security Top 10: https://owasp.org/API-Security/
