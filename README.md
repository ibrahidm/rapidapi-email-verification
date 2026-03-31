# Email Verification API

Fast, accurate email verification API distributed via RapidAPI. Verify email syntax, MX records, mailbox existence, and detect disposable addresses.

## Features

- **Syntax Validation** - RFC 5322 compliant
- **MX Record Lookup** - Verify domain can receive email
- **SMTP Verification** - Confirm mailbox exists
- **Disposable Detection** - 5,000+ known disposable domains
- **Role-Based Detection** - Identify admin@, info@, etc.
- **Free Provider Detection** - Gmail, Yahoo, Outlook, etc.
- **Catch-All Detection** - Identify accept-all domains
- **Plus Addressing** - Detect user+tag@domain.com patterns
- **Bulk Verification** - Up to 100 emails per request

## Tech Stack

- **Framework:** Nuxt 4
- **Database:** PostgreSQL
- **Deployment:** Vercel
- **Distribution:** RapidAPI

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL (optional, for usage tracking)

### Installation

```bash
# Clone the repository
git clone https://github.com/gdisoftware/email-verification-api.git
cd email-verification-api

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
```

### Configuration

Edit `.env` with your settings:

```env
# Required for SMTP verification
SMTP_FROM_DOMAIN=yourdomain.com

# Optional: Database for usage tracking
DATABASE_URL=postgresql://user:pass@host:5432/db

# Optional: RapidAPI authentication
RAPIDAPI_PROXY_SECRET=your-secret

# Optional: SMTP timeout (default: 10000ms)
SMTP_TIMEOUT_MS=10000
```

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck
```

### API Usage

**Verify single email:**
```bash
curl -X POST http://localhost:3000/api/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gmail.com"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "test@gmail.com",
    "valid": true,
    "result": "deliverable",
    "checks": {
      "syntax": true,
      "mx_records": true,
      "smtp_valid": true,
      "catch_all": false,
      "disposable": false,
      "role_based": false,
      "free_provider": true,
      "plus_addressed": false
    },
    "provider": {
      "domain": "gmail.com",
      "type": "free"
    },
    "confidence": 0.85
  }
}
```

**Bulk verification:**
```bash
curl -X POST http://localhost:3000/api/v1/verify/bulk \
  -H "Content-Type: application/json" \
  -d '{"emails": ["user1@gmail.com", "user2@yahoo.com"]}'
```

**Health check:**
```bash
curl http://localhost:3000/api/v1/health
```

## Project Structure

```
├── server/
│   ├── api/v1/              # API endpoints
│   ├── middleware/          # RapidAPI auth, rate limiting
│   ├── services/verifier/   # Verification logic
│   ├── db/                  # Database queries
│   ├── data/                # Static data (disposable domains, etc.)
│   └── utils/               # Utilities (validation, caching)
├── shared/
│   └── types/               # TypeScript types
├── test/
│   ├── unit/                # Unit tests
│   └── e2e/                 # End-to-end tests
├── db/
│   └── migrations/          # SQL migrations
├── docs/                    # Documentation
└── scripts/                 # Maintenance scripts
```

## Result Values

| Result | Description |
|--------|-------------|
| `deliverable` | Email exists and accepts mail |
| `undeliverable` | Mailbox does not exist |
| `risky` | Catch-all domain or disposable |
| `unknown` | Could not verify (timeout) |

## Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add SMTP_FROM_DOMAIN
vercel env add DATABASE_URL
vercel env add RAPIDAPI_PROXY_SECRET
```

### Database Setup

Run migrations:
```bash
pnpm db:migrate
```

## Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm vitest run --project unit

# Run e2e tests only
pnpm vitest run --project e2e

# Watch mode
pnpm vitest
```

## Maintenance

**Update disposable domains list:**
```bash
pnpm run update-disposable
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/v1/verify` | 100/min |
| `/api/v1/verify/bulk` | 10/min |
| `/api/v1/health` | 60/min |

## License

MIT

## Support

- [RapidAPI Listing](https://rapidapi.com/gdisoftware/api/email-verification-api)
- [GitHub Issues](https://github.com/gdisoftware/email-verification-api/issues)
