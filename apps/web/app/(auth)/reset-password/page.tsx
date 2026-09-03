'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Eye,
    EyeOff,
    Loader2,
    CheckCircle2,
    ArrowLeft,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResetPasswordData, ResetPasswordSchema } from '@/validations/auth/reset-password';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useResetPasswordMutation } from '@/services/authApi';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [showPassword, setShowPassword] = useState(false);
    const [resetPassword, { isError, isSuccess }] = useResetPasswordMutation();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(ResetPasswordSchema)
    })



    const onSubmit = async (data: ResetPasswordData) => {
        if (!token) {
            toast.error("No token provided")
            return;
        }
        try {
            resetPassword({ token, ...data });
        } catch (error) {
        }
    }


    React.useEffect(() => {
        if (isSuccess) {
            toast.success("Password reset successfully");

            setTimeout(() => {
                router.push("/login");
            }, 4000)
        }
        if (isError) {
            toast.error("Failed to reset password");
        }
    }, [isSuccess, isError])




    return (
        <div className="h-full w-full flex items-center justify-center p-4">
            <Card className="w-full bg-transparent py-10">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto relative">
                        <div className="absolute inset-0 animate-pulse rounded-full bg-[#ff4d00]/10" />
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4d00]/20 to-[#ff4d00]/5 border border-[#ff4d00]/20">
                            <Lock className="h-10 w-10 text-[#ff4d00]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            Create New Password
                        </CardTitle>
                        <CardDescription>
                            Enter your new password below
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    {isSuccess ? (
                        <div className="space-y-6">
                            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-green-500">
                                            Password Reset Successfully!
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Your password has been updated. Redirecting to login...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input

                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter new password"
                                        className={cn(
                                            "pl-10 !bg-white/5 !border-white/10 !text-white placeholder:!text-white/40 focus:!border-[#ff4d00] focus:!ring-[#ff4d00]/20",
                                            errors.password && "!border-red-500/50 focus:!border-red-500"
                                        )}
                                        {...register("password")}
                                    />
                                    {errors.password && (
                                        <p className="text-red-500 text-sm">{errors.password?.message}</p>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                    Confirm Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Confirm new password"
                                        className={cn(
                                            "pl-10 !bg-white/5 !border-white/10 !text-white placeholder:!text-white/40 focus:!border-[#ff4d00] focus:!ring-[#ff4d00]/20",
                                            errors.confirmPassword && "!border-red-500/50 focus:!border-red-500"
                                        )}
                                        {...register("confirmPassword")}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-red-500 text-sm">{errors.confirmPassword?.message}</p>
                                    )}
                                </div>
                            </div>


                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#ff4d00] hover:bg-[#e64400] text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting Password...
                                    </>
                                ) : (
                                    "Reset Password"
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