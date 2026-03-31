/**
 * SMTP Verification
 * Verifies mailbox existence via SMTP RCPT TO command
 */

import { Socket } from 'node:net';
import type { SmtpResult, MxRecord } from '#shared/types';
import { LRUCache } from '../../utils/lru-cache';

/**
 * Default timeout for SMTP operations
 */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Greylisting retry delay
 */
const GREYLIST_RETRY_DELAY_MS = 5000;

/**
 * SMTP response codes
 */
const SMTP_CODES = {
  READY: 220,
  OK: 250,
  CLOSING: 221,
  UNAVAILABLE: 450, // Often greylisting
  MAILBOX_NOT_FOUND: 550,
  MAILBOX_DISABLED: 551,
  STORAGE_EXCEEDED: 552,
  MAILBOX_NOT_ALLOWED: 553,
  CATCHALL_INDICATOR: 252, // Some servers use this
} as const;

/**
 * LRU cache for catch-all domain detection
 * Max 500 domains, 1 hour TTL
 */
const catchAllCache = new LRUCache<boolean>(500, 60 * 60 * 1000);

/**
 * Read a line from SMTP server
 */
function readLine(socket: Socket, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        reject(new Error('SMTP read timeout'));
      }
    }, timeout);

    const onData = (data: Buffer) => {
      buffer += data.toString();

      // SMTP lines end with \r\n
      const lineEnd = buffer.indexOf('\r\n');
      if (lineEnd !== -1) {
        clearTimeout(timeoutId);
        socket.removeListener('data', onData);
        socket.removeListener('error', onError);
        resolved = true;
        resolve(buffer.substring(0, lineEnd));
      }
    };

    const onError = (err: Error) => {
      if (!resolved) {
        clearTimeout(timeoutId);
        resolved = true;
        reject(err);
      }
    };

    socket.on('data', onData);
    socket.on('error', onError);
  });
}

/**
 * Send a command and read response
 */
async function sendCommand(
  socket: Socket,
  command: string,
  timeout: number
): Promise<{ code: number; message: string }> {
  return new Promise((resolve, reject) => {
    socket.write(`${command}\r\n`, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const response = await readLine(socket, timeout);
        const code = parseInt(response.substring(0, 3), 10);
        resolve({ code, message: response });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Connect to SMTP server
 */
function connectToServer(
  host: string,
  port: number,
  timeout: number
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        reject(new Error('SMTP connection timeout'));
      }
    }, timeout);

    socket.connect(port, host, () => {
      if (!resolved) {
        clearTimeout(timeoutId);
        resolved = true;
        resolve(socket);
      }
    });

    socket.on('error', (err) => {
      if (!resolved) {
        clearTimeout(timeoutId);
        resolved = true;
        reject(err);
      }
    });
  });
}

/**
 * Generate a random string for catch-all testing
 */
function generateRandomLocalPart(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'verify_';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if domain is catch-all (accepts all addresses)
 */
async function checkCatchAll(
  socket: Socket,
  domain: string,
  fromDomain: string,
  timeout: number
): Promise<boolean> {
  // Check cache
  const cached = catchAllCache.get(domain);
  if (cached !== undefined) {
    return cached;
  }

  try {
    // Test with a random non-existent email
    const randomEmail = `${generateRandomLocalPart()}@${domain}`;

    // Reset for new recipient test
    const rsetResponse = await sendCommand(socket, 'RSET', timeout);
    if (rsetResponse.code !== SMTP_CODES.OK) {
      return false;
    }

    // MAIL FROM
    await sendCommand(socket, `MAIL FROM:<verify@${fromDomain}>`, timeout);

    // RCPT TO with random address
    const rcptResponse = await sendCommand(
      socket,
      `RCPT TO:<${randomEmail}>`,
      timeout
    );

    // If server accepts random address, it's catch-all
    const isCatchAll = rcptResponse.code === SMTP_CODES.OK;

    // Cache result
    catchAllCache.set(domain, isCatchAll);

    return isCatchAll;
  } catch {
    return false;
  }
}

/**
 * Verify email via SMTP
 *
 * Process:
 * 1. Connect to MX server on port 25
 * 2. EHLO/HELO
 * 3. MAIL FROM
 * 4. RCPT TO - check response
 * 5. QUIT
 */
export async function verifySmtp(
  email: string,
  mxRecords: MxRecord[],
  options: {
    timeout?: number;
    fromDomain: string; // Required - no default
    checkCatchAll?: boolean;
  }
): Promise<SmtpResult> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const fromDomain = options.fromDomain;
  const shouldCheckCatchAll = options.checkCatchAll ?? true;

  if (!fromDomain) {
    return {
      valid: false,
      deliverable: false,
      catchAll: false,
      error: 'SMTP_FROM_DOMAIN not configured',
    };
  }

  if (mxRecords.length === 0) {
    return {
      valid: false,
      deliverable: false,
      catchAll: false,
      error: 'No MX records available',
    };
  }

  // Overall timeout to prevent compounding delays across MX servers
  return Promise.race([
    verifySmtpInternal(email, mxRecords, timeout, fromDomain, shouldCheckCatchAll),
    new Promise<SmtpResult>((resolve) =>
      setTimeout(
        () => resolve({ valid: false, deliverable: false, catchAll: false, error: 'Overall timeout' }),
        timeout
      )
    ),
  ]);
}

