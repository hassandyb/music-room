"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePlaylist } from "./components/createPlaylist";
import {
  useAcceptInvitationMutation,
  useGetMyInvitationsQuery,
  useGetMyPlaylistsQuery,
  useGetPublicPlaylistsQuery,
  useRejectInvitationMutation,
} from "@/services/playlistApi";
import { connectPlaylistSocket, disconnectPlaylistSocket } from "@/lib/rtk/playlistSocketMiddleware";
import { useAppDispatch } from "@/lib/rtk/hooks";
import { Playlist, PlaylistVisibility } from "@repo/types";
import { AudioLines, ListMusic, Lock, Mail, Music2, User, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageUrl, errorMessage } from "@/lib/utils";

function EmptyPlaylistsState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-white/5 bg-card p-12 text-center transition-all hover:border-[#ff4d00]/20">
      <div className="rounded-full bg-[#ff4d00]/10 p-4 mb-4">
        <ListMusic className="h-8 w-8 text-[#ff4d00]/60" />
      </div>
      <h3 className="text-lg font-medium text-foreground/90 mb-2">No playlists yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Create a playlist and start collaborating in real-time with your friends.
      </p>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link href={`/playlist/${playlist.id}`} className="group block">
      <Card className="overflow-hidden bg-card p-0 transition-colors hover:border-[#ff4d00]/40">
        <CardHeader className="relative h-32 p-0 overflow-hidden">
          {playlist.coverUrl ? (
            <img src={ImageUrl(playlist.coverUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute flex justify-center border-b border-white/10 items-center inset-0 bg-gradient-to-br from-[#ff4d00]/10 via-[#ff4d00]/5 to-transparent">
              <AudioLines size={28} />
            </div>
          )}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
            {playlist.visibility === PlaylistVisibility.PRIVATE && (
              <Badge className="bg-background/70 text-foreground/80 border-white/10 backdrop-blur-sm">
                <Lock className="mr-1 h-3 w-3" />
                Private
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-sm font-medium text-foreground/90 mb-1 truncate group-hover:text-[#ff4d00] transition-colors">
            {playlist.name}
          </CardTitle>
          <CardDescription className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 truncate">
              <User size={12} />
              {playlist.owner?.username}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Music2 className="h-3 w-3" />
                {playlist.trackCount} tracks
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {playlist.memberCount}
              </span>
            </div>
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}

function InvitationsBar() {
  const { data: invitations } = useGetMyInvitationsQuery();
  const [accept] = useAcceptInvitationMutation();
  const [reject] = useRejectInvitationMutation();

  if (!invitations || invitations.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#ff4d00]/20 bg-[#ff4d00]/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
        <Mail className="h-4 w-4 text-[#ff4d00]" />
        Pending playlist invitations
      </div>
      <div className="space-y-2">
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2">
            <p className="text-sm text-foreground/80 truncate">
              <span className="font-medium">{inv.ownerUsername}</span> invited you to{" "}
              <span className="font-medium">{inv.playlistName}</span>
            </p>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-[#ff4d00] hover:bg-[#e64400] text-white h-7 px-3"
                onClick={async () => {
                  try {
                    await accept(inv.id).unwrap();
                    toast.success("Invitation accepted");
                  } catch (err) {
                    toast.error("Failed to accept invitation", { description: errorMessage(err) });
                  }
                }}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-muted-foreground h-7 px-3"
                onClick={async () => {
                  try {
                    await reject(inv.id).unwrap();
                  } catch (err) {
                    toast.error("Failed to reject invitation", { description: errorMessage(err) });
                  }
                }}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlaylistPage() {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<"public" | "mine">("public");
  const { data: publicPlaylists, isLoading: isLoadingPublic } = useGetPublicPlaylistsQuery();
  const { data: myPlaylists, isLoading: isLoadingMine } = useGetMyPlaylistsQuery();

  useEffect(() => {
    dispatch(connectPlaylistSocket());
    return () => {
      dispatch(disconnectPlaylistSocket());
    };
  }, [dispatch]);

  const playlists = tab === "public" ? publicPlaylists : myPlaylists;
  const isLoading = tab === "public" ? isLoadingPublic : isLoadingMine;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 capitalize text-xl font-medium">
          playlist
          <span className="text-accent">Editor</span>
        </div>

        <div className="flex items-center gap-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "public" | "mine")}>
            <TabsList>
              <TabsTrigger value="public">Public</TabsTrigger>
              <TabsTrigger value="mine">Mine</TabsTrigger>
            </TabsList>
          </Tabs>
          <CreatePlaylist />
        </div>
      </header>

      <InvitationsBar />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <p className="col-span-full text-sm text-muted-foreground">Loading playlists…</p>
        ) : !playlists || playlists.length === 0 ? (
          <EmptyPlaylistsState />
        ) : (
          playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)
        )}
      </section>
    </div>
  );
}
