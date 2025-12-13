# Payment Workflow Implementation Plan

## Overview
A comprehensive payment tracking system that automatically scans Gmail for Interac e-Transfer notifications, stores payment data, and allows users to allocate payments to invoices with support for partial payments, cash transactions, excess payment handling, and refunds.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT WORKFLOW SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐        │
│  │   Gmail     │───▶│  Email Scanner   │───▶│  interac_transactions   │        │
│  │   OAuth     │    │  (Every 30 min)  │    │  (Raw Email Data)       │        │
│  │  (1 Account)│    └──────────────────┘    └─────────────────────────┘        │
│  └─────────────┘                                       │                        │
│                                                        ▼                        │
│                               ┌────────────────────────────────────────┐        │
│                               │  Customer Auto-Match (with override)   │        │
│                               └────────────────────────────────────────┘        │
│                                                        │                        │
│                                                        ▼                        │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐        │
│  │   Cash      │───▶│  Payment         │◀───│  Invoice Auto-Select    │        │
│  │   Entry     │    │  Recording       │    │  (3 oldest unpaid)      │        │
│  └─────────────┘    └──────────────────┘    └─────────────────────────┘        │
│                              │                                                  │
│               ┌──────────────┼──────────────┐                                   │
│               ▼              ▼              ▼                                   │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐                    │
│    │payment_record│  │  payment_    │  │ customer_credit  │                    │
│    │   (Master)   │  │ allocations  │  │ (Excess Payment) │                    │
│    └──────────────┘  └──────────────┘  └──────────────────┘                    │
│                              │                   │                              │
│                              ▼                   ▼                              │
│                    ┌──────────────────┐  ┌──────────────────┐                  │
│                    │  monthly_billing │  │  refund_records  │                  │
│                    │  (Update Status) │  │  (Track Refunds) │                  │
│                    └──────────────────┘  └──────────────────┘                  │
│                                                                                 │
│                              │                                                  │
│                              ▼                                                  │
│                    ┌──────────────────┐                                        │
│                    │   In-App Only    │                                        │
│                    │  Notifications   │                                        │
│                    │(Auto-delete used)│                                        │
│                    └──────────────────┘                                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration Summary

| Setting | Value | Notes |
|---------|-------|-------|
| **Background Sync Interval** | 30 minutes | Cron job `*/30 * * * *` |
| **Gmail Accounts** | 1 (expandable to 3) | Start single, scale later |
| **Customer Matching** | Auto-populate + Override | Fuzzy match with manual correction |
| **Invoice Auto-Select** | 3 oldest unpaid invoices | From oldest billing month first |
| **Historical Import** | Last 30 days | On first Gmail connection |
| **Notifications** | In-app only | Auto-delete after payment recorded |
| **Delete Authorization** | Role-based + Password | Admin/Manager roles with password popup |

---

## Phase 1: Gmail OAuth Integration

### 1.1 Database Schema - Gmail Connection Settings

```sql
-- Store Gmail OAuth credentials (single account, expandable to 3)
CREATE TABLE gmail_oauth_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_name VARCHAR(100) NOT NULL,              -- 'primary', 'secondary', 'tertiary'
    email_address VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    last_sync_email_id VARCHAR(255) DEFAULT NULL,    -- Track last scanned email ID
    last_sync_at DATETIME DEFAULT NULL,
    sync_enabled TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,                  -- Only one active at a time for now
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_email (email_address),
    INDEX idx_active (is_active)
);

-- For future expansion: limit to 3 accounts
-- ALTER TABLE gmail_oauth_settings ADD CHECK (
--     (SELECT COUNT(*) FROM gmail_oauth_settings) <= 3
-- );
```

### 1.2 Implementation Details

**Backend Files to Create:**
- `Backend/pages/api/gmail/auth.ts` - OAuth flow initiation
- `Backend/pages/api/gmail/callback.ts` - OAuth callback handler
- `Backend/pages/api/gmail/status.ts` - Check connection status
- `Backend/pages/api/gmail/disconnect.ts` - Remove Gmail connection
- `Backend/src/services/gmailService.ts` - Gmail API wrapper

**Required Google APIs:**
- Gmail API (read-only scope: `https://www.googleapis.com/auth/gmail.readonly`)

**OAuth Flow:**
1. User clicks "Connect Gmail"
2. Redirect to Google OAuth consent screen
3. Receive authorization code
4. Exchange for access + refresh tokens
5. Store tokens securely in database
6. **Initial Sync:** Scan last 30 days of emails immediately

---

## Phase 2: Email Scanning Service

### 2.1 Database Schema - Interac Transactions

