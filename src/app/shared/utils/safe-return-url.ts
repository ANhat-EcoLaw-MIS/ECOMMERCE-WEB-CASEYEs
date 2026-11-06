const DUMMY_ORIGIN = 'https://return-url.invalid';
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const URL_SCHEME = /^[a-z][a-z\d+.-]*:/iu;

export function sanitizeReturnUrl(raw: string | null | undefined, fallback = '/'): string {
  if (
    !raw ||
    raw.length > 2048 ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('\\') ||
    URL_SCHEME.test(raw) ||
    CONTROL_CHARACTERS.test(raw)
  ) {
    return fallback;
  }

  try {
    const url = new URL(raw, DUMMY_ORIGIN);
    if (url.origin !== DUMMY_ORIGIN) return fallback;

    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    if (
      pathname.startsWith('/account/onboarding') ||
      pathname === '/auth' ||
      pathname === '/auth/login' ||
      pathname.startsWith('/auth/login/') ||
      pathname === '/auth/register' ||
      pathname.startsWith('/auth/register/')
    ) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
