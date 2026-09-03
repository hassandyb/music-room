"use client";
import * as React from "react";
import {
  CalendarRange,
  Library,
  ListMusic,
  User,
  Headphones,
  Sparkles,
  ArrowRight,
  Crown,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { NavUser } from "./nav-user";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGetCurrentUserQuery } from "@/services/authApi";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "@/lib/rtk/userSlice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Subscription } from "@repo/types";

const discover = [
  {
    name: "Events",
    url: "/events",
    icon: CalendarRange,
  },
  {
    name: "Playlist",
    url: "/playlist",
    icon: ListMusic,
  },
];

const userSpace = [
  {
    name: "Profile",
    url: "/profile",
    icon: User,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const authUser = useSelector((state: any) => state.user.user);
  const { data: currentUser, isLoading } = useGetCurrentUserQuery();

  React.useEffect(() => {
    if (currentUser && !authUser) {
      if (!currentUser.profile) {
        window.location.href = "/onboarding";
      }
      dispatch(setUser(currentUser));
    }
  }, [currentUser, authUser, dispatch]);

  const user = authUser || currentUser;
  const isPremium = user?.profile?.subscription === Subscription.PREMIUM;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-4">
          <div>
            <div className="text-base font-semibold tracking-tight">
              Music <span className="text-[#ff4d00]">Room</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Collaborative music platform
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col py-2">
        <div className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Discover
            </SidebarGroupLabel>
            <SidebarMenu className="mt-2">
              {discover.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-none px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-white/5 hover:text-foreground",
                          isActive &&
                          "bg-[#ff4d00]/10 text-[#ff4d00] hover:bg-[#ff4d00]/15",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isActive && "text-[#ff4d00]",
                          )}
                        />
                        <span className={cn(isActive && "font-medium")}>
                          {item.name}
                        </span>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-[#ff4d00]" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          <Separator className="mx-4 my-2 w-auto bg-white/5" />

          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              My Space
            </SidebarGroupLabel>
            <SidebarMenu className="mt-2">
              {userSpace.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-none px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-white/5 hover:text-foreground",
                          isActive &&
                          "bg-[#ff4d00]/10 text-[#ff4d00] hover:bg-[#ff4d00]/15",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isActive && "text-[#ff4d00]",
                          )}
                        />
                        <span className={cn(isActive && "font-medium")}>
                          {item.name}
                        </span>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-[#ff4d00]" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </div>
        {/* Premium Upgrade Card - Added here */}
        <div className="mt-4 px-3 ">
          {!isPremium ? (
            <Card className="relative overflow-hidden border border-[#ff4d00]/20 bg-gradient-to-br from-[#ff4d00]/10 via-[#ff4d00]/5 to-transparent p-4 shadow-lg shadow-[#ff4d00]/5 hover:shadow-[#ff4d00]/10 transition-all duration-300">
              {/* Background decorative elements */}
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#ff4d00]/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-[#ff4d00]/5 blur-2xl" />

              <div className="relative space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-[#ff4d00]" />
                      <h4 className="text-sm font-semibold text-foreground">
                        Go Premium
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unlock exclusive features
                    </p>
                  </div>
                  <Badge className="bg-[#ff4d00]/20 text-[#ff4d00] border-[#ff4d00]/30 text-[10px]">
                    Popular
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-[#ff4d00]" />
                    <span>Unlimited playlist creation</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Headphones className="h-3 w-3 text-[#ff4d00]" />
                    <span>High-quality audio streaming</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-[#ff4d00] hover:bg-[#e64400] text-white transition-colors duration-300 group"
                  size="sm"
                  onClick={() => router.push("/pricing")}
                >
                  <span>Upgrade Now</span>
                  <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </Card>
          ) : (
            // Premium User Card (already subscribed)
            <Card
              onClick={() => router.push("/pricing")}
              className="cursor-pointer border border-[#ff4d00]/20 bg-gradient-to-br from-[#ff4d00]/5 to-transparent p-4 hover:border-[#ff4d00]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff4d00]/20">
                  <Crown className="h-5 w-5 text-[#ff4d00]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Premium Member
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.profile?.subscription || "Premium"} Plan
                  </p>
                </div>
                <Badge className="bg-[#ff4d00]/20 text-[#ff4d00] border-[#ff4d00]/30">
                  Active
                </Badge>
              </div>
            </Card>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5">
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
