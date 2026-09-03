"use client";


import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Mail,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Key,
    Clock,
} from "lucide-react";
import { cn, errorMessage } from "@/lib/utils";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ForgotPasswordData, ForgotPasswordSchema } from "@/validations/auth/forget-password";
import { useForgotPasswordMutation } from "@/services/authApi";
import { toast } from "sonner";
import React from "react";

export default function ForgotPassword() {

    const [forgetPassword, { error, isSuccess }] = useForgotPasswordMutation()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(ForgotPasswordSchema)
    })

    React.useEffect(() => {
        if (error) {
            toast.error("Failed to Reset Password", {
                description: errorMessage(error),
            });
        }
    }, [error])

    const onSubmit = async (data: ForgotPasswordData) => {
        try {
            forgetPassword(data)
        } catch (error: unknown) {
            toast.error("Failed to Reset Password", {
                description: errorMessage(error),
            });
        }
    }

    return (
        <div className="w-full flex items-center justify-center">
            <Card className="w-full bg-transparent">
                <CardHeader className="space-y-4 text-center">
                    {/* Icon */}
                    <div className="mx-auto relative">
                        <div className="absolute inset-0 animate-pulse rounded-full bg-[#ff4d00]/10" />
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4d00]/20 to-[#ff4d00]/5 border border-[#ff4d00]/20">
                            <Key className="h-10 w-10 text-[#ff4d00]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            Forgot Password?
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            No worries! Enter your email and we'll send you a reset link
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="p-10">
                    {isSuccess ? (
                        <div className="space-y-6">
                            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-green-500">
                                            Reset Link Sent!
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            We've sent a password reset link to your email
                                        </p>
                                    </div>
                                </div>
                            </div>



                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                                <Clock className="h-3 w-3" />
                                <span>Reset link expires in 1 hour for security</span>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        {...register("email")}
                                        className={cn(
                                            "pl-10 !bg-white/5 !border-white/10 !text-white placeholder:!text-white/40 focus:!border-[#ff4d00] focus:!ring-[#ff4d00]/20",
                                        )}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.email?.message}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#ff4d00] hover:bg-[#e64400] text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending Reset Link...
                                    </>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 border-t border-white/5 pt-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground hover:text-foreground hover:bg-white/5"
                        asChild
                    >
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}