```sql
-- Store raw Interac email data
CREATE TABLE interac_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    gmail_settings_id INT NOT NULL,
    gmail_message_id VARCHAR(255) NOT NULL UNIQUE,   -- Gmail's message ID for deduplication
    email_date DATETIME NOT NULL,
    sender_name VARCHAR(255) NOT NULL,               -- "KRINESHKUMAR PATEL"
    reference_number VARCHAR(100) NOT NULL,          -- "C1AwqurRmFYX"
    amount DECIMAL(10,2) NOT NULL,                   -- 35.00
    currency VARCHAR(10) DEFAULT 'CAD',
    raw_email_body TEXT,                             -- Store full email for audit

    -- Customer matching
    auto_matched_customer_id INT DEFAULT NULL,       -- System auto-match
    confirmed_customer_id INT DEFAULT NULL,          -- User confirmed/overridden
    match_confidence DECIMAL(3,2) DEFAULT 0.00,      -- 0.00 to 1.00 confidence score

    -- Status tracking
    status ENUM('pending', 'allocated', 'ignored', 'deleted') DEFAULT 'pending',

    -- Audit fields
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,

    FOREIGN KEY (gmail_settings_id) REFERENCES gmail_oauth_settings(id),
    FOREIGN KEY (auto_matched_customer_id) REFERENCES customers(id),
    FOREIGN KEY (confirmed_customer_id) REFERENCES customers(id),
    INDEX idx_reference (reference_number),
    INDEX idx_status (status),
    INDEX idx_email_date (email_date),
    INDEX idx_deleted (deleted_flag)
);

-- Customer name aliases for better auto-matching
CREATE TABLE customer_name_aliases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    alias_name VARCHAR(255) NOT NULL,                -- "KRINESHKUMAR PATEL", "K PATEL", etc.
    source ENUM('manual', 'learned') DEFAULT 'manual', -- How alias was added
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE KEY unique_alias (alias_name),
    INDEX idx_customer (customer_id)
);
```

### 2.2 Email Scanning Logic

**Backend Files:**
- `Backend/src/services/interacScanner.ts` - Email parsing service
- `Backend/src/services/customerMatcher.ts` - Auto-matching service
- `Backend/src/jobs/emailSyncJob.ts` - Background job runner
- `Backend/pages/api/gmail/sync.ts` - Manual sync trigger

**Scanning Algorithm:**
```typescript
// Pseudocode
async function scanInteracEmails(gmailSettingsId: number) {
    // 1. Get Gmail settings with tokens
    const settings = await getGmailSettings(gmailSettingsId);

    // 2. Search for emails from notify@payments.interac.ca
    const query = settings.lastSyncEmailId
        ? `from:notify@payments.interac.ca after:${lastSyncDate}`  // Incremental
        : `from:notify@payments.interac.ca newer_than:30d`;        // Initial: 30 days

    // 3. Parse each email for transfer details
    for (const email of emails) {
        const parsed = parseInteracEmail(email.body);

        // 4. Auto-match customer
        const match = await autoMatchCustomer(parsed.senderName);

        // 5. Insert transaction (skip duplicates by gmail_message_id)
        await insertTransaction({
            ...parsed,
            auto_matched_customer_id: match?.customerId,
            match_confidence: match?.confidence
        });

        // 6. Create notification
        await createNotification('interac_received', parsed);
    }

    // 7. Update lastSyncEmailId and lastSyncAt
    await updateSyncStatus(gmailSettingsId, latestEmailId);
}
```

### 2.3 Customer Auto-Matching Algorithm

```typescript
// customerMatcher.ts
interface MatchResult {
    customerId: number;
    customerName: string;
    confidence: number;  // 0.00 to 1.00
}

async function autoMatchCustomer(senderName: string): Promise<MatchResult | null> {
    // 1. Exact match on aliases
    const exactMatch = await db.query(`
        SELECT c.id, c.name, 1.00 as confidence
        FROM customer_name_aliases a
        JOIN customers c ON a.customer_id = c.id
        WHERE UPPER(a.alias_name) = UPPER(?)
    `, [senderName]);

    if (exactMatch.length > 0) return exactMatch[0];

    // 2. Fuzzy match on customer names (Levenshtein distance)
    const fuzzyMatches = await db.query(`
        SELECT id, name,
            (1 - (LEVENSHTEIN(UPPER(name), UPPER(?)) / GREATEST(LENGTH(name), LENGTH(?)))) as confidence
        FROM customers
        WHERE status = 'active'
        HAVING confidence > 0.70
        ORDER BY confidence DESC
        LIMIT 1
    `, [senderName, senderName]);

    if (fuzzyMatches.length > 0) return fuzzyMatches[0];

    // 3. Partial name match (first name or last name)
    const nameParts = senderName.split(' ');
    const partialMatch = await db.query(`
        SELECT id, name, 0.60 as confidence
        FROM customers
        WHERE status = 'active'
        AND (
            UPPER(name) LIKE CONCAT('%', UPPER(?), '%')
            OR UPPER(name) LIKE CONCAT('%', UPPER(?), '%')
        )
        LIMIT 1
    `, [nameParts[0], nameParts[nameParts.length - 1]]);

    return partialMatch.length > 0 ? partialMatch[0] : null;
}

// Learn from user confirmations
async function learnCustomerAlias(customerId: number, senderName: string) {
    await db.query(`
        INSERT IGNORE INTO customer_name_aliases (customer_id, alias_name, source)
        VALUES (?, ?, 'learned')
    `, [customerId, senderName]);
}
```

### 2.4 Background Job Configuration (30 Minutes)

**File:** `Backend/src/jobs/emailSyncJob.ts`

```typescript
import cron from 'node-cron';
import { scanAllGmailAccounts } from '../services/interacScanner';

// Run every 30 minutes
export function startEmailSyncJob() {
    cron.schedule('*/30 * * * *', async () => {
        console.log('[EmailSync] Starting scheduled sync...');
        try {
            await scanAllGmailAccounts();
            console.log('[EmailSync] Sync completed');
        } catch (error) {
            console.error('[EmailSync] Error:', error);
        }
    });

    console.log('[EmailSync] Background job started - runs every 30 minutes');
}
```

---

## Phase 3: Payment Records & Allocation System

### 3.1 Database Schema - Master Payment Records

