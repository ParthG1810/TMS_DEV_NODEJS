import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { Container } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getCustomer, updateCustomer } from '../../../redux/slices/customer';
// @types
import { ICustomerFormValues } from '../../../@types/tms';
// components
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import LoadingScreen from '../../../components/loading-screen';
// sections
import CustomerNewEditForm from '../../../sections/@dashboard/tiffin/customer/CustomerNewEditForm';
import DashboardLayout from '../../../layouts/dashboard';

// ----------------------------------------------------------------------

CustomerEditPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function CustomerEditPage() {
  const { query } = useRouter();
  const dispatch = useDispatch();

  const { customer, isLoading } = useSelector((state) => state.customer);

  const { id } = query;

  useEffect(() => {
    if (id) {
      dispatch(getCustomer(Number(id)));
    }
  }, [dispatch, id]);

  const handleSubmit = async (data: ICustomerFormValues) => {
    if (id) {
      const result: any = await dispatch(updateCustomer(Number(id), data));
      if (result && !result.success) {
        throw new Error(result.error);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Edit Customer | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Edit customer"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Customers', href: PATH_DASHBOARD.tiffin.customers },
            { name: customer?.name || '' },
          ]}
        />

        {isLoading ? (
          <LoadingScreen />
        ) : (
          <CustomerNewEditForm isEdit currentCustomer={customer || undefined} onSubmit={handleSubmit} />
        )}
      </Container>
    </>
  );
}
