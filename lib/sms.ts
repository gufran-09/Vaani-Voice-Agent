/**
 * lib/sms.ts
 * Provider-independent SMS notification layer with MockSmsProvider.
 *
 * Implements:
 * 1. SmsProvider interface (clean contract for future live provider like MSG91/Twilio/AWS SNS)
 * 2. MockSmsProvider:
 *    - Never hits external SMS APIs or sends real SMS
 *    - Validates and normalizes Indian phone numbers (+91...)
 *    - Safe structured server logging with masked recipient
 *    - Explicit status: 'simulated'
 *    - Durable persistence in PostgreSQL `notifications` table
 *    - Non-blocking: SMS errors never invalidate committed bookings/orders
 *    - Idempotency check to prevent duplicate notifications
 */

import { query } from './server-db';

export interface SendSmsInput {
  to: string;
  message: string;
  propertyId: string;
  idempotencyKey?: string;
  relatedEntityType?: 'order' | 'reservation';
  relatedEntityId?: string;
  subject?: string;
}

export interface SmsResult {
  success: boolean;
  status: 'simulated' | 'failed';
  providerMessageId: string;
  recipient: string;
  maskedRecipient: string;
  message: string;
  notificationId?: string;
  persistedToDb: boolean;
  error?: string;
  label: 'SIMULATED — NOT SENT';
}

export interface SmsProvider {
  sendSms(input: SendSmsInput): Promise<SmsResult>;
}

/**
 * Normalizes Indian phone numbers without guessing missing digits.
 * Accepts: "+919876543210", "9876543210", "09876543210", "+91 98765 43210", "+91-98765-43210"
 */
export function normalizeIndianPhoneNumber(rawPhone?: string): {
  valid: boolean;
  normalized?: string;
  masked?: string;
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Phone number is missing.' };
  }

  // Remove whitespace, dashes, parens
  const clean = rawPhone.replace(/[\s\-\(\)]/g, '').trim();

  let digitsOnly = clean;
  if (clean.startsWith('+91')) {
    digitsOnly = clean.slice(3);
  } else if (clean.startsWith('91') && clean.length === 12) {
    digitsOnly = clean.slice(2);
  } else if (clean.startsWith('0') && clean.length === 11) {
    digitsOnly = clean.slice(1);
  }

  // Indian mobile numbers must be exactly 10 digits starting with 6, 7, 8, or 9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(digitsOnly)) {
    return {
      valid: false,
      error: `Invalid Indian phone number "${rawPhone}". Must be 10 digits starting with 6-9.`,
    };
  }

  const normalized = `+91${digitsOnly}`;
  // Mask middle 5 digits: e.g. +91 98*****210
  const masked = `+91 ${digitsOnly.slice(0, 2)}*****${digitsOnly.slice(7)}`;

  return { valid: true, normalized, masked };
}

/**
 * Mock SMS Provider for local development and hackathon demonstrations.
 */
