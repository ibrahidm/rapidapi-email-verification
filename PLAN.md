# Email Verification API - Project Plan

## Overview

A low-cost email verification API distributed via RapidAPI. Undercuts ZeroBounce, NeverBounce, and others by 50-80%. Zero external API dependencies = near-100% margins.

**Pricing Target:** $0.003/verification
**Revenue Goal:** $30+/month (10,000+ verifications/month)

---

## Architecture

### Tech Stack
- **Framework:** Nuxt 4
- **Database:** Postgres (raw SQL, no ORM)
- **Deployment:** Vercel
- **Distribution:** RapidAPI marketplace
- **External APIs:** None (all verification logic is self-contained)

### System Flow
```
Email Input
       │
       ▼
┌─────────────────┐
│  RapidAPI       │  ← Handles auth, rate limiting, billing
│  Gateway        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /api/v1/verify │  ← Our Nuxt API endpoint
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Syntax Check   │  ← RFC 5322 regex validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MX Lookup      │  ← DNS query for mail exchange records
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SMTP Check     │  ← Connect to mail server, verify mailbox
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Disposable     │  ← Check against known disposable domains
│  Detection      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │  ← Structured JSON with all check results
└─────────────────┘
```

---

## API Design

### Endpoint: POST /api/v1/verify

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "valid": true,
    "result": "deliverable",
    "checks": {
      "syntax": true,
      "mx_records": true,
      "smtp_valid": true,
      "catch_all": false,
      "disposable": false,
      "role_based": false,
      "free_provider": false
    },
    "provider": {
      "domain": "example.com",
      "type": "business"
    },
    "confidence": 0.95
  },
  "meta": {
    "processing_time_ms": 1230
  }
}
```

**Result Values:**
- `deliverable` - Email exists and accepts mail
- `undeliverable` - Mailbox does not exist
- `risky` - Catch-all domain, cannot confirm individual mailbox
- `unknown` - Could not verify (server timeout, etc.)

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SYNTAX",
    "message": "Email address has invalid format"
  }
}
```

### Endpoint: POST /api/v1/verify/bulk

**Request:**
```json
{
  "emails": ["user1@example.com", "user2@example.com"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [...],
    "summary": {
      "total": 10,
      "deliverable": 7,
      "undeliverable": 2,
      "risky": 1
    }
  }
}
```

**Limits:** Max 100 emails per bulk request

---

## Project Structure

```
/
├── server/
│   ├── api/
│   │   └── v1/
│   │       ├── verify.post.ts        # Single email verification
│   │       ├── verify/
│   │       │   └── bulk.post.ts      # Bulk verification
│   │       └── health.get.ts         # Health check
│   ├── middleware/
│   │   └── rapidapi.ts               # RapidAPI header validation
│   ├── services/
│   │   ├── verifier/
│   │   │   ├── index.ts              # Main orchestrator
│   │   │   ├── syntax.ts             # RFC 5322 validation
│   │   │   ├── mx.ts                 # MX record lookup
│   │   │   ├── smtp.ts               # SMTP verification
│   │   │   ├── disposable.ts         # Disposable email detection
│   │   │   └── role-based.ts         # Role-based detection
│   │   └── types.ts                  # Verification types
│   ├── db/
│   │   ├── index.ts                  # Postgres client
│   │   └── usage.ts                  # Usage tracking queries
│   ├── data/
│   │   ├── disposable-domains.ts     # Known disposable domains
│   │   ├── free-providers.ts         # Free email providers (gmail, etc.)
│   │   └── role-prefixes.ts          # Role-based prefixes (admin, info, etc.)
│   └── utils/
│       └── validation.ts             # Input validation helpers
├── lib/
│   └── types.ts                      # Shared TypeScript types
├── db/
│   └── migrations/
│       └── 001_init.sql              # Database schema
├── test/
│   ├── unit/
│   │   ├── syntax.test.ts
│   │   ├── mx.test.ts
│   │   └── disposable.test.ts
│   └── integration/
│       └── api.test.ts
├── scripts/
│   └── update-disposable-list.ts     # Script to update disposable domains
├── .env.example
├── nuxt.config.ts
└── README.md
```

---

## Verification Logic

### 1. Syntax Validation
```typescript
// RFC 5322 compliant regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// Additional checks:
// - No consecutive dots
// - Domain has at least one dot
// - TLD is valid (2+ chars)
```

### 2. MX Record Lookup
```typescript
import { resolveMx } from 'dns/promises'

async function checkMx(domain: string): Promise<MxResult> {
  try {
    const records = await resolveMx(domain)
    return {
      valid: records.length > 0,
      records: records.sort((a, b) => a.priority - b.priority)
    }
  } catch {
    return { valid: false, records: [] }
  }
}
```

### 3. SMTP Verification
```typescript
// Connect to mail server and verify mailbox exists
// WITHOUT sending actual email

// 1. Connect to MX server on port 25
// 2. Send EHLO/HELO
// 3. Send MAIL FROM:<verify@ourdomain.com>
// 4. Send RCPT TO:<target@theirdomain.com>
// 5. Check response code:
//    - 250 = mailbox exists
//    - 550 = mailbox doesn't exist
//    - 252 = catch-all (cannot verify)
// 6. Send QUIT

// Important: Respect rate limits, handle timeouts gracefully
```

### 4. Disposable Email Detection
```typescript
// Maintain list of 100k+ disposable domains
// Sources:
// - https://github.com/disposable-email-domains/disposable-email-domains
// - https://github.com/7c/fakefilter

const isDisposable = (domain: string): boolean => {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase())
}
```