```sql
-- Master table for ALL payments (Interac + Cash)
CREATE TABLE payment_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_type ENUM('online', 'cash') NOT NULL,
    payment_source VARCHAR(50) DEFAULT NULL,         -- 'interac', 'stripe', etc.
    interac_transaction_id INT DEFAULT NULL,         -- Link to interac_transactions

    -- Customer info
    customer_id INT DEFAULT NULL,                    -- Confirmed customer
    payer_name VARCHAR(255) DEFAULT NULL,

    -- Payment details
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,

    -- Allocation tracking
    total_allocated DECIMAL(10,2) DEFAULT 0.00,
    excess_amount DECIMAL(10,2) DEFAULT 0.00,        -- Amount moved to credit
    allocation_status ENUM('unallocated', 'partial', 'fully_allocated', 'has_excess')
        DEFAULT 'unallocated',

    -- Audit fields
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT DEFAULT NULL,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,
    delete_reason TEXT DEFAULT NULL,

    FOREIGN KEY (interac_transaction_id) REFERENCES interac_transactions(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_deleted (deleted_flag),
    INDEX idx_allocation_status (allocation_status),
    INDEX idx_customer (customer_id)
);

-- Payment allocations to invoices (many-to-many)
CREATE TABLE payment_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_record_id INT NOT NULL,
    billing_id INT NOT NULL,                         -- monthly_billing.id
    customer_id INT NOT NULL,

    -- Allocation details
    allocation_order INT NOT NULL,                   -- Order user selected (1,2,3...)
    allocated_amount DECIMAL(10,2) NOT NULL,

    -- Invoice state at allocation time (for audit)
    invoice_balance_before DECIMAL(10,2) NOT NULL,
    invoice_balance_after DECIMAL(10,2) NOT NULL,

    -- Resulting status
    resulting_status ENUM('partial_paid', 'paid') NOT NULL,

    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,

    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id),
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_payment (payment_record_id),
    INDEX idx_billing (billing_id),
    INDEX idx_deleted (deleted_flag)
);
```

### 3.2 Excess Payment / Customer Credit System

```sql
-- Customer credit balance (excess payments)
CREATE TABLE customer_credit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    payment_record_id INT NOT NULL,                  -- Source of credit

    -- Credit details
    original_amount DECIMAL(10,2) NOT NULL,          -- Initial excess amount
    current_balance DECIMAL(10,2) NOT NULL,          -- Remaining balance

    -- Status
    status ENUM('available', 'used', 'refunded', 'expired') DEFAULT 'available',

    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT DEFAULT NULL,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status)
);

-- Credit usage history
CREATE TABLE customer_credit_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    credit_id INT NOT NULL,
    billing_id INT NOT NULL,                         -- Invoice paid with credit
    amount_used DECIMAL(10,2) NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_by INT DEFAULT NULL,

    FOREIGN KEY (credit_id) REFERENCES customer_credit(id),
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id),
    INDEX idx_credit (credit_id)
);
```

### 3.3 Refund Records System

```sql
-- Refund tracking table
CREATE TABLE refund_records (
    id INT PRIMARY KEY AUTO_INCREMENT,

    -- Source of refund
    source_type ENUM('credit', 'payment') NOT NULL,  -- Where refund came from
    credit_id INT DEFAULT NULL,                       -- If from customer_credit
    payment_record_id INT DEFAULT NULL,               -- If direct payment refund

    -- Customer info
    customer_id INT NOT NULL,

    -- Refund details
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_method ENUM('interac', 'cash', 'cheque', 'other') NOT NULL,
    refund_date DATE NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL,       -- e-Transfer reference, cheque #, etc.
    reason TEXT NOT NULL,                             -- Required: why refund was issued

    -- Status
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',

    -- Approval workflow
    requested_by INT NOT NULL,
    approved_by INT DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,

    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,

    FOREIGN KEY (credit_id) REFERENCES customer_credit(id),
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_deleted (deleted_flag)
);
```

### 3.4 Update monthly_billing Table

```sql
-- Add balance tracking columns to existing table
ALTER TABLE monthly_billing
ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN credit_applied DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN balance_due DECIMAL(10,2) AS (total_amount - amount_paid - credit_applied) STORED,
ADD COLUMN last_payment_date DATE DEFAULT NULL,
ADD COLUMN payment_count INT DEFAULT 0;
```

### 3.5 Invoice Auto-Selection Logic

```typescript
// invoiceSelector.ts

interface AutoSelectedInvoice {
    billing_id: number;
    customer_id: number;
    billing_month: string;
    total_amount: number;
    balance_due: number;
    selection_order: number;
}

/**
 * Auto-select up to 3 oldest unpaid invoices for a customer
 * Prioritizes: partial_paid first, then finalized, ordered by oldest month
 */
async function autoSelectInvoices(
    customerId: number,
    paymentAmount: number,
    maxInvoices: number = 3
): Promise<AutoSelectedInvoice[]> {

    // 1. Get all unpaid/partially paid invoices, oldest first
    const unpaidInvoices = await db.query(`
        SELECT
            id as billing_id,
            customer_id,
            billing_month,
            total_amount,
            (total_amount - COALESCE(amount_paid, 0) - COALESCE(credit_applied, 0)) as balance_due
        FROM monthly_billing
        WHERE customer_id = ?
        AND status IN ('finalized', 'partial_paid')
        AND (total_amount - COALESCE(amount_paid, 0) - COALESCE(credit_applied, 0)) > 0
        ORDER BY
            CASE status
                WHEN 'partial_paid' THEN 1  -- Prioritize partial_paid
                ELSE 2
            END,
            billing_month ASC              -- Then oldest first
        LIMIT ?
    `, [customerId, maxInvoices]);

    // 2. Calculate running balance
    let remainingPayment = paymentAmount;
    const selected: AutoSelectedInvoice[] = [];

    for (let i = 0; i < unpaidInvoices.length && remainingPayment > 0; i++) {
        const invoice = unpaidInvoices[i];
        selected.push({
            ...invoice,
            selection_order: i + 1
        });
        remainingPayment -= invoice.balance_due;
    }

    // 3. If payment exceeds selected invoices, try to add more
    if (remainingPayment > 0 && unpaidInvoices.length === maxInvoices) {
        // Fetch additional invoices if needed
        const moreInvoices = await db.query(`
            SELECT ...
            OFFSET ?
            LIMIT 3
        `, [customerId, maxInvoices]);

        // Add more until payment is exhausted
        // ...
    }

    return selected;
}
```

