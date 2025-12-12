# Payment Workflow Implementation Plan

## Overview
A comprehensive payment tracking system that automatically scans Gmail for Interac e-Transfer notifications, stores payment data, and allows users to allocate payments to invoices with support for partial payments and cash transactions.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT WORKFLOW SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐   │
│  │   Gmail     │───▶│  Email Scanner   │───▶│  interac_transactions   │   │
│  │   OAuth     │    │  (Background)    │    │  (Raw Email Data)       │   │
│  └─────────────┘    └──────────────────┘    └─────────────────────────┘   │
│                                                        │                    │
│                                                        ▼                    │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐   │
│  │   Cash      │───▶│  Payment         │◀───│  Payment Allocation     │   │
│  │   Entry     │    │  Recording       │    │  UI (Select Invoices)   │   │
│  └─────────────┘    └──────────────────┘    └─────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │  payment_records │                                    │
│                    │  (Master Table)  │                                    │
│                    └──────────────────┘                                    │
│                              │                                              │
│                              ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │payment_allocations│                                   │
│                    │(Invoice Linkage) │                                    │
│                    └──────────────────┘                                    │
│                              │                                              │
│                              ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │  monthly_billing │                                    │
│                    │  (Update Status) │                                    │
│                    └──────────────────┘                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Gmail OAuth Integration

### 1.1 Database Schema - Gmail Connection Settings

```sql
-- Store Gmail OAuth credentials per company/user
CREATE TABLE gmail_oauth_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    last_sync_email_id VARCHAR(255) DEFAULT NULL,  -- Track last scanned email ID
    last_sync_at DATETIME DEFAULT NULL,
    sync_enabled TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_email (user_id, email_address)
);
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

---

## Phase 2: Email Scanning Service

### 2.1 Database Schema - Interac Transactions

```sql
-- Store raw Interac email data
CREATE TABLE interac_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    gmail_settings_id INT NOT NULL,
    gmail_message_id VARCHAR(255) NOT NULL UNIQUE,  -- Gmail's message ID for deduplication
    email_date DATETIME NOT NULL,
    sender_name VARCHAR(255) NOT NULL,              -- "KRINESHKUMAR PATEL"
    reference_number VARCHAR(100) NOT NULL,         -- "C1AwqurRmFYX"
    amount DECIMAL(10,2) NOT NULL,                  -- 35.00
    currency VARCHAR(10) DEFAULT 'CAD',
    raw_email_body TEXT,                            -- Store full email for audit
    status ENUM('pending', 'allocated', 'ignored', 'deleted') DEFAULT 'pending',
    matched_customer_id INT DEFAULT NULL,           -- Auto-match attempt
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,
    FOREIGN KEY (gmail_settings_id) REFERENCES gmail_oauth_settings(id),
    FOREIGN KEY (matched_customer_id) REFERENCES customers(id),
    INDEX idx_reference (reference_number),
    INDEX idx_status (status),
    INDEX idx_email_date (email_date)
);
```

### 2.2 Email Scanning Logic

**Backend Files:**
- `Backend/src/services/interacScanner.ts` - Email parsing service
- `Backend/src/jobs/emailSyncJob.ts` - Background job runner
- `Backend/pages/api/gmail/sync.ts` - Manual sync trigger

**Scanning Algorithm:**
```typescript
// Pseudocode
async function scanInteracEmails(gmailSettingsId: number) {
    // 1. Get Gmail settings with tokens
    // 2. Search for emails from notify@payments.interac.ca
    //    - Start from lastSyncEmailId if exists (incremental)
    //    - Otherwise scan last 30 days (initial)
    // 3. Parse each email for transfer details
    // 4. Insert new transactions (skip duplicates by gmail_message_id)
    // 5. Update lastSyncEmailId and lastSyncAt
}
```

**Email Parsing Regex:**
```typescript
const patterns = {
    date: /Date:\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/,
    reference: /Reference Number:\s*([A-Za-z0-9]+)/,
    sender: /Sent From:\s*([^\n]+)/,
    amount: /Amount:\s*\$?([\d,]+\.?\d*)\s*\(?(CAD)?\)?/
};
```

### 2.3 Background Job Configuration

**Options:**
1. **Cron-based (Recommended for simplicity):** Run every 5-15 minutes
2. **On-demand:** Trigger sync when user opens payment page
3. **Webhook (Advanced):** Use Gmail Push Notifications (Pub/Sub)

**Implementation:** Use `node-cron` for scheduled execution on server startup

---

## Phase 3: Payment Records & Allocation System

### 3.1 Database Schema - Master Payment Records

```sql
-- Master table for ALL payments (Interac + Cash)
CREATE TABLE payment_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_type ENUM('online', 'cash') NOT NULL,
    payment_source VARCHAR(50) DEFAULT NULL,        -- 'interac', 'stripe', etc.
    interac_transaction_id INT DEFAULT NULL,        -- Link to interac_transactions

    -- Payment details
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL,
    payer_name VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,

    -- Allocation tracking
    total_allocated DECIMAL(10,2) DEFAULT 0.00,
    remaining_balance DECIMAL(10,2) AS (amount - total_allocated) STORED,
    allocation_status ENUM('unallocated', 'partial', 'fully_allocated')
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
    INDEX idx_payment_date (payment_date),
    INDEX idx_deleted (deleted_flag),
    INDEX idx_allocation_status (allocation_status)
);