### 5. Role-Based Detection
```typescript
const ROLE_PREFIXES = [
  'admin', 'info', 'support', 'sales', 'contact',
  'help', 'billing', 'hello', 'team', 'no-reply',
  'noreply', 'postmaster', 'webmaster', 'abuse'
]

const isRoleBased = (localPart: string): boolean => {
  return ROLE_PREFIXES.some(prefix =>
    localPart.toLowerCase() === prefix ||
    localPart.toLowerCase().startsWith(prefix + '.')
  )
}
```

### 6. Free Provider Detection
```typescript
const FREE_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
  'zoho.com', 'yandex.com', 'gmx.com', 'live.com'
  // ... ~100 more
]
```

---

## Database Schema

```sql
-- db/migrations/001_init.sql

CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapidapi_user TEXT,
  email_domain TEXT,           -- Store domain only, not full email (privacy)
  result TEXT NOT NULL,        -- deliverable, undeliverable, risky, unknown
  processing_time_ms INT,
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_created_at ON usage(created_at);
CREATE INDEX idx_usage_rapidapi_user ON usage(rapidapi_user);
CREATE INDEX idx_usage_result ON usage(result);

-- Analytics view
CREATE VIEW daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE result = 'deliverable') as deliverable,
  COUNT(*) FILTER (WHERE result = 'undeliverable') as undeliverable,
  COUNT(*) FILTER (WHERE result = 'risky') as risky,
  AVG(processing_time_ms) as avg_processing_ms
FROM usage
GROUP BY DATE(created_at);

-- Domain popularity (for caching optimization)
CREATE VIEW popular_domains AS
SELECT
  email_domain,
  COUNT(*) as check_count,
  COUNT(*) FILTER (WHERE result = 'deliverable') as deliverable_count
FROM usage
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY email_domain
ORDER BY check_count DESC
LIMIT 1000;
```

---

## SMTP Considerations

### Rate Limiting
- Gmail: 10-20 connections/minute max
- Microsoft: Similar limits
- Implement exponential backoff
- Cache results for repeated domains

### IP Reputation
- Vercel's IPs are shared - may have issues
- Consider: Cloudflare Workers (better IP reputation)
- Future: Dedicated IP pool if scaling

### Catch-All Domains
- Many corporate domains accept all emails
- Return `risky` status with `catch_all: true`
- Cannot verify individual mailbox existence

### Greylisting
- Some servers delay first connection
- Implement retry with backoff
- Return `unknown` if cannot verify after retries

---

## RapidAPI Integration

### Required Headers
```
X-RapidAPI-Proxy-Secret: <our_secret>
X-RapidAPI-User: <subscriber_id>
X-RapidAPI-Subscription: <plan_type>
```

### Pricing Tiers
| Tier | Price | Verifications | Per-Email |
|------|-------|---------------|-----------|
| Free | $0 | 100/month | - |
| Basic | $5/mo | 2,000 | $0.0025 |
| Pro | $15/mo | 10,000 | $0.0015 |
| Ultra | Pay-as-you-go | Unlimited | $0.003 |

---

## Implementation Phases

### Phase 1: Core MVP (Week 1)
- [ ] Project setup (Nuxt 4, Postgres, Vercel)
- [ ] Syntax validation
- [ ] MX record lookup
- [ ] Basic SMTP verification
- [ ] POST /api/v1/verify endpoint
- [ ] Health check endpoint

### Phase 2: Enhanced Detection (Week 2)
- [ ] Disposable email list integration (100k+ domains)
- [ ] Role-based detection
- [ ] Free provider detection
- [ ] Catch-all detection
- [ ] Confidence scoring

### Phase 3: Production Ready (Week 2-3)
- [ ] RapidAPI middleware integration
- [ ] Usage tracking (database)
- [ ] Bulk verification endpoint
- [ ] Rate limiting (backup)
- [ ] Unit tests
- [ ] Integration tests

### Phase 4: Launch (Week 3)
- [ ] RapidAPI listing setup
- [ ] Pricing configuration
- [ ] Submit for review
- [ ] Monitor and iterate

---

## Environment Variables

```env
# Database
DATABASE_URL=

# RapidAPI
RAPIDAPI_PROXY_SECRET=

# SMTP Verification
SMTP_TIMEOUT_MS=10000
SMTP_FROM_DOMAIN=yourdomain.com

# Rate Limiting (backup)
RATE_LIMIT_PER_MINUTE=100

# Optional
LOG_LEVEL=info
```

---

## Cost Analysis

### Per-Request Costs
- DNS lookup: Free
- SMTP connection: Free (just TCP)
- Vercel compute: ~$0.0001/invocation
- Database: Negligible

**Total cost per request: ~$0.0001**
**Revenue per request: $0.003**
**Margin: ~97%**

### Break-even
- Vercel free tier: 100k invocations/month
- Postgres: Neon free tier or Vercel Postgres free tier
- Effectively $0 cost until significant scale

---

## Success Metrics
- Verifications/day (target: 300+ for $30/month)
- Accuracy rate (target: >95% correct results)
- Avg processing time (target: <2s)
- RapidAPI rating (target: 4.5+ stars)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| SMTP blocks from shared IPs | Cache results, implement backoff, consider dedicated IPs later |
| Catch-all false positives | Clearly label as "risky", don't claim deliverable |
| Disposable list outdated | Script to auto-update from GitHub sources weekly |
| Rate limiting by mail servers | Respect limits, queue heavy domains, cache aggressively |
| Competition undercuts | Already lowest price tier - margins allow further cuts if needed |

---

## Future Enhancements (Post-Launch)
- [ ] Email autocomplete/suggestions
- [ ] Typo detection ("gmial.com" → "gmail.com")
- [ ] Domain age check
- [ ] Webhook for bulk results
- [ ] Historical verification lookup (was this email valid before?)
