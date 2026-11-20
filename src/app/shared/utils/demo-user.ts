export const DEMO_GOOGLE_EMAIL = 'google.demo.user@gmail.com';

export const isDemoGoogleUser = (email: string | null | undefined): boolean =>
  email?.toLowerCase() === DEMO_GOOGLE_EMAIL;
