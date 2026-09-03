"use client";
import { cn, errorMessage, oauthStartUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Music } from "lucide-react";
import { useLoginMutation } from "@/services/authApi";
import React from "react";
import { setUser } from "@/lib/rtk/userSlice";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginData, LoginSchema } from "@/validations/auth/login";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const authInputClass =
  "!bg-white/5 !border-white/10 !text-white placeholder:!text-white/40 focus-visible:!border-[#ff4d00]/50 focus-visible:!ring-[#ff4d00]/20";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [login] = useLoginMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(LoginSchema)
  })

  const onSubmit = async (data: LoginData) => {
    try {
      const res = await login(data).unwrap()

      if (!res?.data) {
        throw Error("Failed to login");
      }

      if (!res?.data?.profile) {
        router.push("/onboarding");
        router.refresh();
        return;
      }
      dispatch(setUser(res.data));
      router.push("/events");
      router.refresh();
    } catch (err: unknown) {
      toast.error("Failed to login", {
        description: errorMessage(err),
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            disabled={isSubmitting}
            className={authInputClass}
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forget-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            disabled={isSubmitting}
            className={authInputClass}
            {...register("password")}
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </Field>
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button
            variant="outline"
            type="button"
            onClick={() => (window.location.href = oauthStartUrl("google"))}
          >
            Login with Google
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => (window.location.href = oauthStartUrl("facebook"))}
          >
            Login with Facebook
          </Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline underline-offset-4">
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
