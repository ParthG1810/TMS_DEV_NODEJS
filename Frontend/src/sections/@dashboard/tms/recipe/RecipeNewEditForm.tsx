import { useMemo, useEffect, useCallback, useState } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
// form
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Card,
  Grid,
  Stack,
  Button,
  Typography,
  MenuItem,
  IconButton,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Autocomplete,
  TextField,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../../redux/store';
import { getTMSIngredients } from '../../../../redux/slices/tmsIngredient';
// @types
import { ITMSRecipe, IRecipeFormValues, IRecipeIngredient } from '../../../../@types/tms';
// utils
import { fCurrency } from '../../../../utils/formatNumber';
// components
import { useSnackbar } from '../../../../components/snackbar';
import FormProvider, { RHFTextField, RHFUpload } from '../../../../components/hook-form';
import Iconify from '../../../../components/iconify';

// ----------------------------------------------------------------------

type Props = {
  isEdit?: boolean;
  currentRecipe?: ITMSRecipe;
  onSubmit: (data: IRecipeFormValues) => Promise<void>;
};

export default function RecipeNewEditForm({ isEdit = false, currentRecipe, onSubmit }: Props) {
  const { push } = useRouter();

  const dispatch = useDispatch();

  const { enqueueSnackbar } = useSnackbar();

  const { ingredients } = useSelector((state) => state.tmsIngredient);

  const [ingredientInput, setIngredientInput] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    dispatch(getTMSIngredients());
  }, [dispatch]);

  const NewRecipeSchema = Yup.object().shape({
    name: Yup.string().required('Recipe name is required').max(255, 'Name is too long'),
    description: Yup.string(),
    ingredients: Yup.array()
      .of(
        Yup.object().shape({
          ingredient_id: Yup.number().required('Product is required'),
          quantity: Yup.number()
            .required('Quantity is required')
            .positive('Quantity must be positive')
            .typeError('Quantity must be a number'),
        })
      )
      .min(1, 'At least one ingredient is required'),
    images: Yup.array(),
  });

  const defaultValues = useMemo<IRecipeFormValues>(
    () => ({
      name: currentRecipe?.name || '',
      description: currentRecipe?.description || '',
      ingredients: currentRecipe?.ingredients || [{ ingredient_id: 0, quantity: 0 }],
      images: currentRecipe?.images?.map((img) => img.image_url) || [],
    }),
    [currentRecipe]
  );

  const methods = useForm<IRecipeFormValues>({
    resolver: yupResolver(NewRecipeSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ingredients',
  });

  const values = watch();

  useEffect(() => {
    if (isEdit && currentRecipe) {
      reset(defaultValues);
    }
    if (!isEdit) {
      reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, currentRecipe]);

  const handleAddIngredient = () => {
    append({ ingredient_id: 0, quantity: 0 });
  };

  const handleRemoveIngredient = (index: number) => {
    remove(index);
  };

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      const files = values.images || [];

      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );

      setValue('images', [...files, ...newFiles], { shouldValidate: true });
    },
    [setValue, values.images]
  );

  const handleRemoveFile = (inputFile: File | string) => {
    const filtered = values.images && values.images?.filter((file) => file !== inputFile);
    setValue('images', filtered);
  };

  const handleRemoveAllFiles = () => {
    setValue('images', []);
  };

  const calculateTotalCost = () => {
    let total = 0;
    values.ingredients?.forEach((ingredient) => {
      const ingredientData = ingredients.find((ing) => ing.id === ingredient.ingredient_id);
      if (ingredientData) {
        const defaultVendor = ingredientData.vendors.find((v) => v.is_default);
        if (defaultVendor) {
          const unitPrice = defaultVendor.price / defaultVendor.weight;
          const cost = unitPrice * ingredient.quantity;
          total += cost;
        }
      }
    });
    return total;
  };

  const getIngredientCost = (ingredient: IRecipeIngredient) => {
    const ingredientData = ingredients.find((ing) => ing.id === ingredient.ingredient_id);
    if (ingredientData) {
      const defaultVendor = ingredientData.vendors.find((v) => v.is_default);
      if (defaultVendor) {
        const unitPrice = defaultVendor.price / defaultVendor.weight;
        return unitPrice * ingredient.quantity;
      }
    }
    return 0;
  };

  const onSubmitForm = async (data: IRecipeFormValues) => {
    try {
      await onSubmit(data);
      enqueueSnackbar(!isEdit ? 'Create success!' : 'Update success!');
      push(PATH_DASHBOARD.recipe.list);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'Something went wrong!', { variant: 'error' });
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmitForm)}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">Recipe Information</Typography>

              <RHFTextField name="name" label="Recipe Name" />

              <RHFTextField name="description" label="Description" multiline rows={4} />

              <Divider />

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">Ingredients</Typography>
                <Button
                  size="small"
                  startIcon={<Iconify icon="eva:plus-fill" />}
                  onClick={handleAddIngredient}
                >
                  Add Ingredient
                </Button>
              </Stack>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ingredient</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Unit Cost</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, index) => {
                    const ingredient = values.ingredients?.[index];
                    const ingredientData = ingredients.find((ing) => ing.id === ingredient?.ingredient_id);
                    const defaultVendor = ingredientData?.vendors.find((v) => v.is_default);

                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Autocomplete
                            fullWidth
                            options={ingredients}
                            getOptionLabel={(option) =>
                              typeof option === 'number'
                                ? ingredients.find((ing) => ing.id === option)?.name || ''
                                : option.name
                            }
                            value={ingredientData || null}
                            onChange={(event, newValue) => {
                              setValue(`ingredients.${index}.ingredient_id`, newValue?.id || 0);
                            }}
                            inputValue={ingredientInput[index] || ''}
                            onInputChange={(event, newInputValue) => {
                              setIngredientInput((prev) => ({
                                ...prev,
                                [index]: newInputValue,
                              }));
                            }}
                            renderInput={(params) => (
                              <TextField {...params} placeholder="Select ingredient" />
                            )}
                          />
                        </TableCell>

                        <TableCell align="center" sx={{ width: 150 }}>
                          <RHFTextField
                            name={`ingredients.${index}.quantity`}
                            placeholder="Qty"
                            type="number"
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                            size="small"
                          />
                        </TableCell>

                        <TableCell align="right" sx={{ width: 120 }}>
                          {defaultVendor ? (
                            <Stack>
                              <Typography variant="body2">
                                {fCurrency(defaultVendor.price / defaultVendor.weight)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                per {defaultVendor.package_size}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              N/A
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="right" sx={{ width: 100 }}>
                          <Typography variant="subtitle2">
                            {ingredient ? fCurrency(getIngredientCost(ingredient)) : '-'}
                          </Typography>
                        </TableCell>

                        <TableCell align="right" sx={{ width: 60 }}>
                          {fields.length > 1 && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveIngredient(index)}
                            >
                              <Iconify icon="eva:trash-2-outline" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Divider />

              <Typography variant="h6">Recipe Images</Typography>

              <RHFUpload
                multiple
                thumbnail
                name="images"
                maxSize={5242880}
                onDrop={handleDrop}
                onRemove={handleRemoveFile}
                onRemoveAll={handleRemoveAllFiles}
                onUpload={() => console.log('ON UPLOAD')}
              />
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Summary
              </Typography>

              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Ingredients
                  </Typography>
                  <Typography variant="subtitle2">
                    {values.ingredients?.length || 0}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Images
                  </Typography>
                  <Typography variant="subtitle2">{values.images?.length || 0}</Typography>
                </Stack>

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1">Total Cost</Typography>
                  <Typography variant="h6" color="primary">
                    {fCurrency(calculateTotalCost())}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              loading={isSubmitting}
              fullWidth
            >
              {!isEdit ? 'Create Recipe' : 'Save Changes'}
            </LoadingButton>

            <Button
              color="inherit"
              variant="outlined"
              size="large"
              onClick={() => push(PATH_DASHBOARD.recipe.list)}
              fullWidth
            >
              Cancel
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
