/**
 * All system copy in one place (DESIGN-SYSTEM §7). Generic by rule: personal
 * words (names, messages, letters) come from the database after sign-in.
 */
export const copy = {
  appName: 'Our Little Universe',
  locked: {
    title: 'This little universe is private.',
    message: 'Scan your key to come in.',
  },
  key: {
    opening: 'Opening our little universe…',
    invalid: "This key doesn't open the door anymore. Ask for a new one.",
    missing: 'This link is missing its key. Try scanning the card again.',
    unavailable: "Couldn't reach our universe just now. Check your connection and scan again.",
  },
  ownerSignIn: {
    title: 'Welcome back',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    failed: "That email and password didn't match.",
    forgot: 'Forgot password?',
    resetSent: 'If that email belongs to the owner, a reset link is on its way.',
    resetNeedsEmail: 'Enter your email first, then tap "Forgot password?".',
  },
  config: {
    missing: 'The app is not configured yet (missing Supabase settings).',
  },
  errors: {
    generic: 'Something got lost in space. Try again?',
    retry: 'Try again',
    offline: "You're offline. Some things may not load.",
  },
  signOut: {
    label: 'Sign out',
    partnerConfirm: "You'll need your key card to come back in.",
    ownerConfirm: 'Sign out of Our Little Universe?',
    cancel: 'Stay',
  },
} as const