### 3.6 Stored Procedure for Payment Allocation

```sql
DELIMITER //
CREATE PROCEDURE sp_allocate_payment(
    IN p_payment_record_id INT,
    IN p_billing_ids JSON,           -- Array of billing IDs in order
    IN p_created_by INT,
    OUT p_excess_amount DECIMAL(10,2)
)
BEGIN
    DECLARE v_payment_amount DECIMAL(10,2);
    DECLARE v_remaining_amount DECIMAL(10,2);
    DECLARE v_billing_id INT;
    DECLARE v_balance_due DECIMAL(10,2);
    DECLARE v_allocate_amount DECIMAL(10,2);
    DECLARE v_order INT DEFAULT 1;
    DECLARE v_customer_id INT;
    DECLARE v_credit_id INT;

    -- Start transaction
    START TRANSACTION;

    -- Get payment amount and customer
    SELECT amount, customer_id INTO v_payment_amount, v_customer_id
    FROM payment_records
    WHERE id = p_payment_record_id;

    SET v_remaining_amount = v_payment_amount;

    -- First, check for available customer credit
    -- (Apply credit before payment)

    -- Process each billing in order
    billing_loop: WHILE v_remaining_amount > 0 AND JSON_LENGTH(p_billing_ids) > 0 DO
        -- Get next billing ID
        SET v_billing_id = JSON_EXTRACT(p_billing_ids, '$[0]');
        SET p_billing_ids = JSON_REMOVE(p_billing_ids, '$[0]');

        IF v_billing_id IS NULL THEN
            LEAVE billing_loop;
        END IF;

        -- Get billing balance
        SELECT balance_due, customer_id INTO v_balance_due, v_customer_id
        FROM monthly_billing
        WHERE id = v_billing_id;

        -- Calculate allocation
        SET v_allocate_amount = LEAST(v_remaining_amount, v_balance_due);

        -- Create allocation record
        INSERT INTO payment_allocations (
            payment_record_id, billing_id, customer_id,
            allocation_order, allocated_amount,
            invoice_balance_before, invoice_balance_after,
            resulting_status, created_by
        ) VALUES (
            p_payment_record_id, v_billing_id, v_customer_id,
            v_order, v_allocate_amount,
            v_balance_due, v_balance_due - v_allocate_amount,
            IF(v_balance_due - v_allocate_amount = 0, 'paid', 'partial_paid'),
            p_created_by
        );

        -- Update billing
        UPDATE monthly_billing SET
            amount_paid = COALESCE(amount_paid, 0) + v_allocate_amount,
            status = IF((total_amount - COALESCE(amount_paid, 0) - v_allocate_amount - COALESCE(credit_applied, 0)) <= 0, 'paid', 'partial_paid'),
            last_payment_date = CURDATE(),
            payment_count = COALESCE(payment_count, 0) + 1
        WHERE id = v_billing_id;

        SET v_remaining_amount = v_remaining_amount - v_allocate_amount;
        SET v_order = v_order + 1;
    END WHILE;

    -- Handle excess payment
    SET p_excess_amount = v_remaining_amount;

    IF v_remaining_amount > 0 THEN
        -- Create customer credit record
        INSERT INTO customer_credit (
            customer_id, payment_record_id,
            original_amount, current_balance,
            status, notes
        ) VALUES (
            v_customer_id, p_payment_record_id,
            v_remaining_amount, v_remaining_amount,
            'available', 'Auto-created from excess payment'
        );

        SET v_credit_id = LAST_INSERT_ID();

        -- Update payment record with excess info
        UPDATE payment_records SET
            excess_amount = v_remaining_amount,
            allocation_status = 'has_excess'
        WHERE id = p_payment_record_id;

        -- Create notification for excess payment
        INSERT INTO payment_notifications (
            customer_id, billing_id, notification_type,
            title, message, priority, action_url
        ) VALUES (
            v_customer_id, NULL, 'excess_payment',
            'Excess Payment Recorded',
            CONCAT('Customer has $', v_remaining_amount, ' credit available. Consider refund if needed.'),
            'medium',
            CONCAT('/dashboard/payments/credit/', v_credit_id)
        );
    ELSE
        -- Update payment record
        UPDATE payment_records SET
            total_allocated = v_payment_amount,
            allocation_status = 'fully_allocated'
        WHERE id = p_payment_record_id;
    END IF;

    COMMIT;
END //
DELIMITER ;
```

---

## Phase 4: Refund Management System

