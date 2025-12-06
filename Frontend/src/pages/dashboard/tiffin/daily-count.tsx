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
  Typography,
  Box,
  Stack,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getDailyTiffinCount } from '../../../redux/slices/customerOrder';
// components
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Scrollbar from '../../../components/scrollbar';
import LoadingScreen from '../../../components/loading-screen';
import DashboardLayout from '../../../layouts/dashboard';

// ----------------------------------------------------------------------

DailyTiffinCountPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function DailyTiffinCountPage() {
  const dispatch = useDispatch();
  const { dailySummary, isLoading } = useSelector((state) => state.customerOrder);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    dispatch(getDailyTiffinCount(dateStr));
  }, [selectedDate, dispatch]);

  return (
    <>
      <Head>
        <title>Daily Tiffin Count | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Daily Tiffin Count"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Daily Count' },
          ]}
        />

        <Card>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 3 }}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newDate) => newDate && setSelectedDate(newDate)}
              renderInput={(params) => <TextField {...params} />}
            />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Total Count: {dailySummary?.total_count || 0}
            </Typography>
          </Stack>

          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <LoadingScreen />
            </Box>
          ) : (
            <TableContainer>
              <Scrollbar>
                <Table sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer Name</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell>Meal Plan</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {dailySummary?.orders && dailySummary.orders.map((order, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell align="center">
                          <Typography variant="h6">{order.quantity}</Typography>
                        </TableCell>
                        <TableCell>{order.meal_plan_name}</TableCell>
                      </TableRow>
                    ))}

                    {(!dailySummary?.orders || !dailySummary.orders.length) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No orders for this date
                          </Typography>
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
