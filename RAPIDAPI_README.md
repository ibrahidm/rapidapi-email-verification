# Email Verification API

Verify email addresses in real-time. Check deliverability, detect disposable emails, and clean your lists before sending.

## Why Use This API?

- **Fast** - Most verifications complete in under 2 seconds
- **Accurate** - 95%+ accuracy with multi-step verification
- **Affordable** - $0.003 per verification
- **Bulk Support** - Verify up to 100 emails per request

## What You Get

Each verification returns:

| Check | Description |
|-------|-------------|
| **Deliverable** | Can this mailbox receive email? |
| **Syntax Valid** | Is the email format correct? |
| **MX Records** | Does the domain have mail servers? |
| **Disposable** | Is this a temporary/throwaway email? |
| **Role-Based** | Is this a group address (info@, support@)? |
| **Free Provider** | Gmail, Yahoo, Outlook, etc. |
| **Catch-All** | Does domain accept all addresses? |
| **Plus Addressing** | Detected user+tag@domain.com pattern |

## Endpoints

### Verify Single Email

```
POST /verify
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
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

### Verify Multiple Emails (Bulk)

```
POST /verify/bulk
```

**Request:**
```json
{
  "emails": [
    "user1@gmail.com",
    "user2@company.com",
    "fake@tempmail.com"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "email": "user1@gmail.com",
        "valid": true,
        "result": "deliverable",
        "checks": { ... }
      },
      {
        "email": "user2@company.com",
        "valid": true,
        "result": "deliverable",
        "checks": { ... }
      },
      {
        "email": "fake@tempmail.com",
        "valid": false,
        "result": "risky",
        "checks": { "disposable": true, ... }
      }
    ],
    "summary": {
      "total": 3,
      "deliverable": 2,
      "undeliverable": 0,
      "risky": 1,
      "unknown": 0
    }
  }
}
```

**Limits:** Maximum 100 emails per bulk request.

## Result Types

| Result | Meaning | Action |
|--------|---------|--------|
| `deliverable` | Mailbox exists and accepts mail | Safe to send |
| `undeliverable` | Mailbox does not exist | Do not send |
| `risky` | Catch-all domain or disposable | Send with caution |
| `unknown` | Could not verify (timeout) | Retry later |

## Confidence Score

Each result includes a confidence score (0.0 - 1.0):

- **0.95+** - High confidence, verified via SMTP
- **0.85** - Good confidence, trusted provider (Gmail, Microsoft, etc.)
- **0.70** - Moderate confidence, catch-all domain
- **< 0.70** - Low confidence, could not fully verify

## Plus Addressing Detection

The API detects plus-addressed emails and returns the normalized version:

**Request:**
```json
{
  "email": "user+newsletter@gmail.com"
}
```

**Response:**
```json
{
  "email": "user+newsletter@gmail.com",
  "normalized_email": "user@gmail.com",
  "checks": {
    "plus_addressed": true
  }
}
```

## Use Cases

- **Email List Cleaning** - Remove invalid addresses before campaigns
- **Registration Forms** - Block disposable emails at signup
- **Lead Validation** - Verify leads before importing to CRM
- **Bounce Prevention** - Reduce bounce rates and protect sender reputation

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SYNTAX",
    "message": "Invalid email format"
  }
}
```

| Error Code | Description |
|------------|-------------|
| `INVALID_SYNTAX` | Email format is invalid |
| `INVALID_DOMAIN` | Domain does not exist |
| `NO_MX_RECORDS` | Domain has no mail servers |
| `RATE_LIMITED` | Too many requests |

## Rate Limits

| Plan | Verify | Bulk Verify |
|------|--------|-------------|
| Basic | 100/min | 10/min |
| Pro | 500/min | 50/min |
| Enterprise | Unlimited | Unlimited |

## Support

Questions? Contact us through RapidAPI or open a support ticket.