### 4.1 Refund Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      REFUND WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Excess     │───▶│   Refund     │───▶│   Admin      │       │
│  │   Detected   │    │   Request    │    │   Approval   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Notification│    │   Pending    │    │   Approved   │       │
│  │  to User     │    │   Status     │    │   Status     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                  │               │
│                                                  ▼               │
│                                          ┌──────────────┐       │
│                                          │   Process    │       │
│                                          │   Refund     │       │
│                                          └──────────────┘       │
│                                                  │               │
│                           ┌──────────────────────┼──────────┐   │
│                           ▼                      ▼          ▼   │
│                    ┌──────────┐          ┌──────────┐  ┌──────┐ │
│                    │ Interac  │          │  Cash    │  │Cheque│ │
│                    │ Transfer │          │  Return  │  │Issue │ │
│                    └──────────┘          └──────────┘  └──────┘ │
│                                                                  │
│                                                  │               │
│                                                  ▼               │
│                                          ┌──────────────┐       │
│                                          │   Update     │       │
│                                          │   Credit     │       │
│                                          │   Balance    │       │
│                                          └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Refund API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/refunds` | List all refunds (filters: status, customer, date) |
| GET | `/api/refunds/[id]` | Get refund details |
| POST | `/api/refunds` | Create refund request |
| PUT | `/api/refunds/[id]/approve` | Approve refund (admin only) |
| PUT | `/api/refunds/[id]/complete` | Mark refund as completed |
| PUT | `/api/refunds/[id]/cancel` | Cancel refund request |

### 4.3 Refund Implementation

```typescript
// refundService.ts

interface RefundRequest {
    sourceType: 'credit' | 'payment';
    creditId?: number;
    paymentRecordId?: number;
    customerId: number;
    refundAmount: number;
    refundMethod: 'interac' | 'cash' | 'cheque' | 'other';
    reason: string;
}

async function createRefundRequest(
    request: RefundRequest,
    requestedBy: number
): Promise<number> {
    // Validate source has sufficient balance
    if (request.sourceType === 'credit') {
        const credit = await getCustomerCredit(request.creditId);
        if (credit.current_balance < request.refundAmount) {
            throw new Error('Insufficient credit balance');
        }
    }

    // Create refund record
    const refundId = await db.insert('refund_records', {
        source_type: request.sourceType,
        credit_id: request.creditId,
        payment_record_id: request.paymentRecordId,
        customer_id: request.customerId,
        refund_amount: request.refundAmount,
        refund_method: request.refundMethod,
        refund_date: new Date(),
        reason: request.reason,
        status: 'pending',
        requested_by: requestedBy
    });

    // Create notification for admin
    await createNotification({
        type: 'refund_request',
        title: 'Refund Request Pending Approval',
        message: `Refund of $${request.refundAmount} requested for customer`,
        priority: 'high',
        action_url: `/dashboard/payments/refunds/${refundId}`
    });

    return refundId;
}

async function approveRefund(
    refundId: number,
    approvedBy: number
): Promise<void> {
    // Start transaction
    await db.transaction(async (trx) => {
        // Update refund status
        await trx.update('refund_records', {
            status: 'completed',
            approved_by: approvedBy,
            approved_at: new Date()
        }, { id: refundId });

        // Get refund details
        const refund = await trx.query('SELECT * FROM refund_records WHERE id = ?', [refundId]);

        // Update credit balance
        if (refund.credit_id) {
            await trx.update('customer_credit', {
                current_balance: db.raw('current_balance - ?', [refund.refund_amount]),
                status: db.raw("IF(current_balance - ? <= 0, 'refunded', status)", [refund.refund_amount])
            }, { id: refund.credit_id });
        }

        // Create notification
        await createNotification({
            type: 'refund_completed',
            title: 'Refund Processed',
            message: `Refund of $${refund.refund_amount} has been processed`,
            customer_id: refund.customer_id
        });
    });
}
```

---

## Phase 5: Role-Based Delete with Password Confirmation

### 5.1 User Roles Table (if not exists)

```sql
-- User roles for authorization
CREATE TABLE IF NOT EXISTS user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role ENUM('admin', 'manager', 'staff', 'viewer') NOT NULL DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_role (user_id),
    INDEX idx_role (role)
);

-- Delete authorization log
CREATE TABLE delete_authorization_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    action_type ENUM('soft_delete', 'restore') NOT NULL,
    password_verified TINYINT(1) NOT NULL DEFAULT 0,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_table_record (table_name, record_id)
);
```

### 5.2 Delete Authorization Flow

```typescript
// deleteAuthorization.ts

interface DeleteAuthRequest {
    tableName: string;
    recordId: number;
    password: string;
    reason?: string;
}

// Roles that can delete
const DELETE_AUTHORIZED_ROLES = ['admin', 'manager'];

async function authorizeDelete(
    userId: number,
    request: DeleteAuthRequest
): Promise<{ authorized: boolean; error?: string }> {

    // 1. Check user role
    const userRole = await db.query(`
        SELECT role FROM user_roles WHERE user_id = ?
    `, [userId]);

    if (!userRole || !DELETE_AUTHORIZED_ROLES.includes(userRole.role)) {
        return {
            authorized: false,
            error: 'Insufficient permissions. Only Admin and Manager can delete records.'
        };
    }

    // 2. Verify password
    const user = await db.query(`
        SELECT password_hash FROM users WHERE id = ?
    `, [userId]);

    const passwordValid = await bcrypt.compare(request.password, user.password_hash);

    if (!passwordValid) {
        return {
            authorized: false,
            error: 'Invalid password. Please try again.'
        };
    }

    // 3. Log the authorization
    await db.insert('delete_authorization_log', {
        user_id: userId,
        table_name: request.tableName,
        record_id: request.recordId,
        action_type: 'soft_delete',
        password_verified: 1,
        ip_address: getClientIP(),
        user_agent: getUserAgent()
    });

    return { authorized: true };
}

