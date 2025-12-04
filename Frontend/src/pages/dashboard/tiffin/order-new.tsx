import Head from 'next/head';
// @mui
import { Container } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch } from '../../../redux/store';
import { createCustomerOrder } from '../../../redux/slices/customerOrder';
// @types
import { ICustomerOrderFormValues } from '../../../@types/tms';
// components
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
// sections
import OrderNewEditForm from '../../../sections/@dashboard/tiffin/order/OrderNewEditForm';
import DashboardLayout from '../../../layouts/dashboard';

// ----------------------------------------------------------------------

OrderNewPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function OrderNewPage() {
  const dispatch = useDispatch();

  const handleSubmit = async (data: ICustomerOrderFormValues) => {
    await dispatch(createCustomerOrder(data));
  };

  return (
    <>
      <Head>
        <title>New Tiffin Order | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Create a new tiffin order"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Orders', href: PATH_DASHBOARD.tiffin.orders },
            { name: 'New Order' },
          ]}
        />

        <OrderNewEditForm onSubmit={handleSubmit} />
      </Container>
    </>
  );
}