async function verifySmtpInternal(
  email: string,
  mxRecords: MxRecord[],
  timeout: number,
  fromDomain: string,
  shouldCheckCatchAll: boolean
): Promise<SmtpResult> {

  const atIndex = email.lastIndexOf('@');
  const domain = atIndex !== -1 ? email.substring(atIndex + 1) : '';

  // Try MX servers in priority order
  for (const mx of mxRecords) {
    let socket: Socket | null = null;
    let retryCount = 0;
    const maxRetries = 1; // One retry for greylisting

    while (retryCount <= maxRetries) {
      try {
        // Connect
        socket = await connectToServer(mx.exchange, 25, timeout);

        // Read greeting
        const greeting = await readLine(socket, timeout);
        const greetingCode = parseInt(greeting.substring(0, 3), 10);

        if (greetingCode !== SMTP_CODES.READY) {
          throw new Error(`Unexpected greeting: ${greeting}`);
        }

        // EHLO (or fall back to HELO)
        let ehloResponse = await sendCommand(
          socket,
          `EHLO ${fromDomain}`,
          timeout
        );

        if (ehloResponse.code !== SMTP_CODES.OK) {
          // Try HELO as fallback
          ehloResponse = await sendCommand(
            socket,
            `HELO ${fromDomain}`,
            timeout
          );

          if (ehloResponse.code !== SMTP_CODES.OK) {
            throw new Error(`HELO failed: ${ehloResponse.message}`);
          }
        }

        // MAIL FROM
        const mailFromResponse = await sendCommand(
          socket,
          `MAIL FROM:<verify@${fromDomain}>`,
          timeout
        );

        if (mailFromResponse.code !== SMTP_CODES.OK) {
          throw new Error(`MAIL FROM failed: ${mailFromResponse.message}`);
        }

        // RCPT TO - the actual verification
        const rcptResponse = await sendCommand(
          socket,
          `RCPT TO:<${email}>`,
          timeout
        );

        // Check for greylisting (450) - retry once
        if (
          rcptResponse.code === SMTP_CODES.UNAVAILABLE &&
          retryCount < maxRetries
        ) {
          socket.destroy();
          socket = null;
          retryCount++;
          await new Promise((r) => setTimeout(r, GREYLIST_RETRY_DELAY_MS));
          continue;
        }

        // Determine result based on response code
        let deliverable = false;
        let catchAll = false;

        if (rcptResponse.code === SMTP_CODES.OK) {
          deliverable = true;

          // Check if it's a catch-all domain
          if (shouldCheckCatchAll) {
            catchAll = await checkCatchAll(socket, domain, fromDomain, timeout);
          }
        } else if (
          rcptResponse.code === SMTP_CODES.MAILBOX_NOT_FOUND ||
          rcptResponse.code === SMTP_CODES.MAILBOX_DISABLED ||
          rcptResponse.code === SMTP_CODES.STORAGE_EXCEEDED ||
          rcptResponse.code === SMTP_CODES.MAILBOX_NOT_ALLOWED
        ) {
          deliverable = false;
        } else if (rcptResponse.code === SMTP_CODES.CATCHALL_INDICATOR) {
          // 252 typically indicates the server can't verify but will accept
          deliverable = true;
          catchAll = true;
        }

        // QUIT gracefully
        try {
          await sendCommand(socket, 'QUIT', 2000);
        } catch {
          // Ignore quit errors
        }

        socket.destroy();

        return {
          valid: true,
          deliverable,
          catchAll,
        };
      } catch (error) {
        if (socket) {
          socket.destroy();
          socket = null;
        }

        // If this was a greylisting retry, don't retry again
        if (retryCount > 0) {
          break;
        }

        retryCount++;
      }
    }
  }

  // All MX servers failed
  return {
    valid: false,
    deliverable: false,
    catchAll: false,
    error: 'Could not connect to any mail server',
  };
}

/**
 * Clear catch-all cache (useful for testing)
 */
export function clearCatchAllCache(): void {
  catchAllCache.clear();
}

/**
 * Get catch-all cache size (useful for monitoring)
 */
export function getCatchAllCacheSize(): number {
  return catchAllCache.size;
}
