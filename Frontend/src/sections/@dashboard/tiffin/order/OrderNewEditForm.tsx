import { useMemo, useEffect } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Card, Grid, Stack, Typography, Chip, TextField } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../../redux/store';
import { getCustomers } from '../../../../redux/slices/customer';
import { getMealPlans } from '../../../../redux/slices/mealPlan';
// @types
import { ICustomerOrder, ICustomerOrderFormValues, DayName } from '../../../../@types/tms';
// components
import { useSnackbar } from '../../../../components/snackbar';
import FormProvider, {
  RHFTextField,
  RHFAutocomplete,
  RHFCheckbox,
} from '../../../../components/hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import { Controller } from 'react-hook-form';

// ----------------------------------------------------------------------

const DAY_OPTIONS: DayName[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

type Props = {
  isEdit?: boolean;
  currentOrder?: ICustomerOrder;
  onSubmit: (data: ICustomerOrderFormValues) => Promise<void>;
};

export default function OrderNewEditForm({ isEdit = false, currentOrder, onSubmit }: Props) {
  const { push } = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const { customers } = useSelector((state) => state.customer);
  const { mealPlans } = useSelector((state) => state.mealPlan);

  // Load customers and meal plans on mount
  useEffect(() => {
    dispatch(getCustomers());
    dispatch(getMealPlans());
  }, [dispatch]);

  const OrderSchema = Yup.object().shape({
    customer_id: Yup.number().required('Customer is required'),
    meal_plan_id: Yup.number().required('Meal plan is required'),
    quantity: Yup.number().required('Quantity is required').min(1, 'Minimum quantity is 1'),
    selected_days: Yup.array().of(Yup.string()),
    price: Yup.number().required('Price is required').positive('Price must be positive'),
    start_date: Yup.date().required('Start date is required').typeError('Invalid date'),
    end_date: Yup.date()
      .required('End date is required')
      .typeError('Invalid date')
      .min(Yup.ref('start_date'), 'End date must be after start date'),
  });

  const defaultValues = useMemo<ICustomerOrderFormValues>(
    () => ({
      customer_id: currentOrder?.customer_id || 0,
      meal_plan_id: currentOrder?.meal_plan_id || 0,
      quantity: currentOrder?.quantity || 1,
      selected_days: currentOrder?.selected_days || [],
      price: currentOrder?.price || 0,
      start_date: currentOrder?.start_date ? new Date(currentOrder.start_date) : new Date(),
      end_date: currentOrder?.end_date ? new Date(currentOrder.end_date) : new Date(),
    }),
    [currentOrder]
  );

  const methods = useForm<ICustomerOrderFormValues>({
    resolver: yupResolver(OrderSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  useEffect(() => {
    if (isEdit && currentOrder) {
      reset(defaultValues);
    }
    if (!isEdit) {
      reset(defaultValues);
    }
  }, [isEdit, currentOrder, reset, defaultValues]);

  // Business Logic: When meal plan changes, update price and selected_days
  useEffect(() => {
    if (!mealPlans || !mealPlans.length) return;

    const selectedPlan = mealPlans.find((p) => p.id === values.meal_plan_id);
    if (selectedPlan && !isEdit) {
      setValue('price', selectedPlan.price);

      // Pre-populate selected_days based on meal plan's days
      if (selectedPlan.days === 'Mon-Fri') {
        setValue('selected_days', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      } else if (selectedPlan.days === 'Mon-Sat') {
        setValue('selected_days', [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ]);
      } else {
        setValue('selected_days', []);
      }
    }
  }, [values.meal_plan_id, mealPlans, setValue, isEdit]);

  const handleFormSubmit = async (data: ICustomerOrderFormValues) => {
    try {
      await onSubmit(data);
      enqueueSnackbar(!isEdit ? 'Create success!' : 'Update success!');
      push(PATH_DASHBOARD.tiffin.orders);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || error?.error || 'Failed to save order';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const selectedCustomer = customers && customers.find((c) => c.id === values.customer_id);
  const selectedMealPlan = mealPlans && mealPlans.find((m) => m.id === values.meal_plan_id);

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
              <RHFAutocomplete
                name="customer_id"
                label="Customer *"
                options={customers?.map((c) => c.id) || []}
                getOptionLabel={(option: any) => {
                  if (!customers) return '';
                  const customer = customers.find((c) => c.id === option);
                  return customer ? customer.name : '';
                }}
                isOptionEqualToValue={(option: any, value: any) => option === value}
                renderOption={(props, option: any) => {
                  if (!customers) return null;
                  const customer = customers.find((c) => c.id === option);
                  return (
                    <li {...props} key={`customer-${option}`}>
                      <Box>
                        <Typography variant="body2">{customer?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer?.phone || 'No phone'}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                onChange={(event, value) => {
                  setValue('customer_id', value || 0);
                }}
                value={values.customer_id || null}
              />

              <RHFAutocomplete
                name="meal_plan_id"
                label="Meal Plan *"
                options={mealPlans?.map((p) => p.id) || []}
                getOptionLabel={(option: any) => {
                  if (!mealPlans) return '';
                  const plan = mealPlans.find((p) => p.id === option);
                  return plan ? plan.meal_name : '';
                }}
                isOptionEqualToValue={(option: any, value: any) => option === value}
                renderOption={(props, option: any) => {
                  if (!mealPlans) return null;
                  const plan = mealPlans.find((p) => p.id === option);
                  return (
                    <li {...props} key={`meal-plan-${option}`}>
                      <Box>
                        <Typography variant="body2">{plan?.meal_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plan?.frequency} | {plan?.days} | ₹{plan?.price}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                onChange={(event, value) => {
                  setValue('meal_plan_id', value || 0);
                }}
                value={values.meal_plan_id || null}
              />

              <RHFTextField name="quantity" label="Quantity *" type="number" />

              <RHFTextField name="price" label="Price (₹) *" type="number" />

              <Controller
                name="start_date"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    label="Start Date *"
                    value={field.value}
                    onChange={(newValue) => {
                      field.onChange(newValue);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth error={!!error} helperText={error?.message} />
                    )}
                  />
                )}
              />

              <Controller
                name="end_date"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    label="End Date *"
                    value={field.value}
                    onChange={(newValue) => {
                      field.onChange(newValue);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth error={!!error} helperText={error?.message} />
                    )}
                  />
                )}
              />

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Selected Days
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {DAY_OPTIONS.map((day) => (
                    <Controller
                      key={day}
                      name="selected_days"
                      control={control}
                      render={({ field }) => (
                        <Chip
                          label={day}
                          clickable
                          color={field.value?.includes(day) ? 'primary' : 'default'}
                          onClick={() => {
                            const currentDays = field.value || [];
                            if (currentDays.includes(day)) {
                              field.onChange(currentDays.filter((d) => d !== day));
                            } else {
                              field.onChange([...currentDays, day]);
                            }
                          }}
                        />
                      )}
                    />
                  ))}
                </Box>
                {selectedMealPlan && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Default days based on meal plan: {selectedMealPlan.days}
                  </Typography>
                )}
              </Box>
            </Box>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {!isEdit ? 'Create Order' : 'Save Changes'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