// API endpoint implementation
// POST /api/payments/[id]/delete
async function handleDeletePayment(req, res) {
    const { id } = req.query;
    const { password, reason } = req.body;
    const userId = req.user.id;

    // Authorize deletion
    const auth = await authorizeDelete(userId, {
        tableName: 'payment_records',
        recordId: Number(id),
        password,
        reason
    });

    if (!auth.authorized) {
        return res.status(403).json({
            success: false,
            error: auth.error
        });
    }

    // Perform soft delete
    await db.update('payment_records', {
        deleted_flag: 1,
        deleted_at: new Date(),
        deleted_by: userId,
        delete_reason: reason
    }, { id });

    // Also soft delete related allocations
    await db.update('payment_allocations', {
        deleted_flag: 1,
        deleted_at: new Date(),
        deleted_by: userId
    }, { payment_record_id: id });

    // Reverse the allocation effects on invoices
    await reversePaymentAllocation(id);

    return res.json({ success: true });
}
```

### 5.3 Frontend Delete Confirmation Dialog

```typescript
// DeleteConfirmationDialog.tsx

interface DeleteConfirmationProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (password: string, reason: string) => void;
    recordType: string;
    recordId: number;
}

function DeleteConfirmationDialog({
    open,
    onClose,
    onConfirm,
    recordType,
    recordId
}: DeleteConfirmationProps) {
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!password) {
            setError('Password is required');
            return;
        }

        setLoading(true);
        try {
            await onConfirm(password, reason);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                <WarningIcon color="error" />
                Confirm Deletion
            </DialogTitle>
            <DialogContent>
                <Alert severity="warning">
                    You are about to delete {recordType} #{recordId}.
                    This action will be logged for audit purposes.
                </Alert>

                <TextField
                    label="Enter your password to confirm"
                    type="password"
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={!!error}
                    helperText={error}
                    margin="normal"
                    autoFocus
                />

                <TextField
                    label="Reason for deletion (optional)"
                    multiline
                    rows={2}
                    fullWidth
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    margin="normal"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleConfirm}
                    color="error"
                    disabled={loading || !password}
                >
                    {loading ? <CircularProgress size={20} /> : 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
```

---

## Phase 6: In-App Notifications (Auto-Delete)

### 6.1 Notification System Updates

```sql
-- Add auto-delete tracking to notifications
ALTER TABLE payment_notifications
ADD COLUMN auto_delete_on_action TINYINT(1) DEFAULT 0,
ADD COLUMN related_payment_id INT DEFAULT NULL,
ADD COLUMN related_interac_id INT DEFAULT NULL;
```

### 6.2 Notification Types

| Type | Description | Auto-Delete Trigger |
|------|-------------|---------------------|
| `interac_received` | New Interac payment detected | When payment is allocated |
| `excess_payment` | Payment has excess amount | When credit is used or refunded |
| `payment_allocated` | Payment applied to invoice | Never (informational) |
| `refund_request` | Refund pending approval | When refund is approved/cancelled |
| `refund_completed` | Refund has been processed | Read + 24 hours |

### 6.3 Auto-Delete Implementation

```typescript
// notificationService.ts

// Create notification with auto-delete setting
async function createPaymentNotification(
    type: string,
    data: any,
    autoDeleteOnAction: boolean = true
): Promise<number> {
    const notificationId = await db.insert('payment_notifications', {
        notification_type: type,
        title: getNotificationTitle(type),
        message: getNotificationMessage(type, data),
        priority: getNotificationPriority(type),
        customer_id: data.customerId,
        related_payment_id: data.paymentId,
        related_interac_id: data.interacId,
        auto_delete_on_action: autoDeleteOnAction ? 1 : 0,
        action_url: getNotificationActionUrl(type, data)
    });

    return notificationId;
}

// Delete notifications when payment is recorded/allocated
async function onPaymentAllocated(paymentRecordId: number, interacId?: number) {
    // Delete related notifications
    await db.update('payment_notifications', {
        is_dismissed: 1,
        dismissed_at: new Date()
    }, {
        auto_delete_on_action: 1,
        OR: [
            { related_payment_id: paymentRecordId },
            { related_interac_id: interacId }
        ]
    });
}

// Cleanup job for old notifications (run daily)
async function cleanupOldNotifications() {
    // Delete read notifications older than 7 days
    await db.delete('payment_notifications', {
        is_read: 1,
        read_at: { '<': subDays(new Date(), 7) }
    });

    // Delete dismissed notifications older than 30 days
    await db.delete('payment_notifications', {
        is_dismissed: 1,
        dismissed_at: { '<': subDays(new Date(), 30) }
    });
}
```

---

## Phase 7: API Endpoints Summary

### 7.1 Gmail Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gmail/auth` | Initiate OAuth flow |
| GET | `/api/gmail/callback` | OAuth callback (redirects) |
| GET | `/api/gmail/status` | Get connection status |
| POST | `/api/gmail/sync` | Trigger manual sync |
| DELETE | `/api/gmail/disconnect` | Remove Gmail connection |

### 7.2 Interac Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interac-transactions` | List transactions (filters: status, date, customer) |
| GET | `/api/interac-transactions/[id]` | Get single transaction with details |
| PUT | `/api/interac-transactions/[id]` | Update (confirm customer, ignore) |
| PUT | `/api/interac-transactions/[id]/confirm-customer` | Confirm auto-matched customer |
| DELETE | `/api/interac-transactions/[id]` | Soft delete (requires auth) |

### 7.3 Payment Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment-records` | List all payments |
| GET | `/api/payment-records/[id]` | Get payment with allocations |
| POST | `/api/payment-records` | Create payment (cash/interac) |
| POST | `/api/payment-records/[id]/allocate` | Allocate to invoices |
| POST | `/api/payment-records/[id]/unallocate` | Reverse allocation |
| DELETE | `/api/payment-records/[id]` | Soft delete (requires password) |

### 7.4 Customer Credit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customer-credit` | List all customer credits |
| GET | `/api/customer-credit/customer/[id]` | Get credit for specific customer |
| POST | `/api/customer-credit/[id]/apply` | Apply credit to invoice |

### 7.5 Refunds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/refunds` | List all refunds |
| GET | `/api/refunds/[id]` | Get refund details |
| POST | `/api/refunds` | Create refund request |
| PUT | `/api/refunds/[id]/approve` | Approve refund (admin) |
| PUT | `/api/refunds/[id]/complete` | Mark as completed |
| PUT | `/api/refunds/[id]/cancel` | Cancel request |

### 7.6 Invoices (Enhanced)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/monthly-billing/pending-payments` | Get unpaid invoices for allocation |
| GET | `/api/monthly-billing/auto-select` | Auto-select 3 oldest invoices |
| GET | `/api/monthly-billing/[id]/payment-history` | Get payment history for invoice |

---

## Phase 8: Frontend Implementation

### 8.1 New Pages Structure

```
Frontend/src/pages/dashboard/payments/
├── index.tsx                    # Payment dashboard overview
├── interac/
│   ├── index.tsx               # Interac transactions list
│   └── [id]/
│       └── allocate.tsx        # Allocate payment to invoices
├── cash/
│   ├── index.tsx               # Cash payments list
│   └── new.tsx                 # New cash payment form
├── history/
│   └── index.tsx               # Combined payment history
├── credit/
│   ├── index.tsx               # Customer credits list
│   └── [id].tsx                # Credit details & usage
├── refunds/
│   ├── index.tsx               # Refunds list
│   ├── new.tsx                 # Create refund request
│   └── [id].tsx                # Refund details
└── settings/
    └── gmail.tsx               # Gmail connection settings
```

### 8.2 Key Components

```typescript
// Component hierarchy

// 1. Payment Allocation with Auto-Select
├── PaymentAllocationPage
│   ├── PaymentSummaryCard
│   │   ├── Amount, Payer, Date
│   │   └── CustomerSelector (auto-populated, editable)
│   ├── InvoiceAutoSelector
│   │   ├── AutoSelectedInvoices (3 oldest)
│   │   ├── AddMoreInvoicesButton
│   │   └── InvoiceSearchModal
│   ├── AllocationPreview
│   │   ├── SelectedInvoicesList (draggable order)
│   │   ├── RunningBalanceDisplay
│   │   └── ExcessPaymentWarning
│   └── ConfirmAllocationButton

// 2. Delete Confirmation
├── DeleteConfirmationDialog
│   ├── WarningMessage
│   ├── PasswordInput
│   ├── ReasonInput
│   └── ActionButtons

// 3. Refund Management
├── RefundPage
│   ├── RefundRequestForm
│   │   ├── SourceSelector (credit/payment)
│   │   ├── AmountInput
│   │   ├── MethodSelector
│   │   └── ReasonTextarea
│   └── ApprovalWorkflow (admin only)

// 4. Customer Credit Card
├── CustomerCreditCard
│   ├── AvailableBalance
│   ├── UsageHistory
│   └── ActionButtons (Apply | Refund)
```

### 8.3 UI Mockups

**Invoice Auto-Selection View:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ALLOCATE PAYMENT                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Payment: $150.00 CAD                        Date: Dec 10, 2024         │
│  From: KRINESHKUMAR PATEL                    Ref: C1AwqurRmFYX          │
│                                                                          │
│  Customer: [Krinesh Patel ▼] (auto-matched, click to change)            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  AUTO-SELECTED INVOICES (3 oldest unpaid)           Remaining: $0.00    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  [#1] ✓  October 2024 Invoice                                           │
│         Balance: $50.00  →  $0.00 (WILL BE PAID)                        │
│         ○ Drag to reorder                                                │
│                                                                          │
│  [#2] ✓  November 2024 Invoice (Partial Paid)                           │
│         Balance: $75.00  →  $0.00 (WILL BE PAID)                        │
│         ○ Drag to reorder                                                │
│                                                                          │
│  [#3] ✓  December 2024 Invoice                                          │
│         Balance: $80.00  →  $55.00 (PARTIAL)                            │
│         ○ Drag to reorder                                                │
│                                                                          │
│  [+ Add More Invoices]                                                   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ⚠️ No excess payment - full amount will be allocated                    │
│                                                                          │
│                                    [Cancel]  [Confirm Allocation]        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Excess Payment Warning:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠️ EXCESS PAYMENT DETECTED                                              │
│                                                                          │
│  Payment Amount:     $200.00                                             │
│  Total Allocated:    $150.00                                             │
│  Excess Amount:      $50.00                                              │
│                                                                          │
│  The excess $50.00 will be saved as customer credit.                    │
│  You can refund this amount later if needed.                            │
│                                                                          │
│  [Continue with Credit]  [Add More Invoices]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order (Updated)

### Sprint 1: Foundation (Week 1)
1. Create all database migrations
2. Create user_roles table and seed data
3. Implement Gmail OAuth endpoints
4. Build Gmail connection settings page

### Sprint 2: Email Scanning & Matching (Week 2)
5. Implement email scanning service
6. Build customer auto-matching algorithm
7. Create customer_name_aliases learning system
8. Set up 30-minute background sync job
9. Build Interac transactions list page

### Sprint 3: Payment Allocation Core (Week 3)
10. Implement payment records API
11. Build invoice auto-selection logic (3 oldest)
12. Create allocation stored procedure
13. Build payment allocation page with drag-reorder

### Sprint 4: Excess & Credit System (Week 4)
14. Implement customer credit tables
15. Build excess payment handling
16. Create credit application API
17. Build customer credit management page

### Sprint 5: Refund System (Week 5)
18. Implement refund records API
19. Build refund request form
20. Create approval workflow
21. Build refund management page

### Sprint 6: Delete Authorization (Week 6)
22. Implement role-based delete API
23. Build password confirmation dialog
24. Create delete authorization logging
25. Add delete functionality to all relevant pages

### Sprint 7: Cash Payments & History (Week 7)
26. Create cash payment form
27. Build combined payment history page
28. Implement soft delete across all tables
29. Add filters and search

### Sprint 8: Notifications & Polish (Week 8)
30. Implement in-app notification system
31. Add auto-delete notification triggers
32. Performance optimization
33. Error handling and edge cases
34. Testing

---

## Technical Dependencies

### New NPM Packages
```json
{
  "googleapis": "^118.0.0",       // Gmail API
  "node-cron": "^3.0.2",          // Background jobs (30 min)
  "bcryptjs": "^2.4.3",           // Password verification
  "fuse.js": "^6.6.2"             // Fuzzy search for customer matching
}
```

### Google Cloud Console Setup
1. Create new project or use existing
2. Enable Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `{your-domain}/api/gmail/callback`
5. Add test users (during development)
6. Request verification for production

---

## Security Considerations

1. **OAuth Token Storage**: Encrypt tokens with AES-256 before storing
2. **Password Verification**: Use bcrypt with salt rounds ≥ 10
3. **Delete Logging**: All deletes logged with IP, user agent, timestamp
4. **Role Enforcement**: Middleware checks role before sensitive operations
5. **Rate Limiting**: Limit password attempts (5 per minute)
6. **Audit Trail**: All financial operations logged for compliance

---

## File Structure Overview

```
Backend/
├── pages/api/
│   ├── gmail/
│   │   ├── auth.ts
│   │   ├── callback.ts
│   │   ├── status.ts
│   │   ├── sync.ts
│   │   └── disconnect.ts
│   ├── interac-transactions/
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   └── [id]/confirm-customer.ts
│   ├── payment-records/
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   └── [id]/
│   │       ├── allocate.ts
│   │       └── unallocate.ts
│   ├── customer-credit/
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   └── customer/[id].ts
│   └── refunds/
│       ├── index.ts
│       ├── [id].ts
│       └── [id]/
│           ├── approve.ts
│           ├── complete.ts
│           └── cancel.ts
├── src/
│   ├── services/
│   │   ├── gmailService.ts
│   │   ├── interacScanner.ts
│   │   ├── customerMatcher.ts
│   │   ├── paymentAllocator.ts
│   │   ├── creditService.ts
│   │   ├── refundService.ts
│   │   └── deleteAuthorization.ts
│   ├── jobs/
│   │   ├── emailSyncJob.ts
│   │   └── notificationCleanup.ts
│   └── middleware/
│       └── roleCheck.ts
└── migrations/
    ├── 012_gmail_oauth_settings.sql
    ├── 013_interac_transactions.sql
    ├── 014_customer_name_aliases.sql
    ├── 015_payment_records.sql
    ├── 016_payment_allocations.sql
    ├── 017_customer_credit.sql
    ├── 018_refund_records.sql
    ├── 019_user_roles.sql
    ├── 020_delete_authorization_log.sql
    └── 021_update_monthly_billing.sql

Frontend/
├── src/
│   ├── pages/dashboard/payments/
│   │   ├── index.tsx
│   │   ├── interac/
│   │   ├── cash/
│   │   ├── history/
│   │   ├── credit/
│   │   ├── refunds/
│   │   └── settings/
│   ├── sections/payments/
│   │   ├── InteracTransactionList.tsx
│   │   ├── PaymentAllocationDialog.tsx
│   │   ├── InvoiceAutoSelector.tsx
│   │   ├── CustomerMatchSelector.tsx
│   │   ├── CashPaymentForm.tsx
│   │   ├── PaymentHistoryTable.tsx
│   │   ├── CustomerCreditCard.tsx
│   │   ├── RefundRequestForm.tsx
│   │   ├── DeleteConfirmationDialog.tsx
│   │   └── GmailConnectionCard.tsx
│   └── components/
│       └── notifications/
│           └── PaymentNotificationList.tsx
```

---

This comprehensive plan covers all requirements including:
- ✅ 30-minute background sync
- ✅ Single Gmail account (expandable to 3)
- ✅ Customer auto-matching with override
- ✅ Auto-select 3 oldest unpaid invoices
- ✅ Excess payment handling with customer credit
- ✅ Refund management system
- ✅ 30-day historical import on first connect
- ✅ In-app notifications with auto-delete
- ✅ Role-based delete with password confirmation