-- Payment allocations to invoices (many-to-many)
CREATE TABLE payment_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_record_id INT NOT NULL,
    billing_id INT NOT NULL,                        -- monthly_billing.id
    customer_id INT NOT NULL,

    -- Allocation details
    allocation_order INT NOT NULL,                  -- Order user selected (1,2,3...)
    allocated_amount DECIMAL(10,2) NOT NULL,

    -- Invoice state at allocation time
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

### 3.2 Update monthly_billing Table

```sql
-- Add balance tracking columns to existing table
ALTER TABLE monthly_billing
ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN balance_due DECIMAL(10,2) AS (total_amount - amount_paid) STORED,
ADD COLUMN last_payment_date DATE DEFAULT NULL,
ADD COLUMN payment_count INT DEFAULT 0;
```

### 3.3 Stored Procedure for Payment Allocation

```sql
DELIMITER //
CREATE PROCEDURE sp_allocate_payment(
    IN p_payment_record_id INT,
    IN p_billing_ids JSON,           -- Array of billing IDs in order
    IN p_created_by INT
)
BEGIN
    DECLARE v_remaining_amount DECIMAL(10,2);
    DECLARE v_billing_id INT;
    DECLARE v_balance_due DECIMAL(10,2);
    DECLARE v_allocate_amount DECIMAL(10,2);
    DECLARE v_order INT DEFAULT 1;
    DECLARE v_customer_id INT;

    -- Get payment amount
    SELECT amount INTO v_remaining_amount
    FROM payment_records
    WHERE id = p_payment_record_id;

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
            amount_paid = amount_paid + v_allocate_amount,
            status = IF(balance_due - v_allocate_amount = 0, 'paid', 'partial_paid'),
            last_payment_date = CURDATE(),
            payment_count = payment_count + 1
        WHERE id = v_billing_id;

        SET v_remaining_amount = v_remaining_amount - v_allocate_amount;
        SET v_order = v_order + 1;
    END WHILE;

    -- Update payment record
    UPDATE payment_records SET
        total_allocated = amount - v_remaining_amount,
        allocation_status = IF(v_remaining_amount = 0, 'fully_allocated',
                              IF(v_remaining_amount = amount, 'unallocated', 'partial'))
    WHERE id = p_payment_record_id;
END //
DELIMITER ;
```

---

## Phase 4: API Endpoints

### 4.1 Gmail Integration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gmail/auth` | Initiate OAuth flow |
| GET | `/api/gmail/callback` | OAuth callback |
| GET | `/api/gmail/status` | Check connection status |
| POST | `/api/gmail/sync` | Trigger manual sync |
| DELETE | `/api/gmail/disconnect` | Remove connection |

### 4.2 Interac Transaction Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interac-transactions` | List all transactions |
| GET | `/api/interac-transactions/[id]` | Get single transaction |
| PUT | `/api/interac-transactions/[id]` | Update status (ignore/delete) |
| POST | `/api/interac-transactions/[id]/allocate` | Allocate to invoices |

### 4.3 Payment Record Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment-records` | List all payments (filters: type, status, date range) |
| GET | `/api/payment-records/[id]` | Get payment with allocations |
| POST | `/api/payment-records` | Create cash payment |
| PUT | `/api/payment-records/[id]` | Update payment |
| DELETE | `/api/payment-records/[id]` | Soft delete payment |
| POST | `/api/payment-records/[id]/allocate` | Allocate to invoices |
| POST | `/api/payment-records/[id]/unallocate` | Reverse allocation |

### 4.4 Invoice/Billing Endpoints (Enhance Existing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/monthly-billing/pending-payments` | Get invoices awaiting payment (finalized + partial_paid) |
| GET | `/api/monthly-billing/[id]/payment-history` | Get all payments for an invoice |

