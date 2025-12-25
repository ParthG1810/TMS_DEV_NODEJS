// next
import Head from 'next/head';
import { useEffect, useMemo } from 'react';
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
  Divider,
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
import { getTMSIngredients } from '../../redux/slices/tmsIngredient';
import { getTMSRecipes } from '../../redux/slices/tmsRecipe';
import { getMonthlyBillings } from '../../redux/slices/payment';
// components
import { useSettingsContext } from '../../components/settings';
import Iconify from '../../components/iconify';
// sections
import {
  AppWidget,
  AppWelcome,
  AppWidgetSummary,
  AppPendingPayments,
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

  // Redux state
  const { mealPlans } = useSelector((state) => state.mealPlan);
  const { customers } = useSelector((state) => state.customer);
  const { customerOrders, dailySummary } = useSelector((state) => state.customerOrder);
  const { ingredients } = useSelector((state) => state.tmsIngredient);
  const { recipes } = useSelector((state) => state.tmsRecipe);
  const { monthlyBillings } = useSelector((state) => state.payment);

  // Fetch all data on mount
  useEffect(() => {
    dispatch(getMealPlans());
    dispatch(getCustomers());
    dispatch(getCustomerOrders());
    dispatch(getDailyTiffinCount());
    dispatch(getTMSIngredients());
    dispatch(getTMSRecipes());
    dispatch(getMonthlyBillings());
  }, [dispatch]);

  // Calculate statistics
  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    const totalIngredients = ingredients?.length || 0;
    const totalRecipes = recipes?.length || 0;
    const totalMealPlans = mealPlans?.length || 0;
    const totalCustomers = customers?.length || 0;

    const activeOrders = customerOrders
      ? customerOrders.filter((order) => {
          const endDate = new Date(order.end_date);
          return endDate >= new Date();
        }).length
      : 0;

    const todayTiffinCount = dailySummary?.total_count || 0;

    // Payment statistics
    const unpaidBillings = monthlyBillings?.filter(
      (b) => b.status !== 'paid'
    ) || [];

    const pendingPaymentsCount = unpaidBillings.length;

    const thisMonthRevenue = monthlyBillings
      ?.filter((b) => b.status === 'paid' && b.billing_month === currentMonth)
      .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

    return {
      totalIngredients,
      totalRecipes,
      totalMealPlans,
      totalCustomers,
      activeOrders,
      todayTiffinCount,
      pendingPaymentsCount,
      thisMonthRevenue,
      unpaidBillings,
    };
  }, [ingredients, recipes, mealPlans, customers, customerOrders, dailySummary, monthlyBillings]);

  return (
    <>
      <Head>
        <title> Dashboard | TMS</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'xl'}>
        <Grid container spacing={3}>
          {/* ROW 1: Welcome Banner + Today's Widget */}
          <Grid item xs={12} md={8}>
            <AppWelcome
              title={`Welcome back! \n ${user?.displayName}`}
              description="Manage your tiffin service with ease. Track ingredients, recipes, meal plans, and daily operations."
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
            <AppWidget
              title="Today's Tiffin Count"
              total={stats.todayTiffinCount}
              icon="eva:shopping-bag-fill"
              color="success"
              chart={{
                series: stats.todayTiffinCount > 0 ? 100 : 0,
              }}
            />
          </Grid>

          {/* ROW 2: Key Metrics (4 cards) */}
          <Grid item xs={12} sm={6} md={3}>
            <AppWidgetSummary
              title="Total Ingredients"
              percent={0}
              total={stats.totalIngredients}
              chart={{
                colors: [theme.palette.primary.main],
                series: [5, 18, 12, 51, 68, 11, 39, 37, 27, 20],
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <AppWidgetSummary
              title="Total Recipes"
              percent={0}
              total={stats.totalRecipes}
              chart={{
                colors: [theme.palette.info.main],
                series: [20, 41, 63, 33, 28, 35, 50, 46, 11, 26],
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <AppWidgetSummary
              title="This Month Revenue"
              percent={0}
              total={stats.thisMonthRevenue}
              chart={{
                colors: [theme.palette.success.main],
                series: [8, 9, 31, 8, 16, 37, 8, 33, 46, 31],
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <AppWidgetSummary
              title="Pending Payments"
              percent={0}
              total={stats.pendingPaymentsCount}
              chart={{
                colors: [theme.palette.error.main],
                series: [15, 25, 35, 20, 30, 25, 20, 15, 25, 30],
              }}
            />
          </Grid>

          {/* ROW 3: Tiffin Management - PROMINENT SECTION */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h5" sx={{ mb: 2, mt: 2 }}>
              Tiffin Management
            </Typography>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
                height: '100%',
              }}
            >
              <CardActionArea
                onClick={() => router.push(PATH_DASHBOARD.tiffin.mealPlans)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1,
                      }}
                    >
                      <Iconify icon="eva:menu-fill" width={28} color={theme.palette.primary.main} />
                    </Box>
                    <Typography variant="h4">{stats.totalMealPlans}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Meal Plans
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.16) },
                height: '100%',
              }}
            >
              <CardActionArea
                onClick={() => router.push(PATH_DASHBOARD.tiffin.customers)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.info.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1,
                      }}
                    >
                      <Iconify icon="eva:people-fill" width={28} color={theme.palette.info.main} />
                    </Box>
                    <Typography variant="h4">{stats.totalCustomers}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customers
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.16) },
                height: '100%',
              }}
            >
              <CardActionArea
                onClick={() => router.push(PATH_DASHBOARD.tiffin.orders)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1,
                      }}
                    >
                      <Iconify
                        icon="eva:shopping-cart-fill"
                        width={28}
                        color={theme.palette.success.main}
                      />
                    </Box>
                    <Typography variant="h4">{stats.activeOrders}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Orders
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.16) },
                height: '100%',
              }}
            >
              <CardActionArea
                onClick={() => router.push(PATH_DASHBOARD.tiffin.dailyCount)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1,
                      }}
                    >
                      <Iconify
                        icon="eva:calendar-fill"
                        width={28}
                        color={theme.palette.warning.main}
                      />
                    </Box>
                    <Typography variant="h4">{stats.todayTiffinCount}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Today's Count
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.secondary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.16) },
                height: '100%',
              }}
            >
              <CardActionArea
                onClick={() => router.push(PATH_DASHBOARD.tiffin.monthlyList)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.secondary.main, 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1,
                      }}
                    >
                      <Iconify
                        icon="eva:list-fill"
                        width={28}
                        color={theme.palette.secondary.main}
                      />
                    </Box>
                    <Typography variant="subtitle1">Monthly</Typography>
                    <Typography variant="body2" color="text.secondary">
                      View List
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.grey[500], 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.16) },
                height: '100%',
              }}
            >
              <CardActionArea
                onClick={() => router.push(PATH_DASHBOARD.tiffin.billingCalendar)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.grey[500], 0.24),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1,
                      }}
                    >
                      <Iconify
                        icon="eva:credit-card-fill"
                        width={28}
                        color={theme.palette.grey[600]}
                      />
                    </Box>
                    <Typography variant="subtitle1">Billing</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Calendar
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          {/* ROW 4: Other Modules (3 cards) */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h5" sx={{ mb: 2, mt: 2 }}>
              Quick Access
            </Typography>
          </Grid>

          {/* Ingredient Analysis Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.16),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Iconify icon="eva:layers-fill" width={24} color={theme.palette.primary.main} />
                  </Box>
                  <Box>
                    <Typography variant="h6">Ingredient Analysis</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.totalIngredients} ingredients
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => router.push(PATH_DASHBOARD.ingredient.list)}
                    startIcon={<Iconify icon="eva:list-fill" />}
                  >
                    View List
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => router.push(PATH_DASHBOARD.ingredient.new)}
                    startIcon={<Iconify icon="eva:plus-fill" />}
                  >
                    Add New
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Recipe Management Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.04),
                border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.info.main, 0.16),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Iconify icon="eva:book-open-fill" width={24} color={theme.palette.info.main} />
                  </Box>
                  <Box>
                    <Typography variant="h6">Recipe Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.totalRecipes} recipes
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => router.push(PATH_DASHBOARD.recipe.list)}
                    startIcon={<Iconify icon="eva:list-fill" />}
                  >
                    View List
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => router.push(PATH_DASHBOARD.recipe.new)}
                    startIcon={<Iconify icon="eva:plus-fill" />}
                  >
                    Create Recipe
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Payments Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.04),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.warning.main, 0.16),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Iconify
                      icon="eva:credit-card-fill"
                      width={24}
                      color={theme.palette.warning.main}
                    />
                  </Box>
                  <Box>
                    <Typography variant="h6">Payments</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.pendingPaymentsCount} pending
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => router.push(PATH_DASHBOARD.payments.history)}
                    startIcon={<Iconify icon="eva:clock-fill" />}
                  >
                    History
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => router.push(PATH_DASHBOARD.payments.cashPayment)}
                    startIcon={<Iconify icon="eva:plus-fill" />}
                  >
                    Record Payment
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ROW 5: Pending Payments Table */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12}>
            <AppPendingPayments
              title="Pending Payments"
              subheader="Customers with unpaid bills"
              tableData={stats.unpaidBillings}
              onViewAll={() => router.push(PATH_DASHBOARD.tiffin.billingStatus)}
              onViewBilling={(billing) =>
                router.push(PATH_DASHBOARD.tiffin.billingDetails(billing.id.toString()))
              }
            />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
