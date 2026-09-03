"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useGetCurrentUserQuery } from "@/services/authApi";
import { setUser } from "@/lib/rtk/userSlice";

function OAuthCallbackFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Finishing sign-in...</p>
    </div>
  );
}

// Landing spot after GET /auth/google|facebook/callback on the backend — by
// the time we're here the access_token cookie is already set (or, on
// failure, never was), so this page's only job is to read the result and
// route onward, same as login-form.tsx's onSubmit does for password login.
function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const error = searchParams.get("error");

  const { data: user, isSuccess, isError } = useGetCurrentUserQuery(undefined, { skip: !!error });

  useEffect(() => {
    if (error) {
      toast.error("Sign-in failed", { description: decodeURIComponent(error) });
      router.replace("/login");
      return;
    }

    if (isSuccess && user) {
      dispatch(setUser(user));
      router.replace(user.profile ? "/events" : "/onboarding");
      return;
    }

    if (isError) {
      toast.error("Sign-in failed", { description: "Could not complete sign-in." });
      router.replace("/login");
    }
  }, [error, isSuccess, isError, user, dispatch, router]);

  return <OAuthCallbackFallback />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<OAuthCallbackFallback />}>
      <OAuthCallback />
    </Suspense>
  );
}
