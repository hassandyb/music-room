import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Edit2,
  Music2,
  ListMusic,
  Users,
  UserPlus,
  MapPin,
  Calendar,
  Mail,
  Crown,
  Sparkles,
  Headphones,
  Heart,
  Clock,
} from "lucide-react";
import { WavyLine } from "../events/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn, formateDate, ImageUrl, relativeDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PlaylistVisibility, ProfileData } from "@repo/types";
import { UpdateProfileDialog } from "./components/updateProfile";
import { FriendsPanel } from "./components/FriendsPanel";

export default async function ProfilePage() {
  const userData = await api.fetch<ProfileData>("/profile");
  const recentEvents = userData?.recentEvents ?? [];
  const recentPlaylists = userData?.recentPlaylists ?? [];

  return (
    <div className="w-full h-full flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My <span className="text-[#ff4d00]">Profile</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile and preferences
          </p>
        </div>

        <UpdateProfileDialog userData={userData!} />
      </header>

      {/* Identity + Account Info */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2 border border-white/5 bg-card overflow-hidden">
          {/* Cover Art */}
          <div className="relative h-32 bg-gradient-to-r from-[#ff4d00]/20 via-[#ff4d00]/5 to-transparent">
            <WavyLine height={128} />
          </div>

          <CardContent className="p-6 pt-0">
            {/* Profile Header */}
            <div className="flex flex-wrap items-end gap-4 -mt-8 z-60">
              <Avatar className="h-20 w-20 border-2 border-[#0d0d0d] ring-2 ring-[#ff4d00]/20">
                <AvatarImage
                  src={ImageUrl(userData?.profile.avatarUrl)}
                  alt={userData?.username}
                />
                <AvatarFallback className="bg-accent/20 uppercase text-[#ff4d00] text-lg font-semibold">
                  {userData?.username.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold capitalize">
                    {userData?.profile.firstName} {userData?.profile.lastName}
                  </h2>
                  <Badge className="bg-[#ff4d00]/10 text-[#ff4d00] border-[#ff4d00]/20">
                    <Crown className="mr-1 h-3 w-3" />
                    {userData?.profile.subscription}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>@{userData?.username}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formateDate(userData?.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4 rounded-lg bg-white/5 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#ff4d00]">{userData?.stats?.events ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Events
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#ff4d00]">{userData?.stats?.playlists ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Playlists
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#ff4d00]">{userData?.stats?.votes ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Votes Cast
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border border-white/5 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5" />
                Username
              </span>
              <span className="text-sm font-medium">
                @{userData?.username}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Email
              </span>
              <span className="text-sm font-medium">{userData?.email}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Member Since
              </span>
              <span className="text-sm font-medium">
                {formateDate(userData?.createdAt)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Crown className="h-3.5 w-3.5" />
                Subscription
              </span>
              <Badge className="bg-[#ff4d00]/10 text-[#ff4d00] border-[#ff4d00]/20">
                {userData?.profile.subscription} Plan
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Activity - Events, Playlists, Friends side by side */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Recent Events */}
        <Card className="border border-white/5 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEvents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No events yet — join or create one to see it here.
              </p>
            )}
            {recentEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                    <Music2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeDate(event.createdAt)}
                    </p>
                  </div>
                  {event.live && (
                    <Badge className="bg-[#ff4d00]/10 text-[#ff4d00] border-[#ff4d00]/20">
                      ● Live
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
            <Link href="/events">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                View All Events
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Playlists */}
        <Card className="border border-white/5 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recent Playlists
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPlaylists.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No playlists yet — join or create one to see it here.
              </p>
            )}
            {recentPlaylists.map((playlist) => (
              <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                    <ListMusic className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{playlist.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeDate(playlist.createdAt)}
                    </p>
                  </div>
                  {playlist.visibility === PlaylistVisibility.PRIVATE && (
                    <Badge className="bg-white/10 text-muted-foreground border-white/10">
                      Private
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
            <Link href="/playlist">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                View All Playlists
              </Button>
            </Link>
          </CardContent>
        </Card>

        <FriendsPanel />
      </section>
    </div>
  );
}
