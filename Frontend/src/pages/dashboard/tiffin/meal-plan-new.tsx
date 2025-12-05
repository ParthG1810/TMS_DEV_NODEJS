import Head from 'next/head';
// @mui
import { Container } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch } from '../../../redux/store';
import { createMealPlan } from '../../../redux/slices/mealPlan';
// @types
import { IMealPlanFormValues } from '../../../@types/tms';
// components
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
// sections
import MealPlanNewEditForm from '../../../sections/@dashboard/tiffin/meal-plan/MealPlanNewEditForm';
import DashboardLayout from '../../../layouts/dashboard';

// ----------------------------------------------------------------------

MealPlanNewPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function MealPlanNewPage() {
  const dispatch = useDispatch();

  const handleSubmit = async (data: IMealPlanFormValues) => {
    const result: any = await dispatch(createMealPlan(data));
    if (result && !result.success) {
      throw new Error(result.error);
    }
  };

  return (
    <>
      <Head>
        <title>New Meal Plan | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Create a new meal plan"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Meal Plans', href: PATH_DASHBOARD.tiffin.mealPlans },
            { name: 'New Meal Plan' },
          ]}
        />

        <MealPlanNewEditForm onSubmit={handleSubmit} />
      </Container>
    </>
  );
}
