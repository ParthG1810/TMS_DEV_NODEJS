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
  getTMSProduct,
  createTMSProduct,
  updateTMSProduct,
} from '../../redux/slices/tmsProduct';
// @types
import { IProductFormValues } from '../../@types/tms';
// components
import CustomBreadcrumbs from '../../components/custom-breadcrumbs';
// sections
import ProductNewEditForm from '../../sections/@dashboard/tms/product/ProductNewEditForm';
import DashboardLayout from '../../layouts/dashboard';

// ----------------------------------------------------------------------

ProductEntryPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function ProductEntryPage() {
  const dispatch = useDispatch();

  const { pathname, query } = useRouter();

  const id = query.id as string;

  const { product } = useSelector((state) => state.tmsProduct);

  const isEdit = pathname.includes('edit') || !!id;

  useEffect(() => {
    if (id) {
      dispatch(getTMSProduct(Number(id)));
    }
  }, [dispatch, id]);

  const handleSubmit = async (data: IProductFormValues) => {
    if (isEdit && id) {
      await dispatch(updateTMSProduct(Number(id), data));
    } else {
      await dispatch(createTMSProduct(data));
    }
  };

  return (
    <>
      <Head>
        <title>{!isEdit ? 'Create a new product' : 'Edit product'} | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading={!isEdit ? 'Create a new product' : 'Edit product'}
          links={[
            {
              name: 'Dashboard',
              href: PATH_DASHBOARD.root,
            },
            {
              name: 'Product',
              href: PATH_DASHBOARD.product.list,
            },
            { name: !isEdit ? 'New product' : product?.name || '' },
          ]}
        />

        <ProductNewEditForm
          isEdit={isEdit}
          currentProduct={isEdit ? product || undefined : undefined}
          onSubmit={handleSubmit}
        />
      </Container>
    </>
  );
}
