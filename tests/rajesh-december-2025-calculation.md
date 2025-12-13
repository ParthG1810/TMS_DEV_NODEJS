# Rajesh Kumar - December 2025 Billing Calculation Analysis

## Test Case Details

**Customer**: Rajesh Kumar
**Meal Plan**: Standard Lunch Box (Mon-Fri)
**Order Price**: CAD $50.00
**Date Range**: December 8-30, 2025
**Quantity**: 1

### Calendar Entries

**Plan Days (Mon-Fri)**: Dec 8-30, 2025
- **Week 1**: Dec 8 (Mon), 9 (Tue), 10 (Wed), 11 (Thu), 12 (Fri) = 5 days
- **Week 2**: Dec 15 (Mon), 16 (Tue), 17 (Wed), 18 (Thu), 19 (Fri) = 5 days
- **Week 3**: Dec 22 (Mon), 23 (Tue), 24 (Wed), 25 (Thu), 26 (Fri) = 5 days
- **Week 4**: Dec 29 (Mon), 30 (Tue) = 2 days

**Total Plan Days**: 17 weekdays

### Specific Entries:
- **Dec 9 (Tuesday)**: Absent (status 'A')
- **Dec 20 (Saturday)**: Extra tiffin @ $5.00 (status 'E')
- **All other plan days**: Delivered (status 'T')

---

## Current Calculation Logic (Migration 010/011)

### Formula:
```
Base Amount = (Order Price / Total Plan Days) × Delivered Count
Extra Amount = Sum of prices for 'E' status entries
Total Amount = Base Amount + Extra Amount
```

### Calculation:
```
Order Price: $50.00
Total Plan Days: 17 (count of 'T' + 'A' entries)
Delivered Days: 16 (count of 'T' entries, excluding Dec 9 which is 'A')
Extra Days: 1 (Dec 20)

Per-Tiffin Price = $50.00 / 17 = $2.941176

Base Amount = $2.941176 × 16 = $47.058824
Extra Amount = $5.00
Total Amount = $47.058824 + $5.00 = $52.058824
```

**Expected Result**: **$52.06**

---

## User's Expected Calculation

**Expected Total**: **$37.609**

### Working Backwards:
```
If Total = $37.609 and Extra = $5.00:
Base Amount = $37.609 - $5.00 = $32.609

If Delivered = 16:
Per-Tiffin Price = $32.609 / 16 = $2.038

If Per-Tiffin = $2.038:
Total Plan Days = $50.00 / $2.038 = 24.53 days
```

---

## Possible Interpretations

### Option 1: Calendar Days Instead of Weekdays
If we count **all calendar days** from Dec 8-30 (not just Mon-Fri):
```
Total Calendar Days: 23 days
Per-Tiffin Price = $50.00 / 23 = $2.1739

But this gives:
Base = $2.1739 × 16 = $34.78 (still doesn't match $32.609)
```

### Option 2: Different Plan Days Count
If Total Plan Days = 15:
```
Per-Tiffin Price = $50.00 / 15 = $3.333
Base = $3.333 × 16 = $53.33 (doesn't match)
```

### Option 3: Prorate for Partial Month
December 2025 has 23 weekdays total (Mon-Fri).
Order is only for Dec 8-30, which is 17 weekdays.

If we prorate the monthly price:
```
Monthly Price for Full Month: $50.00
Weekdays in Full December: 23
Weekdays in Order Period (Dec 8-30): 17

Prorated Price = $50.00 × (17 / 23) = $36.96

Per-Tiffin = $36.96 / 17 = $2.174
Base = $2.174 × 16 = $34.78
Total = $34.78 + $5.00 = $39.78 (closer but still not $37.609)
```

### Option 4: Fixed Per-Tiffin Rate
If the user expects a fixed rate of $2.038 per tiffin:
```
Base = $2.038 × 16 = $32.608
Total = $32.608 + $5.00 = $37.608 ✓ MATCHES!
```

---

## Questions to Clarify

1. **What is the $50.00 price for?**
   - Per month (regardless of days in order)?
   - For the entire order period (Dec 8-30)?
   - Per 30 days?

2. **How should partial months be calculated?**
   - Prorate based on calendar days?
   - Prorate based on weekdays?
   - Use full monthly price regardless?

3. **What should "Total Plan Days" include?**
   - Only delivered + absent days in the actual order period?
   - All weekdays in the billing month?
   - All calendar days?

---

## Recommended Approach

To get $37.609, we would need to:

1. **Calculate per-tiffin price as $2.038**
   - This could be: $50 / 24.53 days
   - Or a fixed rate from meal plan

2. **Charge only for delivered tiffins**
   - Base: 16 × $2.038 = $32.608
   - Extra: $5.00
   - Total: $37.608

---

## Test Commands (Windows)

### Run the Test:
```cmd
cd database\scripts
run-test-rajesh.bat
```

Or manually:
```cmd
mysql -u root -pMysql tms_db < database\scripts\test-rajesh-december-2025.sql
```

### Expected Output:
The script will show:
- ✅ Calendar entries created
- ✅ Entry counts (16 delivered, 1 absent, 1 extra)
- ✅ Current billing calculation
- ✅ Expected vs Actual comparison

---

## Action Items

**Please review the test output and confirm:**

1. What the current calculation gives (likely $52.06)
2. What you expect it to be ($37.609)
3. How the $50.00 order price should be interpreted
4. Whether we need to change the calculation logic

Once confirmed, I can update the stored procedure to match your expected calculation method.
