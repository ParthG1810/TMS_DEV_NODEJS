import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Container } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getMealPlan, updateMealPlan } from '../../../redux/slices/mealPlan';
// @types
import { IMealPlanFormValues } from '../../../@types/tms';
// components
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import LoadingScreen from '../../../components/loading-screen';
// sections
import MealPlanNewEditForm from '../../../sections/@dashboard/tiffin/meal-plan/MealPlanNewEditForm';
import DashboardLayout from '../../../layouts/dashboard';

// ----------------------------------------------------------------------

MealPlanEditPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function MealPlanEditPage() {
  const { query } = useRouter();
  const dispatch = useDispatch();

  const { mealPlan, isLoading } = useSelector((state) => state.mealPlan);

  const { id } = query;

  useEffect(() => {
    if (id) {
      dispatch(getMealPlan(Number(id)));
    }
  }, [dispatch, id]);

  const handleSubmit = async (data: IMealPlanFormValues) => {
    if (id) {
      const result: any = await dispatch(updateMealPlan(Number(id), data));
      if (result && !result.success) {
        throw new Error(result.error);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Edit Meal Plan | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Edit meal plan"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Meal Plans', href: PATH_DASHBOARD.tiffin.mealPlans },
            { name: mealPlan?.meal_name || '' },
          ]}
        />

        {isLoading ? (
          <LoadingScreen />
        ) : (
          <MealPlanNewEditForm isEdit currentMealPlan={mealPlan || undefined} onSubmit={handleSubmit} />
        )}
      </Container>
    </>
  );
}
