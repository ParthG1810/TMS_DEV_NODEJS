import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Container } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../redux/store';
import {
  getTMSRecipe,
  createTMSRecipe,
  updateTMSRecipe,
} from '../../redux/slices/tmsRecipe';
// @types
import { IRecipeFormValues } from '../../@types/tms';
// components
import CustomBreadcrumbs from '../../components/custom-breadcrumbs';
// sections
import RecipeNewEditForm from '../../sections/@dashboard/tms/recipe/RecipeNewEditForm';
import DashboardLayout from '../../layouts/dashboard';

// ----------------------------------------------------------------------

RecipeCreationPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function RecipeCreationPage() {
  const dispatch = useDispatch();

  const { pathname, query } = useRouter();

  const id = query.id as string;

  const { recipe } = useSelector((state) => state.tmsRecipe);

  const isEdit = pathname.includes('edit') || !!id;

  useEffect(() => {
    if (id) {
      dispatch(getTMSRecipe(Number(id)));
    }
  }, [dispatch, id]);

  const handleSubmit = async (data: IRecipeFormValues) => {
    if (isEdit && id) {
      await dispatch(updateTMSRecipe(Number(id), data));
    } else {
      await dispatch(createTMSRecipe(data));
    }
  };

  return (
    <>
      <Head>
        <title>{!isEdit ? 'Create a new recipe' : 'Edit recipe'} | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading={!isEdit ? 'Create a new recipe' : 'Edit recipe'}
          links={[
            {
              name: 'Dashboard',
              href: PATH_DASHBOARD.root,
            },
            {
              name: 'Recipe',
              href: PATH_DASHBOARD.recipe.list,
            },
            { name: !isEdit ? 'New recipe' : recipe?.name || '' },
          ]}
        />

        <RecipeNewEditForm
          isEdit={isEdit}
          currentRecipe={isEdit ? recipe || undefined : undefined}
          onSubmit={handleSubmit}
        />
      </Container>
    </>
  );
}
