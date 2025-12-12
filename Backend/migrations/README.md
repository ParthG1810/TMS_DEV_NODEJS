# Database Migrations

## Payment Status Enums Migration

### Status Flow

| User Action | Billing Status | Customer Order Status | Auto-Updates |
|---|---|---|---|
| Calculate bill | `calculating` | `calculating` | None |
| Finalize bill | `pending` | `pending` | Notifications created |
| Approve bill | `finalized` | `finalized` | Orders, Notifications, Billing list |
| Reject bill | `calculating` | `calculating` | Orders, Notifications (deleted), Billing list |
| Mark paid | `paid` | `paid` | All related data |

### Running the Migration

```bash
# Connect to your MySQL database
mysql -u your_username -p your_database_name

# Run the migration
source Backend/migrations/update-payment-status-enums.sql
```

Or using Node.js:

```bash
cd Backend
node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  const sql = fs.readFileSync('./migrations/update-payment-status-enums.sql', 'utf8');
  await connection.query(sql);
  console.log('Migration completed successfully!');
  await connection.end();
})();
"
```

### Valid Enum Values

**monthly_billing.status:**
- `calculating` - Initial state, bill being calculated
- `pending` - Finalized and awaiting approval
- `finalized` - Approved and ready for payment
- `paid` - Payment received

**customer_orders.payment_status:**
- `calculating` - Order payment being calculated
- `pending` - Order in pending billing
- `finalized` - Order in approved bill
- `paid` - Order paid

### Important Notes

1. **Consistency**: Both tables use the same enum values to maintain synchronization
2. **Auto-sync**: Backend automatically updates customer_orders when billing status changes
3. **Real-time**: Frontend Redux state refreshes automatically on approve/reject actions
