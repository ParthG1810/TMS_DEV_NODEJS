import { useEffect, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
// @mui
import {
  Card,
  Table,
  TableRow,
  TableBody,
  TableCell,
  Container,
  TableContainer,
  TableHead,
  Stack,
  Chip,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getMonthlyTiffinList } from '../../../redux/slices/customerOrder';
// components
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Scrollbar from '../../../components/scrollbar';
import LoadingScreen from '../../../components/loading-screen';
import DashboardLayout from '../../../layouts/dashboard';

// ----------------------------------------------------------------------

MonthlyTiffinListPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default function MonthlyTiffinListPage() {
  const dispatch = useDispatch();
  const { monthlyOrders, isLoading } = useSelector((state) => state.customerOrder);

  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    const monthStr = format(selectedMonth, 'yyyy-MM');
    dispatch(getMonthlyTiffinList(monthStr));
  }, [selectedMonth, dispatch]);

  return (
    <>
      <Head>
        <title>Monthly Tiffin List | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Monthly Tiffin List"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Monthly List' },
          ]}
        />

        <Card>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 3 }}>
            <DatePicker
              label="Select Month"
              value={selectedMonth}
              onChange={(newDate) => newDate && setSelectedMonth(newDate)}
              views={['year', 'month']}
              slotProps={{
                textField: {
                  fullWidth: false,
                },
              }}
            />
          </Stack>

          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <LoadingScreen />
            </Box>
          ) : (
            <TableContainer>
              <Scrollbar>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Meal Plan</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell>Selected Days</TableCell>
                      <TableCell align="right">Price (₹)</TableCell>
                      <TableCell>Period</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {monthlyOrders.map((order, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.meal_plan_name}</TableCell>
                        <TableCell align="center">{order.quantity}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {order.selected_days && order.selected_days.length > 0 ? (
                              order.selected_days.slice(0, 3).map((day) => (
                                <Chip key={day} label={day.substring(0, 3)} size="small" />
                              ))
                            ) : (
                              <Chip label="All" size="small" />
                            )}
                            {order.selected_days && order.selected_days.length > 3 && (
                              <Chip
                                label={`+${order.selected_days.length - 3}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">₹{order.price.toFixed(2)}</TableCell>
                        <TableCell>
                          {format(new Date(order.start_date), 'dd MMM yyyy')} -{' '}
                          {format(new Date(order.end_date), 'dd MMM yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}

                    {!monthlyOrders.length && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No orders for this month
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Scrollbar>
            </TableContainer>
          )}
        </Card>
      </Container>
    </>
  );
}
