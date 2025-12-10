@echo off
echo =====================================================
echo Test Case: Rajesh Kumar - December 2025
echo =====================================================
echo.
echo Creating test data and calculating billing...
echo.

mysql -u root -pMysql tms_db < test-rajesh-december-2025.sql

echo.
echo =====================================================
echo Test complete! Review the output above.
echo =====================================================
pause
