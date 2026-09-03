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
import { useRegisterMutation } from "@/services/authApi";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterData, RegisterSchema } from "@/validations/auth/register";
import { toast } from "sonner";

const authInputClass =
  "!bg-white/5 !border-white/10 !text-white placeholder:!text-white/40 focus-visible:!border-[#ff4d00]/50 focus-visible:!ring-[#ff4d00]/20";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [register, { isError, isSuccess, error }] = useRegisterMutation();

  const {
    register: registerForm,
    handleSubmit,
    formState: { errors, isSubmitting } } = useForm(
      { resolver: zodResolver(RegisterSchema) }
    )

  React.useEffect(() => {
    if (isSuccess) {
      window.location.href = "/login";
    }
    if (isError && error) {
      toast.error("Failed to register", {
        description: errorMessage(error),
      });
    }
  }, [isSuccess, isError, error]);

  const onSubmit = (data: RegisterData) => {
    try {
      register(data);
    } catch (error: unknown) {
      toast.error("Failed to register", {
        description: errorMessage(error),
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Fill in the form below to create your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            type="text"
            placeholder="john_doe"
            disabled={isSubmitting}
            className={authInputClass}
            {...registerForm("username")}
          />
          {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="me@example.com"
            disabled={isSubmitting}
            className={authInputClass}
            {...registerForm("email")}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="********"
            disabled={isSubmitting}
            className={authInputClass}
            {...registerForm("password")}
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            placeholder="********"
            disabled={isSubmitting}
            className={authInputClass}
            {...registerForm("confirmPassword")}
          />
          {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
        </Field>
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button
            variant="outline"
            type="button"
            onClick={() => (window.location.href = oauthStartUrl("google"))}
          >
            Sign up with Google
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => (window.location.href = oauthStartUrl("facebook"))}
          >
            Sign up with Facebook
          </Button>
          <FieldDescription className="px-6 text-center">
            Already have an account? <Link href="/login">Sign in</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
