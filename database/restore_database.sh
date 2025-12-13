#!/bin/bash
# ============================================================
# TMS Database Restore Script
# ============================================================
# Recreates the database from schema and optionally restores data
# Usage: ./restore_database.sh [data_file.sql]
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

# Data file (optional argument)
DATA_FILE=${1:-"data_backup.sql"}

echo "============================================================"
echo "TMS Database Restore"
echo "============================================================"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Schema: complete_schema.sql"
echo "Data: $DATA_FILE"
echo "============================================================"

# Check if MySQL is accessible
if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" &>/dev/null; then
    echo "ERROR: Cannot connect to MySQL server"
    echo "Please check your database credentials in Backend/.env"
    exit 1
fi

# Confirm before proceeding
read -p "WARNING: This will DROP and recreate the database. Continue? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1: Dropping existing database..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME"

echo "Step 2: Creating new database..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create database"
    exit 1
fi

echo "Step 3: Importing schema..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < complete_schema.sql

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to import schema"
    exit 1
fi

echo "Schema imported successfully!"

# Import data if file exists
if [ -f "$DATA_FILE" ]; then
    echo ""
    echo "Step 4: Restoring data from $DATA_FILE..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$DATA_FILE"

    if [ $? -eq 0 ]; then
        echo "Data restored successfully!"
    else
        echo "WARNING: Data restore may have had issues. Check your data file."
    fi
else
    echo ""
    echo "Step 4: No data file found at $DATA_FILE"
    echo "Skipping data restore. Database has empty tables."
fi

echo ""
echo "============================================================"
echo "Database restore complete!"
echo "============================================================"

# Show record counts
echo ""
echo "Current record counts:"
echo "------------------------------------------------------------"
for table in meal_plans customers customer_orders tiffin_calendar_entries monthly_billing; do
    count=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -N -e "SELECT COUNT(*) FROM $table" "$DB_NAME" 2>/dev/null)
    if [ ! -z "$count" ]; then
        printf "  %-30s %s\n" "$table:" "$count"
    fi
done
echo "------------------------------------------------------------"
