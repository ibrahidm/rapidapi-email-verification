# Email Verification API

Low-cost email verification API ($0.003/verification) distributed via RapidAPI. Zero external API dependencies = ~97% margins.

## Stack

- **Framework:** Nuxt 4
- **Database:** Postgres (raw SQL, no ORM)
- **Deployment:** Vercel
- **Distribution:** RapidAPI marketplace
- **External APIs:** None

## Project Structure

```
shared/
  types/               # Shared types (use #shared/types alias)
server/
  api/v1/              # Endpoints (verify.post.ts, verify/bulk.post.ts)
  middleware/          # RapidAPI validation
  services/verifier/   # Verification logic (syntax, mx, smtp, disposable)
  db/                  # Raw Postgres queries
  data/                # Static data (disposable domains, free providers, trusted providers)
  utils/               # Validation helpers, LRU cache
db/migrations/         # SQL migrations
docs/adr/              # Architecture Decision Records
test/                  # Unit and integration tests
scripts/               # Maintenance scripts
```

## Architecture Decision Records

We use ADRs to document significant architectural decisions. See `docs/adr/` for all records.

Key decisions:
- **ADR-001**: Trusted provider verification via MX detection (skip SMTP for Gmail/Microsoft/etc.)

## Key Commands

```bash
# Development
pnpm dev

# Database
pnpm db:migrate              # Run migrations (requires DATABASE_URL)

# Update disposable domains list
pnpm run update-disposable

# Testing
pnpm test

# Type checking
pnpm typecheck

# Deploy
vercel
```

## API Design

### POST /api/v1/verify

**Input:**
```json
{ "email": "user@example.com" }
```

**Output:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "normalized_email": null,
    "valid": true,
    "result": "deliverable",
    "checks": {
      "syntax": true,
      "mx_records": true,
      "smtp_valid": true,
      "catch_all": false,
      "disposable": false,
      "role_based": false,
      "free_provider": false,
      "plus_addressed": false
    },
    "confidence": 0.95
  }
}
```

**Plus Addressing Example:**
```json
// Input: { "email": "user+newsletter@gmail.com" }
{
  "email": "user+newsletter@gmail.com",
  "normalized_email": "user@gmail.com",
  "checks": {
    "plus_addressed": true,
    // ...
  }
}
```

### POST /api/v1/verify/bulk

Max 100 emails per request. Returns array of results + summary.

## Verification Pipeline

Order matters - fail fast on cheap checks:

```
1. Syntax check           → Regex, instant, free
2. Disposable check       → Set lookup, instant, free
3. Role-based check       → Set lookup, instant, free
4. Free provider check    → Set lookup, instant, free
5. MX record lookup       → DNS query, ~100ms
6. Trusted provider check → MX pattern match, instant (see ADR-001)
7. SMTP verification      → TCP connection, ~500-2000ms (skipped for trusted)
```

### Trusted Provider Detection (ADR-001)

Major providers (Gmail, Microsoft, Yahoo) block SMTP verification. We detect them via:
- **Domain match**: `gmail.com`, `outlook.com`, etc.
- **MX infrastructure**: `wayne.edu` → MX points to `*.protection.outlook.com` → Microsoft 365

If trusted + syntax valid + MX exists → return `deliverable` with 0.85 confidence.

## Verification Modules

### syntax.ts
- RFC 5322 regex validation
- No consecutive dots
- Valid TLD (2+ chars)
- Return early if invalid

### mx.ts
- Use `dns/promises` resolveMx
- Return sorted by priority
- Cache results (domains don't change MX often)

### smtp.ts
- Connect to lowest-priority MX on port 25
- EHLO → MAIL FROM → RCPT TO → QUIT
- Response codes:
  - 250 = deliverable
  - 550/551/552/553 = undeliverable
  - 252 = catch-all (risky)
- Timeout: 10 seconds max
- Handle greylisting with one retry

### disposable.ts
- Load from `server/data/disposable-domains.ts`
- Use Set for O(1) lookup
- Source: github.com/disposable-email-domains/disposable-email-domains
- Update weekly via script

### role-based.ts
- Check local part against known prefixes
- admin, info, support, sales, noreply, etc.
- Not invalid, just flagged

### mx-provider.ts
- Detect email infrastructure from MX records
- Maps MX hostnames to providers (Google, Microsoft, Yahoo, etc.)
- Enables trusted provider detection for custom domains (e.g., universities)

## Coding Standards

- Use TypeScript strict mode
- Keep database queries in `server/db/`
- Each verifier module is pure function, easily testable
- Fail fast - check syntax/disposable before expensive SMTP
- Never store full email addresses in database (privacy)
- Store domain only for analytics

## Error Codes

- `INVALID_SYNTAX` - Email format invalid
- `INVALID_DOMAIN` - Domain doesn't exist
- `NO_MX_RECORDS` - Domain has no mail servers
- `SMTP_ERROR` - Could not connect to mail server
- `TIMEOUT` - Verification timed out
- `RATE_LIMITED` - Too many requests

## Environment Variables

```
DATABASE_URL
RAPIDAPI_PROXY_SECRET
SMTP_TIMEOUT_MS=10000
SMTP_FROM_DOMAIN=yourdomain.com
RATE_LIMIT_DISABLED=false     # Set to true to disable rate limiting (testing only)
```

## Rate Limiting

In-memory sliding window rate limiting provides burst protection:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/v1/verify` | 100 requests | 1 minute |
| `/api/v1/verify/bulk` | 10 requests | 1 minute |
| `/api/v1/health` | 60 requests | 1 minute |

