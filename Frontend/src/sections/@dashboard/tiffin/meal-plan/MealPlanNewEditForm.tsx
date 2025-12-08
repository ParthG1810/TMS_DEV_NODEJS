import { useMemo, useEffect } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Card, Grid, Stack, Typography } from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// @types
import { IMealPlan, IMealPlanFormValues, MealFrequency, MealDays } from '../../../../@types/tms';
// components
import { useSnackbar } from '../../../../components/snackbar';
import FormProvider, { RHFTextField, RHFSelect } from '../../../../components/hook-form';

// ----------------------------------------------------------------------

const FREQUENCY_OPTIONS: { value: MealFrequency; label: string }[] = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

const DAYS_OPTIONS: { value: MealDays; label: string }[] = [
  { value: 'Mon-Fri', label: 'Monday to Friday' },
  { value: 'Mon-Sat', label: 'Monday to Saturday' },
  { value: 'Single', label: 'Single Day' },
];

type Props = {
  isEdit?: boolean;
  currentMealPlan?: IMealPlan;
  onSubmit: (data: IMealPlanFormValues) => Promise<void>;
};

export default function MealPlanNewEditForm({ isEdit = false, currentMealPlan, onSubmit }: Props) {
  const { push } = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const MealPlanSchema = Yup.object().shape({
    meal_name: Yup.string().required('Meal name is required').max(255, 'Name is too long'),
    description: Yup.string(),
    frequency: Yup.string().required('Frequency is required').oneOf(['Daily', 'Weekly', 'Monthly']),
    days: Yup.string().required('Days is required').oneOf(['Mon-Fri', 'Mon-Sat', 'Single']),
    price: Yup.number()
      .required('Price is required')
      .positive('Price must be positive')
      .typeError('Price must be a number'),
  });

  const defaultValues = useMemo<IMealPlanFormValues>(
    () => ({
      meal_name: currentMealPlan?.meal_name || '',
      description: currentMealPlan?.description || '',
      frequency: currentMealPlan?.frequency || 'Weekly',
      days: currentMealPlan?.days || 'Mon-Fri',
      price: currentMealPlan?.price || 0,
    }),
    [currentMealPlan]
  );

  const methods = useForm<IMealPlanFormValues>({
    resolver: yupResolver(MealPlanSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  useEffect(() => {
    if (isEdit && currentMealPlan) {
      reset(defaultValues);
    }
    if (!isEdit) {
      reset(defaultValues);
    }
  }, [isEdit, currentMealPlan, reset, defaultValues]);

  // Business Rule: When frequency is Daily, set days to Single
  useEffect(() => {
    if (values.frequency === 'Daily') {
      setValue('days', 'Single');
    }
  }, [values.frequency, setValue]);

  const handleFormSubmit = async (data: IMealPlanFormValues) => {
    try {
      await onSubmit(data);
      enqueueSnackbar(!isEdit ? 'Create success!' : 'Update success!');
      push(PATH_DASHBOARD.tiffin.mealPlans);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || error?.error || 'Failed to save meal plan';
      enqueueSnackbar(errorMessage, { variant: 'error' });
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
              <RHFTextField name="meal_name" label="Meal Name *" />

              <RHFTextField name="price" label="Price (CAD $) *" type="number" />

              <RHFSelect native name="frequency" label="Frequency *">
                <option value="" />
                {FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </RHFSelect>

              <RHFSelect
                native
                name="days"
                label="Days *"
                disabled={values.frequency === 'Daily'}
              >
                <option value="" />
                {DAYS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </RHFSelect>

              <Box sx={{ gridColumn: '1 / -1' }}>
                <RHFTextField name="description" label="Description / Contains" multiline rows={4} />
              </Box>
            </Box>

            {values.frequency === 'Daily' && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Note: Days automatically set to "Single" for Daily frequency
              </Typography>
            )}

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {!isEdit ? 'Create Meal Plan' : 'Save Changes'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
