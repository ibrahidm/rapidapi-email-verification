# Email Verification API Documentation

## Base URL
```
https://email-verification-api.p.rapidapi.com
```

## Authentication
All requests require RapidAPI authentication headers:
```
X-RapidAPI-Key: your-rapidapi-key
X-RapidAPI-Host: email-verification-api.p.rapidapi.com
```

---

## Endpoints

### POST /api/v1/verify

Verify a single email address.

#### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | `application/json` |
| X-RapidAPI-Key | Yes | Your RapidAPI subscription key |
| X-RapidAPI-Host | Yes | `email-verification-api.p.rapidapi.com` |

**Body:**
```json
{
  "email": "user@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email address to verify |

#### Response

**Success (200 OK):**
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
    "provider": {
      "domain": "example.com",
      "type": "business"
    },
    "confidence": 0.95
  },
  "meta": {
    "processing_time_ms": 1234
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| email | string | The email address (normalized to lowercase) |
| normalized_email | string\|null | Base email without plus addressing (e.g., `user@gmail.com` from `user+tag@gmail.com`) |
| valid | boolean | Whether the email appears valid |
| result | string | Verification result (see Result Values) |
| checks | object | Individual check results |
| provider | object | Provider information |
| confidence | number | Confidence score (0-1) |

**Result Values:**

| Value | Description |
|-------|-------------|
| `deliverable` | Email exists and accepts mail |
| `undeliverable` | Mailbox does not exist |
| `risky` | Catch-all domain or disposable - cannot confirm |
| `unknown` | Could not verify (timeout, etc.) |

**Check Fields:**

| Field | Type | Description |
|-------|------|-------------|
| syntax | boolean | Email format is valid |
| mx_records | boolean | Domain has MX records |
| smtp_valid | boolean | SMTP verification passed |
| catch_all | boolean | Domain accepts all emails |
| disposable | boolean | Email is from a disposable provider |
| role_based | boolean | Email is role-based (admin@, info@, etc.) |
| free_provider | boolean | Email is from a free provider (Gmail, Yahoo, etc.) |
| plus_addressed | boolean | Email uses plus addressing (user+tag@domain.com) |

**Provider Types:**

| Type | Description |
|------|-------------|
| `business` | Custom domain (company email) |
| `free` | Free email provider (Gmail, Yahoo, etc.) |
| `disposable` | Temporary/throwaway email |
| `unknown` | Could not determine |

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SYNTAX",
    "message": "Email address has invalid format"
  }
}
```

**Error Codes:**

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Missing or invalid request body |
| `INVALID_SYNTAX` | Email format is invalid |
| `RATE_LIMITED` | Too many requests |
| `SMTP_ERROR` | SMTP verification failed |
| `TIMEOUT` | Verification timed out |

---

### POST /api/v1/verify/bulk

Verify multiple email addresses in one request.

#### Request

**Body:**
```json
{
  "emails": [
    "user1@example.com",
    "user2@gmail.com",
    "invalid-email"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| emails | string[] | Yes | Array of emails (max 100) |

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "email": "user1@example.com",
        "valid": true,
        "result": "deliverable",
        "checks": { ... },
        "provider": { ... },
        "confidence": 0.95
      },
      {
        "email": "user2@gmail.com",
        "valid": true,
        "result": "deliverable",
        "checks": { ... },
        "provider": { ... },
        "confidence": 0.85
      },
      {
        "email": "invalid-email",
        "valid": false,
        "result": "undeliverable",
        "checks": { "syntax": false, ... },
        "provider": { ... },
        "confidence": 0.99
      }
    ],
    "summary": {
      "total": 3,
      "deliverable": 2,
      "undeliverable": 1,
      "risky": 0,
      "unknown": 0
    }
  },
  "meta": {
    "processing_time_ms": 3456
  }
}
```

**Limits:**
- Maximum 100 emails per request
- Duplicate emails are automatically deduplicated
- Available on Pro and Ultra plans only

---

### GET /api/v1/health

Check API health status.

#### Response

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "checks": {
    "dns": true,
    "database": true
  },
  "cache": {
    "mx_entries": 150,
    "catchall_entries": 45
  }
}
```

**Status Values:**
| Value | Description |
|-------|-------------|
| `ok` | All systems operational |
| `degraded` | Some non-critical systems down |
| `unhealthy` | Critical systems down |

---

## Rate Limits

Rate limits are applied per API key:

| Plan | Requests/Minute |
|------|-----------------|
| Free | 10 |
| Basic | 50 |
| Pro | 100 |
| Ultra | 100 |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 45
```

When rate limited, you'll receive a `429 Too Many Requests` response with a `Retry-After` header.

---

## Code Examples

### cURL
```bash
curl -X POST "https://email-verification-api.p.rapidapi.com/api/v1/verify" \
  -H "Content-Type: application/json" \
  -H "X-RapidAPI-Key: YOUR_API_KEY" \
  -H "X-RapidAPI-Host: email-verification-api.p.rapidapi.com" \
  -d '{"email": "test@gmail.com"}'
```

### JavaScript (fetch)
```javascript
const response = await fetch('https://email-verification-api.p.rapidapi.com/api/v1/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': 'YOUR_API_KEY',
    'X-RapidAPI-Host': 'email-verification-api.p.rapidapi.com'
  },
  body: JSON.stringify({ email: 'test@gmail.com' })
});

const data = await response.json();
console.log(data);
```

### Python (requests)
```python
import requests

response = requests.post(
    'https://email-verification-api.p.rapidapi.com/api/v1/verify',
    headers={
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': 'YOUR_API_KEY',
        'X-RapidAPI-Host': 'email-verification-api.p.rapidapi.com'
    },
    json={'email': 'test@gmail.com'}
)

print(response.json())
```

### Node.js (axios)
```javascript
const axios = require('axios');

const response = await axios.post(
  'https://email-verification-api.p.rapidapi.com/api/v1/verify',
  { email: 'test@gmail.com' },
  {
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': 'YOUR_API_KEY',
      'X-RapidAPI-Host': 'email-verification-api.p.rapidapi.com'
    }
  }
);

console.log(response.data);
```

---

## Best Practices

1. **Cache results** - Don't re-verify the same email repeatedly
2. **Handle timeouts gracefully** - Some domains are slow to respond
3. **Respect rate limits** - Implement exponential backoff
4. **Use bulk endpoint** - More efficient for multiple emails
5. **Check the `result` field** - Don't rely solely on `valid`

## Support

For issues or questions, contact support through RapidAPI or open an issue on our GitHub repository.
