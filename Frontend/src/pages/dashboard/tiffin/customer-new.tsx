import Head from 'next/head';
// @mui
import { Container } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch } from '../../../redux/store';
import { createCustomer } from '../../../redux/slices/customer';
// @types
import { ICustomerFormValues } from '../../../@types/tms';
// components
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
// sections
import CustomerNewEditForm from '../../../sections/@dashboard/tiffin/customer/CustomerNewEditForm';
import DashboardLayout from '../../../layouts/dashboard';

// ----------------------------------------------------------------------

CustomerNewPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function CustomerNewPage() {
  const dispatch = useDispatch();

  const handleSubmit = async (data: ICustomerFormValues) => {
    const result: any = await dispatch(createCustomer(data));
    if (result && !result.success) {
      throw new Error(result.error);
    }
  };

  return (
    <>
      <Head>
        <title>New Customer | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Create a new customer"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Customers', href: PATH_DASHBOARD.tiffin.customers },
            { name: 'New Customer' },
          ]}
        />

        <CustomerNewEditForm onSubmit={handleSubmit} />
      </Container>
    </>
  );
}
