import { OAuthButton } from '@/components/form/oauth-button';

export function FacebookButton({ connected }: { connected?: boolean }) {
  return <OAuthButton provider="facebook" label="Continue with Facebook" connected={connected} />;
}
