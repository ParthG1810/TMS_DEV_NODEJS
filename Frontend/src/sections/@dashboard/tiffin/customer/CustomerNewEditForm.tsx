import { useMemo, useEffect } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Card, Grid, Stack } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// @types
import { ICustomer, ICustomerFormValues } from '../../../../@types/tms';
// components
import { useSnackbar } from '../../../../components/snackbar';
import FormProvider, { RHFTextField } from '../../../../components/hook-form';

// ----------------------------------------------------------------------

type Props = {
  isEdit?: boolean;
  currentCustomer?: ICustomer;
  onSubmit: (data: ICustomerFormValues) => Promise<void>;
};

export default function CustomerNewEditForm({ isEdit = false, currentCustomer, onSubmit }: Props) {
  const { push } = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const CustomerSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(255, 'Name is too long'),
    phone: Yup.string().max(50, 'Phone is too long'),
    address: Yup.string().required('Address is required'),
  });

  const defaultValues = useMemo<ICustomerFormValues>(
    () => ({
      name: currentCustomer?.name || '',
      phone: currentCustomer?.phone || '',
      address: currentCustomer?.address || '',
    }),
    [currentCustomer]
  );

  const methods = useForm<ICustomerFormValues>({
    resolver: yupResolver(CustomerSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (isEdit && currentCustomer) {
      reset(defaultValues);
    }
    if (!isEdit) {
      reset(defaultValues);
    }
  }, [isEdit, currentCustomer, reset, defaultValues]);

  const handleFormSubmit = async (data: ICustomerFormValues) => {
    try {
      await onSubmit(data);
      enqueueSnackbar(!isEdit ? 'Create success!' : 'Update success!');
      push(PATH_DASHBOARD.tiffin.customers);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(handleFormSubmit)}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
              }}
            >
              <RHFTextField name="name" label="Customer Name *" />

              <RHFTextField name="phone" label="Phone Number" />

              <Box sx={{ gridColumn: '1 / -1' }}>
                <RHFTextField name="address" label="Address *" multiline rows={4} />
              </Box>
            </Box>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {!isEdit ? 'Create Customer' : 'Save Changes'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
