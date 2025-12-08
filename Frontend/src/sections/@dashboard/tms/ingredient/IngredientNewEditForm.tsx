import { useMemo, useState, useEffect } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Card,
  Grid,
  Stack,
  Step,
  Stepper,
  StepLabel,
  Typography,
  Button,
  Divider,
  MenuItem,
  IconButton,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// @types
import { ITMSIngredient, IIngredientFormValues, IVendor, PackageSize } from '../../../../@types/tms';
// components
import { useSnackbar } from '../../../../components/snackbar';
import FormProvider, {
  RHFTextField,
  RHFSelect,
  RHFCheckbox,
} from '../../../../components/hook-form';
import Iconify from '../../../../components/iconify';

// ----------------------------------------------------------------------

const PACKAGE_SIZES: { value: PackageSize; label: string }[] = [
  { value: 'tsp', label: 'Teaspoon (tsp)' },
  { value: 'tbsp', label: 'Tablespoon (tbsp)' },
  { value: 'c', label: 'Cup (c)' },
  { value: 'pt', label: 'Pint (pt)' },
  { value: 'qt', label: 'Quart (qt)' },
  { value: 'gal', label: 'Gallon (gal)' },
  { value: 'fl_oz', label: 'Fluid Ounce (fl oz)' },
  { value: 'oz', label: 'Ounce (oz)' },
  { value: 'lb', label: 'Pound (lb)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
];

const STEPS = ['Ingredient Information', 'Vendor Details', 'Review'];

type Props = {
  isEdit?: boolean;
  currentIngredient?: ITMSIngredient;
  onSubmit: (data: IIngredientFormValues) => Promise<void>;
};

export default function IngredientNewEditForm({ isEdit = false, currentIngredient, onSubmit }: Props) {
  const { push } = useRouter();

  const { enqueueSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);

  const NewIngredientSchema = Yup.object().shape({
    name: Yup.string().required('Ingredient name is required').max(255, 'Name is too long'),
    description: Yup.string(),
    vendors: Yup.array()
      .of(
        Yup.object().shape({
          vendor_name: Yup.string().required('Vendor name is required'),
          price: Yup.number()
            .required('Price is required')
            .positive('Price must be positive')
            .typeError('Price must be a number'),
          weight: Yup.number()
            .required('Weight is required')
            .positive('Weight must be positive')
            .typeError('Weight must be a number'),
          package_size: Yup.string().required('Package size is required'),
          is_default: Yup.boolean(),
        })
      )
      .min(1, 'At least one vendor is required')
      .max(3, 'Maximum 3 vendors allowed'),
  });

  const defaultValues = useMemo<IIngredientFormValues>(
    () => ({
      name: currentIngredient?.name || '',
      description: currentIngredient?.description || '',
      vendors: currentIngredient?.vendors || [
        {
          vendor_name: '',
          price: 0,
          weight: 0,
          package_size: 'kg' as PackageSize,
          is_default: true,
        },
      ],
    }),
    [currentIngredient]
  );

  const methods = useForm<IIngredientFormValues>({
    resolver: yupResolver(NewIngredientSchema),
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
    if (isEdit && currentIngredient) {
      reset(defaultValues);
    }
    if (!isEdit) {
      reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, currentIngredient]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleAddVendor = () => {
    const currentVendors = values.vendors || [];
    if (currentVendors.length < 3) {
      setValue('vendors', [
        ...currentVendors,
        {
          vendor_name: '',
          price: 0,
          weight: 0,
          package_size: 'kg' as PackageSize,
          is_default: false,
        },
      ]);
    }
  };

  const handleRemoveVendor = (index: number) => {
    const currentVendors = [...(values.vendors || [])];
    currentVendors.splice(index, 1);
    setValue('vendors', currentVendors);
  };

  const handleSetDefault = (index: number) => {
    const updatedVendors = (values.vendors || []).map((vendor, i) => ({
      ...vendor,
      is_default: i === index,
    }));
    setValue('vendors', updatedVendors);
  };

  const onSubmitForm = async (data: IIngredientFormValues) => {
    try {
      await onSubmit(data);
      enqueueSnackbar(!isEdit ? 'Create success!' : 'Update success!');
      push(PATH_DASHBOARD.ingredient.list);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'Something went wrong!', { variant: 'error' });
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Ingredient Information
            </Typography>

            <Stack spacing={3}>
              <RHFTextField name="name" label="Ingredient Name" />
              <RHFTextField name="description" label="Description" multiline rows={4} />
            </Stack>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Typography variant="h6">Vendor Details</Typography>
              {(values.vendors?.length || 0) < 3 && (
                <Button
                  size="small"
                  startIcon={<Iconify icon="eva:plus-fill" />}
                  onClick={handleAddVendor}
                >
                  Add Vendor
                </Button>
              )}
            </Stack>

            <Stack spacing={3}>
              {values.vendors?.map((vendor, index) => (
                <Card key={index} sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">Vendor #{index + 1}</Typography>
                    <Stack direction="row" spacing={1}>
                      {!vendor.is_default && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSetDefault(index)}
                        >
                          Set as Default
                        </Button>
                      )}
                      {vendor.is_default && (
                        <Typography variant="caption" color="primary">
                          Default Vendor
                        </Typography>
                      )}
                      {values.vendors!.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveVendor(index)}
                        >
                          <Iconify icon="eva:trash-2-outline" />
                        </IconButton>
                      )}
                    </Stack>
                  </Stack>

                  <Stack spacing={2}>
                    <RHFTextField name={`vendors[${index}].vendor_name`} label="Vendor Name" />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <RHFTextField
                          name={`vendors[${index}].price`}
                          label="Price ($)"
                          type="number"
                          InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <RHFTextField
                          name={`vendors[${index}].weight`}
                          label="Weight/Quantity"
                          type="number"
                          InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <RHFSelect name={`vendors[${index}].package_size`} label="Unit">
                          {PACKAGE_SIZES.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </RHFSelect>
                      </Grid>
                    </Grid>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Review Product
            </Typography>

            <Stack spacing={3}>
              <Card sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Ingredient Name
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {values.name}
                </Typography>
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {values.description || 'No description'}
                </Typography>
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Vendors ({values.vendors?.length})
                </Typography>

                <Stack spacing={2} divider={<Divider />}>
                  {values.vendors?.map((vendor, index) => (
                    <Box key={index}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{vendor.vendor_name}</Typography>
                        {vendor.is_default && (
                          <Typography variant="caption" color="primary">
                            Default
                          </Typography>
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        ${vendor.price} / {vendor.weight} {vendor.package_size}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Stack>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmitForm)}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <Stepper activeStep={activeStep} sx={{ pt: 3, px: 3 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {renderStepContent(activeStep)}

            <Divider />

            <Box sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button
                  color="inherit"
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                >
                  Back
                </Button>

                <Box sx={{ flexGrow: 1 }} />

                {activeStep < STEPS.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                  >
                    Next
                  </Button>
                ) : (
                  <LoadingButton
                    type="submit"
                    variant="contained"
                    loading={isSubmitting}
                  >
                    {!isEdit ? 'Create Product' : 'Save Changes'}
                  </LoadingButton>
                )}
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
