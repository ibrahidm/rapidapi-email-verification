# ADR-001: Trusted Provider Verification via MX Detection

## Status

Accepted

## Context

SMTP verification (RCPT TO check) is blocked by major email providers:

- **Gmail/Google Workspace**: Blocks connections from unknown IPs, returns ambiguous responses
- **Microsoft 365/Outlook**: Similar blocking, aggressive rate limiting
- **Yahoo/AOL**: Blocks or returns catch-all behavior
- **iCloud**: Blocks SMTP verification attempts

These providers represent 70%+ of consumer email and a significant portion of business email (via Google Workspace and Microsoft 365).

Traditional SMTP verification results in:
- 10+ second timeouts
- `unknown` results for valid emails
- Poor user experience
- Wasted compute resources

## Decision

Implement a two-tier verification strategy:

### Tier 1: Trusted Provider Detection

Skip SMTP verification for providers with **strict signup processes**. These providers:
- Require phone/identity verification to create accounts
- Don't allow arbitrary mailbox creation
- Actively block SMTP verification anyway

Detection methods:
1. **Domain match**: Direct domains like `gmail.com`, `outlook.com`
2. **MX infrastructure detection**: Custom domains using hosted email

```
wayne.edu → MX: *.protection.outlook.com → Microsoft 365 → Trusted
company.com → MX: aspmx.l.google.com → Google Workspace → Trusted
```

For trusted providers, if syntax + MX checks pass → return `deliverable` with 0.85 confidence.

### Tier 2: SMTP Verification

For all other domains, perform full SMTP verification:
1. Connect to MX server
2. EHLO/HELO
3. MAIL FROM
4. RCPT TO (verification check)
5. QUIT

### Implementation

- `server/data/trusted-providers.ts` - Known trusted domains
- `server/services/verifier/mx-provider.ts` - MX-based infrastructure detection
- `server/services/verifier/index.ts` - Orchestration with tier selection

## Consequences

### Positive

- **Fast responses**: Trusted providers return in <200ms vs 10s+ timeout
- **Useful results**: Returns `deliverable` instead of `unknown` for Gmail/Microsoft
- **Resource efficient**: No wasted TCP connections to servers that will block us
- **Scales automatically**: MX detection handles all Google Workspace/M365 domains

### Negative

- **Lower confidence for trusted providers**: 0.85 vs 0.95 for SMTP-verified
- **Can't detect deleted accounts**: A deleted Gmail account still passes (false positive)
- **Requires maintenance**: New major providers need to be added to detection

### Neutral

- **Honest about limitations**: Confidence score reflects the verification method used

## Alternatives Considered

### 1. Dedicated SMTP Infrastructure

**Description**: Run SMTP verification from dedicated VPS with warmed IPs and proper PTR records.

**Rejected because**:
- Gmail/Microsoft detect RCPT-TO-only patterns regardless of IP reputation
- Significant infrastructure cost and maintenance
- Doesn't solve the fundamental problem

### 2. Send Actual Verification Emails

**Description**: Send a real email and check for bounces.

**Rejected because**:
- Intrusive (recipients see the email)
- Slow (must wait for bounce, 1-60 minutes)
- Violates "don't send actual emails" principle
- Cost per verification increases significantly

### 3. Paid Third-Party APIs

**Description**: Use ZeroBounce, NeverBounce, etc. for major providers.

**Rejected because**:
- Defeats zero-external-dependency goal
- Erodes margins ($0.003/verification target)
- Creates vendor dependency

### 4. Return "Unknown" for Major Providers

**Description**: Be conservative, return `unknown` for any provider that blocks SMTP.

**Rejected because**:
- Poor user experience (70%+ of emails return "unknown")
- Provides no value for the most common email domains
- Users would question the utility of the service
