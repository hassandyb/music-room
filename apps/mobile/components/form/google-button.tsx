import { OAuthButton } from '@/components/form/oauth-button';

export function GoogleButton({ connected }: { connected?: boolean }) {
  return <OAuthButton provider="google" label="Continue with Google" connected={connected} />;
}
