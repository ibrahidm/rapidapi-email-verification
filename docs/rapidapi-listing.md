# RapidAPI Listing Content

## API Name
**Email Verification API**

## Short Description (150 chars)
Fast, accurate email verification. Check syntax, MX records, mailbox existence, disposable detection. 95%+ accuracy at $0.003/verification.

## Long Description

### Verify emails instantly with 95%+ accuracy

Stop bounces, reduce fraud, and clean your email lists with our comprehensive email verification API. We perform multiple checks to give you confidence in every email address.

#### What We Check

- **Syntax Validation** - RFC 5322 compliant format checking
- **MX Record Lookup** - Verify the domain can receive email
- **SMTP Verification** - Confirm the mailbox actually exists
- **Disposable Detection** - Flag temporary/throwaway emails (100k+ domains)
- **Role-Based Detection** - Identify generic addresses (admin@, info@, support@)
- **Free Provider Detection** - Know if it's Gmail, Yahoo, Outlook, etc.
- **Catch-All Detection** - Identify domains that accept all emails
- **Plus Addressing** - Detect user+tag@domain.com patterns

#### Why Choose Us?

✅ **Lowest Price** - $0.003 per verification (50-80% cheaper than competitors)
✅ **Fast Response** - Average <2 second response time
✅ **High Accuracy** - 95%+ correct results
✅ **Bulk Support** - Verify up to 100 emails per request
✅ **Privacy First** - We never store email addresses
✅ **No Dependencies** - Self-contained verification logic

#### Use Cases

- Clean email lists before campaigns
- Validate signups in real-time
- Reduce bounce rates
- Prevent fake account creation
- Improve deliverability scores

#### Response Example

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
      "free_provider": false,
      "plus_addressed": false
    },
    "provider": {
      "domain": "example.com",
      "type": "business"
    },
    "confidence": 0.95
  }
}
```

## Category
**Data Validation** or **Email**

## Tags
- email verification
- email validation
- email checker
- disposable email
- bounce prevention
- email hygiene
- smtp verification
- mx lookup

---

# Pricing Configuration

## Free Tier
- **Price:** $0/month
- **Quota:** 100 verifications/month
- **Rate Limit:** 10 requests/minute
- **Features:** All features included

## Basic Plan
- **Price:** $5/month
- **Quota:** 2,000 verifications/month
- **Rate Limit:** 50 requests/minute
- **Features:** All features included
- **Per-email cost:** $0.0025

## Pro Plan
- **Price:** $15/month
- **Quota:** 10,000 verifications/month
- **Rate Limit:** 100 requests/minute
- **Features:** All features + bulk endpoint
- **Per-email cost:** $0.0015

## Ultra Plan (Pay-as-you-go)
- **Price:** $0/month base
- **Quota:** Unlimited
- **Rate Limit:** 100 requests/minute
- **Per-email cost:** $0.003
- **Features:** All features + bulk endpoint

---

# API Endpoints

## POST /verify
Verify a single email address.

## POST /verify/bulk
Verify up to 100 email addresses in one request.

## GET /health
Check API status (no authentication required on RapidAPI).

---

# Support

- **Documentation:** Full API docs available
- **Response Time:** <24 hours for issues
- **Contact:** office@gdisoftware.com
