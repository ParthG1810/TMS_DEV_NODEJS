import * as Yup from 'yup';
import { useCallback, useEffect, useMemo } from 'react';
// next
import { useRouter } from 'next/router';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import { LoadingButton } from '@mui/lab';
import { Box, Card, Grid, Stack, Typography } from '@mui/material';
// utils
import { fData } from '../../../utils/formatNumber';
import axios from '../../../utils/axios';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// components
import { CustomFile } from '../../../components/upload';
import { useSnackbar } from '../../../components/snackbar';
import FormProvider, {
  RHFSelect,
  RHFTextField,
  RHFUploadAvatar,
} from '../../../components/hook-form';

// ----------------------------------------------------------------------

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'tester', label: 'Tester' },
  { value: 'user', label: 'User' },
];

interface FormValuesProps {
  name: string;
  email: string;
  avatarUrl: CustomFile | string | null;
  role: string;
  password?: string;
}

type UserData = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
};

type Props = {
  isEdit?: boolean;
  currentUser?: UserData;
};

export default function UserNewEditForm({ isEdit = false, currentUser }: Props) {
  const { push } = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { user: authUser } = useAuthContext();

  const isAdmin = authUser?.role === 'admin';
  const isManager = authUser?.role === 'manager';
  const canAssignRoles = isAdmin || isManager;

  // Filter role options based on current user's role
  const availableRoles = isAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter(option => option.value !== 'admin');

  const NewUserSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    email: Yup.string().required('Email is required').email('Email must be a valid email address'),
    avatarUrl: Yup.mixed().nullable(true),
    role: Yup.string().required('Role is required'),
    password: isEdit ? Yup.string() : Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
  });

  const defaultValues = useMemo(
    () => ({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      avatarUrl: currentUser?.avatarUrl || null,
      role: currentUser?.role || 'user',
      password: '',
    }),
    [currentUser]
  );

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(NewUserSchema),
    defaultValues,
  });

  const {
    reset,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (isEdit && currentUser) {
      reset(defaultValues);
    }
    if (!isEdit) {
      reset(defaultValues);
    }
  }, [isEdit, currentUser, reset, defaultValues]);

  const onSubmit = async (data: FormValuesProps) => {
    try {
      // Handle avatarUrl - if it's a File object, we need to upload it first
      let photoURL = data.avatarUrl;
      if (photoURL && typeof photoURL !== 'string') {
        photoURL = (photoURL as CustomFile).preview || null;
      }

      if (isEdit && currentUser) {
        // Update existing user
        await axios.put(`/api/users/${currentUser.id}`, {
          displayName: data.name,
          email: data.email,
          photoURL: photoURL || null,
          role: isAdmin ? data.role : currentUser.role,
        });
        enqueueSnackbar('User updated successfully!');
      } else {
        // Create new user
        await axios.post('/api/users', {
          displayName: data.name,
          email: data.email,
          password: data.password,
          photoURL: photoURL || null,
          role: data.role,
        });
        enqueueSnackbar('User created successfully!');
      }
      push(PATH_DASHBOARD.user.list);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error?.message || 'Operation failed', { variant: 'error' });
    }
  };

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];

      const newFile = Object.assign(file, {
        preview: URL.createObjectURL(file),
      });

      if (file) {
        setValue('avatarUrl', newFile, { shouldValidate: true });
      }
    },
    [setValue]
  );

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ pt: 10, pb: 5, px: 3 }}>
            <Box sx={{ mb: 5 }}>
              <RHFUploadAvatar
                name="avatarUrl"
                maxSize={3145728}
                onDrop={handleDrop}
                helperText={
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 2,
                      mx: 'auto',
                      display: 'block',
                      textAlign: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    Allowed *.jpeg, *.jpg, *.png, *.gif
                    <br /> max size of {fData(3145728)}
                  </Typography>
                }
              />
            </Box>
          </Card>
        </Grid>

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
              <RHFTextField name="name" label="Full Name" />
              <RHFTextField name="email" label="Email Address" />

              {!isEdit && (
                <RHFTextField name="password" label="Password" type="password" />
              )}

              {canAssignRoles && (
                <RHFSelect native name="role" label="Role">
                  {availableRoles.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </RHFSelect>
              )}
            </Box>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {!isEdit ? 'Create User' : 'Save Changes'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
