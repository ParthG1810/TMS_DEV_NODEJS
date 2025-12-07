import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Container } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getCustomerOrder, updateCustomerOrder } from '../../../redux/slices/customerOrder';
// @types
import { ICustomerOrderFormValues } from '../../../@types/tms';
// components
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import LoadingScreen from '../../../components/loading-screen';
// sections
import OrderNewEditForm from '../../../sections/@dashboard/tiffin/order/OrderNewEditForm';
import DashboardLayout from '../../../layouts/dashboard';

// ----------------------------------------------------------------------

OrderEditPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function OrderEditPage() {
  const { query } = useRouter();
  const dispatch = useDispatch();

  const { order, isLoading } = useSelector((state) => state.customerOrder);

  const { id } = query;

  useEffect(() => {
    if (id) {
      dispatch(getCustomerOrder(Number(id)));
    }
  }, [dispatch, id]);

  const handleSubmit = async (data: ICustomerOrderFormValues) => {
    if (id) {
      const result: any = await dispatch(updateCustomerOrder(Number(id), data));
      if (result && !result.success) {
        throw new Error(result.error);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Edit Tiffin Order | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Edit tiffin order"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Orders', href: PATH_DASHBOARD.tiffin.orders },
            { name: order?.customer_name || '' },
          ]}
        />

        {isLoading ? (
          <LoadingScreen />
        ) : (
          <OrderNewEditForm isEdit currentOrder={order || undefined} onSubmit={handleSubmit} />
        )}
      </Container>
    </>
  );
}
