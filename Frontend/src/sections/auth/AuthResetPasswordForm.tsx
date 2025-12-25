import { useState } from 'react';
import * as Yup from 'yup';
// next
import NextLink from 'next/link';
// form
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
// @mui
import { LoadingButton } from '@mui/lab';
import { Alert, Link, Stack, Typography } from '@mui/material';
// routes
import { PATH_AUTH } from '../../routes/paths';
// components
import FormProvider, { RHFTextField } from '../../components/hook-form';
import Iconify from '../../components/iconify';
// utils
import axios from '../../utils/axios';
// assets
import { SentIcon, PasswordIcon } from '../../assets/icons';

// ----------------------------------------------------------------------

type FormValuesProps = {
  email: string;
};

export default function AuthResetPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ResetPasswordSchema = Yup.object().shape({
    email: Yup.string().required('Email is required').email('Email must be a valid email address'),
  });

  const methods = useForm<FormValuesProps>({
    resolver: yupResolver(ResetPasswordSchema),
    defaultValues: { email: '' },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data: FormValuesProps) => {
    try {
      setError(null);
      await axios.post('/api/account/request-password-reset', {
        email: data.email,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (submitted) {
    return (
      <Stack spacing={3} alignItems="center">
        <SentIcon sx={{ height: 96 }} />

        <Typography variant="h3" paragraph>
          Request sent successfully!
        </Typography>

        <Typography sx={{ color: 'text.secondary', mb: 5, textAlign: 'center' }}>
          Your password reset request has been submitted. An administrator will contact you shortly
          to help reset your password.
        </Typography>

        <Link
          component={NextLink}
          href={PATH_AUTH.login}
          color="inherit"
          variant="subtitle2"
          sx={{
            alignItems: 'center',
            display: 'inline-flex',
          }}
        >
          <Iconify icon="eva:chevron-left-fill" width={16} />
          Return to sign in
        </Link>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} alignItems="center">
      <PasswordIcon sx={{ height: 96 }} />

      <Typography variant="h3" paragraph>
        Forgot your password?
      </Typography>

      <Typography sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}>
        Please enter the email address associated with your account and an administrator will help
        you reset your password.
      </Typography>

      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3} sx={{ width: '100%', minWidth: 300 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <RHFTextField name="email" label="Email address" />

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting}
          >
            Send Request
          </LoadingButton>
        </Stack>
      </FormProvider>

      <Link
        component={NextLink}
        href={PATH_AUTH.login}
        color="inherit"
        variant="subtitle2"
        sx={{
          mt: 2,
          alignItems: 'center',
          display: 'inline-flex',
        }}
      >
        <Iconify icon="eva:chevron-left-fill" width={16} />
        Return to sign in
      </Link>
    </Stack>
  );
}