Rate limit headers returned on every response:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in window
- `X-RateLimit-Reset` - Seconds until window resets
- `Retry-After` - Included on 429 responses

Note: RapidAPI also enforces subscription-level rate limits. This in-memory limiter provides additional burst protection but resets on serverless cold starts.

## Result Types

```typescript
type VerificationResult =
  | 'deliverable'    // Mailbox exists, accepts mail
  | 'undeliverable'  // Mailbox doesn't exist
  | 'risky'          // Catch-all domain, can't confirm
  | 'unknown'        // Timeout or error, inconclusive
```

## SMTP Gotchas

- **Catch-all domains:** Many corporate domains accept all. Flag as `risky`, not `deliverable`.
- **Greylisting:** First connection rejected, retry once after 5s delay.
- **Rate limits:** Gmail/Microsoft limit connections. Implement backoff.
- **Shared IPs:** Vercel IPs are shared. May hit reputation issues at scale.
- **Timeouts:** Some servers are slow. 10s timeout, then return `unknown`.

## Disposable Domain Sources

Primary: https://github.com/disposable-email-domains/disposable-email-domains
Secondary: https://github.com/7c/fakefilter

Update script pulls latest and regenerates `server/data/disposable-domains.ts`.

## Caching Strategy

Cache at domain level (not email level):
- MX records: 1 hour TTL
- SMTP catch-all status: 1 hour TTL
- Disposable status: Static (updated weekly)

Don't cache individual email results - privacy concern.

## RapidAPI Integration

Validate headers in middleware:
- `X-RapidAPI-Proxy-Secret` - Must match our secret
- `X-RapidAPI-User` - Log for usage tracking

## Performance Targets

- Response time: <2 seconds (95th percentile)
- Accuracy: >95% correct results
- Uptime: 99.9%

## Testing

- Unit test each verifier module with known emails
- Mock SMTP for unit tests
- Integration tests against real domains (gmail, invalid domains, etc.)
- Test disposable detection against known disposable services

## Don't

- Don't store full email addresses (privacy)
- Don't claim `deliverable` for catch-all domains
- Don't retry SMTP more than once (wastes time)
- Don't block on slow domains - timeout and return `unknown`
- Don't send actual emails to verify (we use RCPT TO check only)
