// next
import Head from 'next/head';
// layouts
import CompactLayout from '../../layouts/compact';
// sections
import AuthResetPasswordForm from '../../sections/auth/AuthResetPasswordForm';

// ----------------------------------------------------------------------

ResetPasswordPage.getLayout = (page: React.ReactElement) => <CompactLayout>{page}</CompactLayout>;

// ----------------------------------------------------------------------

export default function ResetPasswordPage() {
  return (
    <>
      <Head>
        <title> Reset Password | TMS</title>
      </Head>

      <AuthResetPasswordForm />
    </>
  );
}