export class MockSmsProvider implements SmsProvider {
  async sendSms(input: SendSmsInput): Promise<SmsResult> {
    const { to, message, propertyId, relatedEntityType, relatedEntityId, subject } = input;

    // 1. Validate & normalize recipient phone number
    const phoneCheck = normalizeIndianPhoneNumber(to);
    if (!phoneCheck.valid || !phoneCheck.normalized) {
      console.warn('⚠️ [MockSmsProvider] Invalid phone number:', phoneCheck.error);
      return {
        success: false,
        status: 'failed',
        providerMessageId: `mock_failed_${Date.now()}`,
        recipient: to || 'UNKNOWN',
        maskedRecipient: 'UNKNOWN',
        message,
        persistedToDb: false,
        error: phoneCheck.error,
        label: 'SIMULATED — NOT SENT',
      };
    }

    const recipient = phoneCheck.normalized;
    const maskedRecipient = phoneCheck.masked!;
    const mockMessageId = `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 2. Idempotency Guard: prevent duplicate notification records for the same order/booking
    if (relatedEntityType && relatedEntityId) {
      try {
        const existingRes = await query<{ id: string; status: string; body: string }>(
          `SELECT id, status, body FROM notifications
           WHERE property_id = $1 AND related_entity_type = $2 AND related_entity_id = $3
           LIMIT 1`,
          [propertyId, relatedEntityType, relatedEntityId],
        );

        if (existingRes.rows.length > 0) {
          const row = existingRes.rows[0];
          console.log(`ℹ️ [MockSmsProvider] Found existing notification ${row.id} for ${relatedEntityType} ${relatedEntityId}`);
          return {
            success: true,
            status: 'simulated',
            providerMessageId: `existing_${row.id}`,
            recipient,
            maskedRecipient,
            message: row.body,
            notificationId: row.id,
            persistedToDb: true,
            label: 'SIMULATED — NOT SENT',
          };
        }
      } catch (checkErr) {
        console.warn('⚠️ [MockSmsProvider] Idempotency lookup error (non-fatal):', checkErr);
      }
    }

    // 3. Persist notification into PostgreSQL notifications table with status 'simulated'
    let notificationId: string | undefined;
    let persistedToDb = false;

    try {
      const insertRes = await query<{ id: string }>(
        `INSERT INTO notifications
           (property_id, channel, recipient, subject, body, status, related_entity_type, related_entity_id)
         VALUES ($1, 'sms', $2, $3, $4, 'simulated', $5, $6)
         RETURNING id`,
        [
          propertyId,
          recipient,
          subject || 'Order Confirmation',
          message,
          relatedEntityType || 'order',
          relatedEntityId || null,
        ],
      );

      if (insertRes.rows.length > 0) {
        notificationId = insertRes.rows[0].id;
        persistedToDb = true;
      }
    } catch (dbErr) {
      // Failure to write notification should NEVER invalidate the confirmed order
      console.error('⚠️ [MockSmsProvider] Failed to persist notification row (non-fatal):', dbErr);
    }

    // 4. Safe server logging (never exposes raw customer credentials)
    console.log('\n📱 ─────────────────────────────────────────────────────────────');
    console.log('   [MockSmsProvider] SIMULATED SMS — NOT SENT EXTERNALLY');
    console.log(`   To:        ${maskedRecipient}`);
    console.log(`   MessageId: ${mockMessageId}`);
    console.log(`   Status:    simulated (Persisted to DB: ${persistedToDb})`);
    console.log(`   Body:      "${message}"`);
    console.log('─────────────────────────────────────────────────────────────\n');

    return {
      success: true,
      status: 'simulated',
      providerMessageId: mockMessageId,
      recipient,
      maskedRecipient,
      message,
      notificationId,
      persistedToDb,
      label: 'SIMULATED — NOT SENT',
    };
  }
}

// Singleton provider instance
export const smsProvider: SmsProvider = new MockSmsProvider();

/**
 * High-level helper to trigger order confirmation SMS after database commit.
 */
export async function sendOrderConfirmationMockSms(params: {
  propertyId: string;
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  prepEtaMinutes: number;
}): Promise<SmsResult> {
  const { propertyId, orderId, orderNumber, customerName, customerPhone, totalAmount, prepEtaMinutes } = params;

  const guestName = customerName || 'Guest';
  const phone = customerPhone || '+919876543210';
  const smsBody = `Hi ${guestName}, your order #${orderNumber} at Cafe Vaani is confirmed! Total: ₹${totalAmount.toFixed(0)}. Ready in ~${prepEtaMinutes} mins. Order ID: ${orderId.slice(0, 8)}. Thank you!`;

  return smsProvider.sendSms({
    to: phone,
    message: smsBody,
    propertyId,
    subject: `Order #${orderNumber} Confirmed`,
    relatedEntityType: 'order',
    relatedEntityId: orderId,
  });
}
