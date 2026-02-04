export const routeNames = {
  Root: '/',
  Health: {
    Name: 'health',
  },
  Auth: {
    Name: 'auth',
    Login: 'login',
    Register: 'register',
    VerifyEmail: 'verify-email',
    ResendOtp: 'resend-otp',
    ForgotPassword: 'forgot-password',
    ResetPassword: 'reset-password',
    ChangePassword: 'change-password',
    GoogleOAuth: 'google',
    GoogleOAuthCallback: 'google/callback',
  },
};

export function buildPath(
  ...segments: Array<string | number | undefined | null>
): string {
  return segments
    .filter(Boolean)
    .map((s) => String(s).replace(/^\/+|\/+$/g, ''))
    .join('/');
}