---

## Phase 5: Frontend Implementation

### 5.1 New Pages

```
Frontend/src/pages/dashboard/payments/
├── index.tsx                    # Payment dashboard overview
├── interac/
│   ├── index.tsx               # Interac transactions list
│   └── [id]/allocate.tsx       # Allocate payment to invoices
├── cash/
│   ├── index.tsx               # Cash payments list
│   └── new.tsx                 # New cash payment form
├── history/
│   └── index.tsx               # Combined payment history
└── settings/
    └── gmail.tsx               # Gmail connection settings
```

### 5.2 Component Structure

```typescript
// Interac Transactions Page Components
├── InteracTransactionTable
│   ├── TransactionRow
│   │   ├── DateCell
│   │   ├── SenderCell
│   │   ├── AmountCell
│   │   ├── StatusBadge
│   │   └── ActionButtons (Allocate | Ignore | Delete)
│   └── BulkActions

// Payment Allocation Dialog
├── PaymentAllocationDialog
│   ├── PaymentSummary (Amount, Payer, Date)
│   ├── CustomerSearch (Optional filter)
│   ├── InvoiceSelector
│   │   ├── InvoiceCard
│   │   │   ├── InvoiceDetails
│   │   │   ├── CurrentBalance
│   │   │   ├── SelectionOrder (#1, #2, etc.)
│   │   │   └── CheckboxSelector
│   │   └── RemainingBalanceIndicator
│   ├── AllocationPreview
│   │   ├── SelectedInvoicesList
│   │   └── RemainingAfterAllocation
│   └── ConfirmButton

// Cash Payment Form
├── CashPaymentForm
│   ├── PaymentDetailsSection
│   │   ├── AmountInput
│   │   ├── DatePicker
│   │   ├── PayerNameInput
│   │   └── NotesTextarea
│   └── InvoiceAllocationSection (Same as above)

// Payment History Table
├── PaymentHistoryTable
│   ├── FilterBar (Date range, Type, Status)
│   ├── HistoryRow
│   │   ├── PaymentInfo
│   │   ├── AllocatedInvoices
│   │   ├── TypeBadge (Online/Cash)
│   │   └── Actions (View | Delete)
│   └── Pagination
```

### 5.3 Key UI Features

