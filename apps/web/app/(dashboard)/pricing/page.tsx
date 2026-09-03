"use client"

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  Crown,
  Headphones,
  ListMusic,
  Loader2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Subscription } from "@repo/types";
import { useAppDispatch, useAppSelector } from "@/lib/rtk/hooks";
import { updateUser } from "@/lib/rtk/userSlice";
import { useUpdateSubscriptionMutation } from "@/services/authApi";
import { errorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";

const freeFeatures = [
  "1 playlist, always solo",
  "Vote on public event tracks",
  "Join public playlists & events",
  "Standard support",
];

const premiumFeatures = [
  { icon: ListMusic, text: "Unlimited playlists" },
  { icon: Users, text: "Real-time collaboration - invite friends to co-edit" },
  { icon: Headphones, text: "High-quality audio streaming" },
  { icon: Zap, text: "Priority support" },
  { icon: Sparkles, text: "Early access to new features" },
];

export default function PricingPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const [updateSubscription, { isLoading }] = useUpdateSubscriptionMutation();

  const isPremium = user?.profile?.subscription === Subscription.PREMIUM;
  const [pendingTarget, setPendingTarget] = useState<Subscription | null>(null);

  const handleToggle = async (checked: boolean) => {
    const target = checked ? Subscription.PREMIUM : Subscription.FREE;
    setPendingTarget(target);
    try {
      await updateSubscription(target).unwrap();
      if (user) {
        dispatch(updateUser({ profile: { ...user.profile, subscription: target } }));
      }
      toast.success(
        target === Subscription.PREMIUM ? "Welcome to Premium!" : "Switched back to Free",
      );
    } catch (err) {
      toast.error("Failed to update subscription", { description: errorMessage(err) });
    } finally {
      setPendingTarget(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 px-4 py-10">
      <header className="text-center space-y-3">
        <Badge className="bg-[#ff4d00]/10 text-[#ff4d00] border-[#ff4d00]/20 mx-auto">
          <Crown className="mr-1 h-3 w-3" />
          Membership
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose your <span className="text-[#ff4d00]">plan</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Collaborate on playlists in real time with friends, without limits.
          Switch anytime - no commitment.
        </p>
      </header>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={cn("text-sm font-medium", !isPremium ? "text-foreground" : "text-muted-foreground")}>
          Free
        </span>
        <Switch
          checked={isPremium}
          disabled={isLoading}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-[#ff4d00]"
        />
        <span className={cn("text-sm font-medium flex items-center gap-1.5", isPremium ? "text-[#ff4d00]" : "text-muted-foreground")}>
          Premium
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </span>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free plan */}
        <Card
          className={cn(
            "border bg-card transition-all",
            !isPremium ? "border-white/20 shadow-lg" : "border-white/5 opacity-70",
          )}
        >
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Free</h2>
              {!isPremium && (
                <Badge variant="secondary" className="bg-white/10">
                  Current plan
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold">
              $0<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {freeFeatures.map((feature) => (
              <div key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{feature}</span>
              </div>
            ))}
            <Button
              variant="outline"
              disabled={!isPremium || isLoading}
              onClick={() => handleToggle(false)}
              className="w-full mt-4 disabled:opacity-40"
            >
              {pendingTarget === Subscription.FREE ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : !isPremium ? (
                "Current plan"
              ) : (
                "Downgrade to Free"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Premium plan */}
        <Card
          className={cn(
            "relative overflow-hidden border bg-gradient-to-br from-[#ff4d00]/10 via-[#ff4d00]/5 to-transparent transition-all",
            isPremium ? "border-[#ff4d00]/40 shadow-lg shadow-[#ff4d00]/10" : "border-[#ff4d00]/20",
          )}
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#ff4d00]/10 blur-2xl" />
          <CardHeader className="space-y-1 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="h-4 w-4 text-[#ff4d00]" />
                Premium
              </h2>
              {isPremium ? (
                <Badge className="bg-[#ff4d00]/20 text-[#ff4d00] border-[#ff4d00]/30">
                  Current plan
                </Badge>
              ) : (
                <Badge className="bg-[#ff4d00]/20 text-[#ff4d00] border-[#ff4d00]/30 text-[10px]">
                  Popular
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold">
              $0<span className="text-sm font-normal text-muted-foreground"> - demo mode</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3 relative">
            {premiumFeatures.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2 text-sm">
                <Icon className="h-4 w-4 text-[#ff4d00] shrink-0 mt-0.5" />
                <span>{text}</span>
              </div>
            ))}
            <Button
              disabled={isPremium || isLoading}
              onClick={() => handleToggle(true)}
              className="w-full mt-4 bg-[#ff4d00] hover:bg-[#e64400] text-white disabled:opacity-60"
            >
              {pendingTarget === Subscription.PREMIUM ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPremium ? (
                "Current plan"
              ) : (
                "Upgrade to Premium"
              )}
            </Button>
          </CardContent>
        </Card>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Demo project - this switch changes your account tier instantly, no payment involved.
      </p>
    </div>
  );
}
