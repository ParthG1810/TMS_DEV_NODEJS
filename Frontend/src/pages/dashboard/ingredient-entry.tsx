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
  getTMSIngredient,
  createTMSIngredient,
  updateTMSIngredient,
} from '../../redux/slices/tmsIngredient';
// @types
import { IIngredientFormValues } from '../../@types/tms';
// components
import CustomBreadcrumbs from '../../components/custom-breadcrumbs';
// sections
import IngredientNewEditForm from '../../sections/@dashboard/tms/ingredient/IngredientNewEditForm';
import DashboardLayout from '../../layouts/dashboard';

// ----------------------------------------------------------------------

IngredientEntryPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function IngredientEntryPage() {
  const dispatch = useDispatch();

  const { pathname, query } = useRouter();

  const id = query.id as string;

  const { ingredient } = useSelector((state) => state.tmsIngredient);

  const isEdit = pathname.includes('edit') || !!id;

  useEffect(() => {
    if (id) {
      dispatch(getTMSIngredient(Number(id)));
    }
  }, [dispatch, id]);

  const handleSubmit = async (data: IIngredientFormValues) => {
    if (isEdit && id) {
      await dispatch(updateTMSIngredient(Number(id), data));
    } else {
      await dispatch(createTMSIngredient(data));
    }
  };

  return (
    <>
      <Head>
        <title>{!isEdit ? 'Create a new ingredient' : 'Edit ingredient'} | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading={!isEdit ? 'Create a new ingredient' : 'Edit ingredient'}
          links={[
            {
              name: 'Dashboard',
              href: PATH_DASHBOARD.root,
            },
            {
              name: 'Ingredient',
              href: PATH_DASHBOARD.ingredient.list,
            },
            { name: !isEdit ? 'New ingredient' : ingredient?.name || '' },
          ]}
        />

        <IngredientNewEditForm
          isEdit={isEdit}
          currentIngredient={isEdit ? ingredient || undefined : undefined}
          onSubmit={handleSubmit}
        />
      </Container>
    </>
  );
}