**Invoice Selection with Running Balance:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Payment: $100.00 CAD from KRINESHKUMAR PATEL                   │
│  Remaining to allocate: $25.00                                  │
├─────────────────────────────────────────────────────────────────┤
│  □  Invoice #INV-2024-001 (John Doe) - Dec 2024                │
│     Balance Due: $50.00  →  After: $0.00 (PAID)        [#1]    │
├─────────────────────────────────────────────────────────────────┤
│  □  Invoice #INV-2024-002 (Jane Smith) - Dec 2024              │
│     Balance Due: $75.00  →  After: $50.00 (PARTIAL)    [#2]    │
├─────────────────────────────────────────────────────────────────┤
│  ○  Invoice #INV-2024-003 (Bob Wilson) - Nov 2024              │
│     Balance Due: $30.00                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 6: Background Service Setup

### 6.1 Email Sync Job

**File:** `Backend/src/jobs/emailSyncJob.ts`

```typescript
import cron from 'node-cron';
import { scanAllGmailAccounts } from '../services/interacScanner';

// Run every 10 minutes
export function startEmailSyncJob() {
    cron.schedule('*/10 * * * *', async () => {
        console.log('[EmailSync] Starting scheduled sync...');
        try {
            await scanAllGmailAccounts();
            console.log('[EmailSync] Sync completed');
        } catch (error) {
            console.error('[EmailSync] Error:', error);
        }
    });
}
```

### 6.2 Server Startup Integration

**Modify:** `Backend/pages/api/[...path].ts` or create initialization script

```typescript
// On server start
import { startEmailSyncJob } from '../../src/jobs/emailSyncJob';

// Initialize background jobs
if (process.env.NODE_ENV === 'production') {
    startEmailSyncJob();
}
```

---

## Phase 7: Notifications System

### 7.1 Payment Notifications

**Trigger Points:**
1. New Interac email detected → "New payment received from [Name]"
2. Payment allocated → "Payment of $X applied to Invoice #Y"
3. Invoice fully paid → "Invoice #Y is now fully paid"
4. Payment deleted → "Payment #X was marked as deleted"

**Implementation:**
- Use existing `payment_notifications` table
- Add new notification types: 'interac_received', 'payment_allocated', 'invoice_paid'

---

## Implementation Order (Recommended)

### Sprint 1: Foundation (Database + Gmail Auth)
1. Create all database migrations
2. Implement Gmail OAuth endpoints
3. Create Gmail connection settings UI

### Sprint 2: Email Scanning
4. Implement email scanning service
5. Create Interac transactions API
6. Build Interac transactions list page
7. Set up background sync job

### Sprint 3: Payment Allocation
8. Implement payment records API
9. Build payment allocation dialog
10. Create allocation stored procedure
11. Update monthly_billing with balance tracking

### Sprint 4: Cash Payments + History
12. Create cash payment form
13. Build combined payment history page
14. Implement soft delete functionality
15. Add notification triggers

### Sprint 5: Polish + Testing
16. Add error handling and validation
17. Implement notification system
18. Write tests
19. Performance optimization

---

## Recommendations & Improvements

### Security
1. **Encrypt OAuth Tokens:** Use AES encryption for storing Gmail tokens
2. **Rate Limiting:** Limit API calls to prevent abuse
3. **Audit Logging:** Log all payment operations for compliance
4. **Role-Based Access:** Only admins should delete payments

### Performance
1. **Batch Processing:** Process multiple emails in parallel
2. **Caching:** Cache customer list for invoice matching
3. **Database Indexes:** Ensure proper indexes on frequently queried columns
4. **Pagination:** Always paginate large lists

### User Experience
1. **Auto-Match Customer:** Try to match sender name to existing customers
2. **Quick Actions:** Allow bulk allocation for multiple transactions
3. **Search & Filter:** Comprehensive search across all payment fields
4. **Export:** Allow exporting payment history to CSV/Excel

### Reliability
1. **Idempotency:** Use Gmail message_id to prevent duplicate processing
2. **Transaction Safety:** Use database transactions for allocations
3. **Error Recovery:** Store failed syncs for retry
4. **Backup Tokens:** Handle token refresh gracefully

### Additional Features to Consider
1. **Payment Reports:** Weekly/monthly payment summary reports
2. **Customer Portal:** Allow customers to view their payment history
3. **Reminders:** Auto-send payment reminders for overdue invoices
4. **Reconciliation:** Tools to reconcile bank statements with recorded payments
5. **Multi-Currency:** Support for USD or other currencies
6. **Receipt Generation:** Auto-generate payment receipts as PDF

---

## Questions for Clarification

1. **Multi-User Support:** Will multiple users need their own Gmail connections, or one central account?
2. **Customer Matching:** How should we match Interac sender names to customers? (Exact match, fuzzy match, manual selection?)
3. **Partial Payment Handling:** If a payment exceeds all selected invoices, what happens to the excess? (Keep as credit? Return to customer?)
4. **Notification Preferences:** Should users receive email/SMS notifications for new payments?
5. **Historical Data:** Should we import historical emails on first setup, or only track new ones?
6. **Access Control:** Who can delete payments? Should there be approval workflow for deletions?

---

## Technical Dependencies

### New NPM Packages
```json
{
  "googleapis": "^118.0.0",      // Gmail API
  "node-cron": "^3.0.2",         // Background jobs
  "crypto-js": "^4.1.1"          // Token encryption (optional)
}
```

### Google Cloud Console Setup
1. Create new project or use existing
2. Enable Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `{your-domain}/api/gmail/callback`
5. Add test users (during development)

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
│   │   └── [id].ts
│   └── payment-records/
│       ├── index.ts
│       ├── [id].ts
│       └── [id]/
│           ├── allocate.ts
│           └── unallocate.ts
├── src/
│   ├── services/
│   │   ├── gmailService.ts
│   │   └── interacScanner.ts
│   └── jobs/
│       └── emailSyncJob.ts
└── migrations/
    ├── 012_gmail_oauth_settings.sql
    ├── 013_interac_transactions.sql
    ├── 014_payment_records.sql
    ├── 015_payment_allocations.sql
    └── 016_update_monthly_billing.sql

Frontend/
├── src/
│   ├── pages/dashboard/payments/
│   │   ├── index.tsx
│   │   ├── interac/
│   │   ├── cash/
│   │   ├── history/
│   │   └── settings/
│   └── sections/payments/
│       ├── InteracTransactionList.tsx
│       ├── PaymentAllocationDialog.tsx
│       ├── CashPaymentForm.tsx
│       ├── PaymentHistoryTable.tsx
│       └── GmailConnectionCard.tsx
```

This plan provides a comprehensive foundation for implementing the payment workflow system while maintaining flexibility for future enhancements.
