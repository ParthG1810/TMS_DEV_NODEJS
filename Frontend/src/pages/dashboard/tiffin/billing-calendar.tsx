import { useState, useEffect } from 'react';
import Head from 'next/head';
// @mui
import {
  Container,
  Card,
  Box,
  Typography,
  Button,
  Stack,
  MenuItem,
  TextField,
  IconButton,
  Chip,
} from '@mui/material';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// components
import { useSettingsContext } from '../../../components/settings';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Iconify from '../../../components/iconify';
import { useSnackbar } from '../../../components/snackbar';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import {
  getCalendarGrid,
  finalizeBilling,
  getMonthlyBillings,
} from '../../../redux/slices/payment';
// sections
import CalendarGrid from '../../../sections/@dashboard/tiffin/billing/CalendarGrid';
// types
import { ICalendarCustomerData } from '../../../@types/tms';

// ----------------------------------------------------------------------

BillingCalendarPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function BillingCalendarPage() {
  const { themeStretch } = useSettingsContext();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  // Get current month and year
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12

  const { calendarData, isLoading, monthlyBillings } = useSelector((state) => state.payment);

  // Load calendar data when month/year changes
  useEffect(() => {
    const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    dispatch(getCalendarGrid(monthStr));
    dispatch(getMonthlyBillings(monthStr));
  }, [dispatch, selectedYear, selectedMonth]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const handleFinalizeAll = async () => {
    const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const pendingBillings = monthlyBillings.filter((b) => b.status === 'calculating');

    if (pendingBillings.length === 0) {
      enqueueSnackbar('No billings to finalize', { variant: 'info' });
      return;
    }

    try {
      for (const billing of pendingBillings) {
        await dispatch(finalizeBilling(billing.id, 'admin', 'Month-end finalization'));
      }

      enqueueSnackbar(`Finalized ${pendingBillings.length} billing(s) successfully!`, {
        variant: 'success',
      });

      // Reload data
      dispatch(getCalendarGrid(monthStr));
      dispatch(getMonthlyBillings(monthStr));
    } catch (error) {
      enqueueSnackbar('Failed to finalize billings', { variant: 'error' });
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const currentMonthName = monthNames[selectedMonth - 1];

  // Calculate summary stats
  const totalCustomers = calendarData?.customers?.length || 0;
  const totalAmount = (calendarData?.customers || []).reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
  const pendingCount = (calendarData?.customers || []).filter((c) => c.billing_status === 'calculating').length;
  const finalizedCount = (calendarData?.customers || []).filter((c) => c.billing_status === 'pending').length;

  return (
    <>
      <Head>
        <title>Monthly Billing Calendar | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'xl'}>
        <CustomBreadcrumbs
          heading="Monthly Billing Calendar"
          links={[
            { name: 'Dashboard', href: '/dashboard' },
            { name: 'Tiffin', href: '/dashboard/tiffin' },
            { name: 'Billing Calendar' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:checkmark-circle-fill" />}
              onClick={handleFinalizeAll}
              disabled={pendingCount === 0}
            >
              Finalize All ({pendingCount})
            </Button>
          }
        />

        {/* Month Selector */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={() => handleMonthChange('prev')} size="small">
                <Iconify icon="eva:arrow-ios-back-fill" />
              </IconButton>

              <Typography variant="h4" sx={{ minWidth: 200, textAlign: 'center' }}>
                {currentMonthName} {selectedYear}
              </Typography>

              <IconButton onClick={() => handleMonthChange('next')} size="small">
                <Iconify icon="eva:arrow-ios-forward-fill" />
              </IconButton>
            </Stack>

            {/* Summary Stats */}
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip
                label={`${totalCustomers} Customers`}
                color="info"
                variant="outlined"
              />
              <Chip
                label={`CAD $${totalAmount.toFixed(2)} Total`}
                color="success"
                variant="outlined"
              />
              <Chip
                label={`${pendingCount} Calculating`}
                color="warning"
                variant="outlined"
              />
              <Chip
                label={`${finalizedCount} Finalized`}
                color="primary"
                variant="outlined"
              />
            </Stack>
          </Stack>
        </Card>

        {/* Legend */}
        <Card sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: 'success.main',
                  borderRadius: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 12,
                }}
              >
                T
              </Box>
              <Typography variant="body2">Tiffin Delivered</Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: 'grey.400',
                  borderRadius: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 12,
                }}
              >
                A
              </Box>
              <Typography variant="body2">Absent/Cancelled</Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: 'info.main',
                  borderRadius: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 12,
                }}
              >
                E
              </Box>
              <Typography variant="body2">Extra Tiffin</Typography>
            </Stack>
          </Stack>
        </Card>

        {/* Calendar Grid */}
        {calendarData && (
          <CalendarGrid
            year={selectedYear}
            month={selectedMonth}
            customers={calendarData.customers}
            onUpdate={() => {
              const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
              dispatch(getCalendarGrid(monthStr));
              dispatch(getMonthlyBillings(monthStr));
            }}
          />
        )}

        {!isLoading && !calendarData && (
          <Card sx={{ p: 5 }}>
            <Typography variant="body1" align="center" color="text.secondary">
              No data available for this month
            </Typography>
          </Card>
        )}
      </Container>
    </>
  );
}
