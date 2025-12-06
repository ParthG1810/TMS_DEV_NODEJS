// next
import Head from 'next/head';
import { useEffect } from 'react';
// @mui
import { useTheme } from '@mui/material/styles';
import {
  Container,
  Grid,
  Stack,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  alpha,
} from '@mui/material';
// auth
import { useAuthContext } from '../../auth/useAuthContext';
// layouts
import DashboardLayout from '../../layouts/dashboard';
// redux
import { useDispatch, useSelector } from '../../redux/store';
import { getMealPlans } from '../../redux/slices/mealPlan';
import { getCustomers } from '../../redux/slices/customer';
import { getCustomerOrders, getDailyTiffinCount } from '../../redux/slices/customerOrder';
// _mock_
import {
  _appFeatured,
  _appAuthors,
  _appInstalled,
  _appRelated,
  _appInvoices,
} from '../../_mock/arrays';
// components
import { useSettingsContext } from '../../components/settings';
import Iconify from '../../components/iconify';
// sections
import {
  AppWidget,
  AppWelcome,
  AppFeatured,
  AppNewInvoice,
  AppTopAuthors,
  AppTopRelated,
  AppAreaInstalled,
  AppWidgetSummary,
  AppCurrentDownload,
  AppTopInstalledCountries,
} from '../../sections/@dashboard/general/app';
// assets
import { SeoIllustration } from '../../assets/illustrations';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
import { useRouter } from 'next/router';

// ----------------------------------------------------------------------

GeneralAppPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function GeneralAppPage() {
  const { user } = useAuthContext();
  const dispatch = useDispatch();
  const router = useRouter();
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();

  // Fetch tiffin management data
  const { mealPlans } = useSelector((state) => state.mealPlan);
  const { customers } = useSelector((state) => state.customer);
  const { customerOrders, dailySummary } = useSelector((state) => state.customerOrder);

  useEffect(() => {
    dispatch(getMealPlans());
    dispatch(getCustomers());
    dispatch(getCustomerOrders());
    dispatch(getDailyTiffinCount());
  }, [dispatch]);

  // Calculate statistics
  const totalMealPlans = mealPlans?.length || 0;
  const totalCustomers = customers?.length || 0;
  const activeOrders = customerOrders
    ? customerOrders.filter((order) => {
        const endDate = new Date(order.end_date);
        return endDate >= new Date();
      }).length
    : 0;
  const todayTiffinCount = dailySummary?.total_count || 0;

  return (
    <>
      <Head>
        <title> Dashboard | TMS</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'xl'}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <AppWelcome
              title={`Welcome back! \n ${user?.displayName}`}
              description="Manage your tiffin service with ease. Track meal plans, customers, and daily operations."
              img={
                <SeoIllustration
                  sx={{
                    p: 3,
                    width: 360,
                    margin: { xs: 'auto', md: 'inherit' },
                  }}
                />
              }
              action={
                <Button
                  variant="contained"
                  onClick={() => router.push(PATH_DASHBOARD.tiffin.orders)}
                >
                  Manage Tiffin Orders
                </Button>
              }
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              <AppWidget
                title="Today's Tiffin Count"
                total={todayTiffinCount}
                icon="eva:shopping-bag-fill"
                color="success"
                chart={{
                  series: 100,
                }}
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <AppWidgetSummary
              title="Total Meal Plans"
              percent={0}
              total={totalMealPlans}
              chart={{
                colors: [theme.palette.primary.main],
                series: [5, 18, 12, 51, 68, 11, 39, 37, 27, 20],
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <AppWidgetSummary
              title="Total Customers"
              percent={0}
              total={totalCustomers}
              chart={{
                colors: [theme.palette.info.main],
                series: [20, 41, 63, 33, 28, 35, 50, 46, 11, 26],
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <AppWidgetSummary
              title="Active Orders"
              percent={0}
              total={activeOrders}
              chart={{
                colors: [theme.palette.warning.main],
                series: [8, 9, 31, 8, 16, 37, 8, 33, 46, 31],
              }}
            />
          </Grid>

          {/* Tiffin Management Quick Actions */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Tiffin Management
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
              }}
            >
              <CardActionArea onClick={() => router.push(PATH_DASHBOARD.tiffin.mealPlans)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify icon="eva:menu-fill" width={32} color={theme.palette.primary.main} />
                    </Box>
                    <Box>
                      <Typography variant="h4">{totalMealPlans}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Meal Plans
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.16) },
              }}
            >
              <CardActionArea onClick={() => router.push(PATH_DASHBOARD.tiffin.customers)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.info.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify icon="eva:people-fill" width={32} color={theme.palette.info.main} />
                    </Box>
                    <Box>
                      <Typography variant="h4">{totalCustomers}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Customers
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.16) },
              }}
            >
              <CardActionArea onClick={() => router.push(PATH_DASHBOARD.tiffin.orders)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify
                        icon="eva:shopping-cart-fill"
                        width={32}
                        color={theme.palette.success.main}
                      />
                    </Box>
                    <Box>
                      <Typography variant="h4">{activeOrders}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Orders
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.16) },
              }}
            >
              <CardActionArea onClick={() => router.push(PATH_DASHBOARD.tiffin.dailyCount)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify
                        icon="eva:calendar-fill"
                        width={32}
                        color={theme.palette.warning.main}
                      />
                    </Box>
                    <Box>
                      <Typography variant="h4">{todayTiffinCount}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Today's Count
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.secondary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.16) },
              }}
            >
              <CardActionArea onClick={() => router.push(PATH_DASHBOARD.tiffin.monthlyList)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.secondary.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify
                        icon="eva:list-fill"
                        width={32}
                        color={theme.palette.secondary.main}
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">Monthly List</Typography>
                      <Typography variant="body2" color="text.secondary">
                        View this month
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.16) },
              }}
            >
              <CardActionArea onClick={() => router.push(PATH_DASHBOARD.tiffin.completeList)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.error.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify
                        icon="eva:archive-fill"
                        width={32}
                        color={theme.palette.error.main}
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">Complete List</Typography>
                      <Typography variant="body2" color="text.secondary">
                        All orders
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} lg={8}>
            <AppNewInvoice
              title="New Invoice"
              tableData={_appInvoices}
              tableLabels={[
                { id: 'id', label: 'Invoice ID' },
                { id: 'category', label: 'Category' },
                { id: 'price', label: 'Price' },
                { id: 'status', label: 'Status' },
                { id: '' },
              ]}
            />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <AppTopRelated title="Top Related Applications" list={_appRelated} />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <AppTopInstalledCountries title="Top Installed Countries" list={_appInstalled} />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <AppTopAuthors title="Top Authors" list={_appAuthors} />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Stack spacing={3}>
              <AppWidget
                title="Conversion"
                total={38566}
                icon="eva:person-fill"
                chart={{
                  series: 48,
                }}
              />

              <AppWidget
                title="Applications"
                total={55566}
                icon="eva:email-fill"
                color="info"
                chart={{
                  series: 75,
                }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
