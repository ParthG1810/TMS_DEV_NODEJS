#!/bin/bash
# ============================================================
# TMS Database Data Export Script
# ============================================================
# Exports all data from the database to a SQL file
# Usage: ./export_data.sh
# ============================================================

# Load environment variables from .env
if [ -f "../Backend/.env" ]; then
    export $(grep -v '^#' ../Backend/.env | xargs)
fi

# Database credentials (defaults if not in .env)
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-Mysql}
DB_NAME=${DB_NAME:-tms_db}
DB_PORT=${DB_PORT:-3306}

# Output file with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="data_backup_${TIMESTAMP}.sql"

echo "============================================================"
echo "TMS Database Data Export"
echo "============================================================"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Output: $OUTPUT_FILE"
echo "============================================================"

# Check if MySQL is accessible
if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" &>/dev/null; then
    echo "ERROR: Cannot connect to MySQL server"
    echo "Please check your database credentials in Backend/.env"
    exit 1
fi

# Export data only (no schema)
echo "Exporting data..."
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
    --no-create-info \
    --skip-triggers \
    --skip-routines \
    --complete-insert \
    --skip-extended-insert \
    --order-by-primary \
    --single-transaction \
    "$DB_NAME" > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    # Also create a symlink to latest backup
    ln -sf "$OUTPUT_FILE" "data_backup.sql"

    echo "============================================================"
    echo "SUCCESS: Data exported to $OUTPUT_FILE"
    echo "Symlink created: data_backup.sql -> $OUTPUT_FILE"
    echo "============================================================"

    # Show file size
    echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"

    # Show record counts
    echo ""
    echo "Record counts:"
    echo "------------------------------------------------------------"
    for table in meal_plans customers customer_orders tiffin_calendar_entries monthly_billing payment_notifications payment_history pricing_rules gmail_oauth_settings interac_transactions customer_name_aliases payment_records payment_allocations customer_credit customer_credit_usage refund_records user_roles delete_authorization_log; do
        count=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -N -e "SELECT COUNT(*) FROM $table" "$DB_NAME" 2>/dev/null)
        if [ ! -z "$count" ]; then
            printf "  %-30s %s\n" "$table:" "$count"
        fi
    done
    echo "------------------------------------------------------------"
else
    echo "ERROR: Export failed!"
    exit 1
fi
