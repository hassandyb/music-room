"use client"

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Camera,
  Crown,
  GripVertical,
  Lock,
  LogOut,
  Music,
  Pause,
  Play,
  Plus,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/rtk/hooks";
import { ImageUrl, cn, errorMessage, formatDuration } from "@/lib/utils";
import {
  hydratePlaylist,
  resetPlaylistDetail,
  conflictCleared,
} from "@/lib/rtk/playlistSlice";
import {
  connectPlaylistSocket,
  disconnectPlaylistSocket,
  joinPlaylistRoom,
  leavePlaylistRoom,
} from "@/lib/rtk/playlistSocketMiddleware";
import {
  useDeletePlaylistMutation,
  useGetMembersQuery,
  useJoinPlaylistMutation,
  useKickMemberMutation,
  useLeavePlaylistMutation,
  useRemoveTrackFromPlaylistMutation,
  useReorderPlaylistTrackMutation,
  useUpdateLicenseMutation,
  useUpdatePlaylistMutation,
  useUploadCoverMutation,
} from "@/services/playlistApi";
import { PlaylistEditPolicy, PlaylistPreview, PlaylistTrackItem, PlaylistVisibility } from "@repo/types";
import { toast } from "sonner";
import InvitePlaylistDialog from "./invitePlaylist";
import { AddTrackToPlaylist } from "./addTrackToPlaylist";

function SortableTrackRow({
  item,
  index,
  total,
  canEdit,
  isPlaying,
  onPlayPause,
  onMove,
  onRemove,
}: {
  item: PlaylistTrackItem;
  index: number;
  total: number;
  canEdit: boolean;
  isPlaying: boolean;
  onPlayPause: (trackId: string) => void;
  onMove: (trackId: string, newPosition: number) => void;
  onRemove: (trackId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.trackId,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl border bg-card border-white/5 hover:border-white/10 hover:bg-accent/5 transition-all duration-200",
        isDragging && "opacity-50 z-10",
      )}
    >
      {canEdit && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onPlayPause(item.trackId)}
        className={cn("h-8 w-8 shrink-0 text-foreground", !isPlaying && "text-[#ff4d00]")}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      {item.track?.imageUrl ? (
        <img src={item.track.imageUrl} className="w-10 h-10 rounded-md object-cover" />
      ) : (
        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
          <Music className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.track?.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.track?.artist}</p>
      </div>
      <span className="text-xs text-muted-foreground font-mono">
        {formatDuration(item.track?.duration ?? 0)}
      </span>
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            disabled={index === 0}
            onClick={() => onMove(item.trackId, item.position - 1)}
            className="h-7 w-7"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={index === total - 1}
            onClick={() => onMove(item.trackId, item.position + 1)}
            className="h-7 w-7"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(item.trackId)}
            className="h-7 w-7 text-red-400 hover:text-red-300"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}

export default function PlaylistDetails({
  playlist,
  playlistId,
}: {
  playlist: PlaylistPreview;
  playlistId: string;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.user);
  const { data, isConnected, isJoined, membersDirty, conflict, deleted } = useAppSelector(
    (state) => state.playlistDetail,
  );

  const { data: members, refetch: refetchMembers } = useGetMembersQuery(playlistId);

  const [joinPlaylist] = useJoinPlaylistMutation();
  const [leavePlaylist] = useLeavePlaylistMutation();
  const [deletePlaylist] = useDeletePlaylistMutation();
  const [updateLicense] = useUpdateLicenseMutation();
  const [updatePlaylist] = useUpdatePlaylistMutation();
  const [removeTrack] = useRemoveTrackFromPlaylistMutation();
  const [reorderTrack] = useReorderPlaylistTrackMutation();
  const [kickMember] = useKickMemberMutation();
  const [uploadCover, { isLoading: isUploadingCover }] = useUploadCoverMutation();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  // Track removal (local or from another collaborator) only ever updates
  // data.tracks via the TRACK_REMOVED socket reducer - it never touches
  // playingTrackId, so without this the audio element keeps playing a
  // track that's no longer in the list.
  React.useEffect(() => {
    if (!playingTrackId) return;
    const stillInPlaylist = data?.tracks.some((t) => t.trackId === playingTrackId);
    if (!stillInPlaylist) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
      setIsPlayingAll(false);
    }
  }, [data?.tracks, playingTrackId]);

  React.useEffect(() => {
    dispatch(hydratePlaylist(playlist));
  }, [dispatch, playlist]);

  React.useEffect(() => {
    dispatch(connectPlaylistSocket());
    return () => {
      dispatch(leavePlaylistRoom(playlistId));
      dispatch(disconnectPlaylistSocket());
      dispatch(resetPlaylistDetail());
    };
  }, [dispatch, playlistId]);

  React.useEffect(() => {
    if (isConnected && !isJoined) {
      dispatch(joinPlaylistRoom(playlistId));
    }
  }, [isConnected, isJoined, dispatch, playlistId]);

  React.useEffect(() => {
    if (membersDirty > 0) refetchMembers();
  }, [membersDirty, refetchMembers]);

  React.useEffect(() => {
    // A 409 only means our own mutation was rejected - it doesn't guarantee
    // the winning mutation's broadcast has already reached us (the two race
    // independently). Per the module spec (§4.3) a stale client must
    // actively resync rather than assume the stream already caught it up,
    // so re-join the room for a fresh, authoritative INITIAL_STATE.
    if (conflict) {
      toast.error("This playlist changed elsewhere", {
        description: "Your action is stale - refreshing to the latest state.",
      });
      dispatch(joinPlaylistRoom(playlistId));
      dispatch(conflictCleared());
    }
  }, [conflict, dispatch, playlistId]);

  React.useEffect(() => {
    if (deleted) {
      toast.error("This playlist was deleted by its owner");
      router.push("/playlist");
    }
  }, [deleted, router]);

  // dnd-kit's sensor hooks must run unconditionally on every render - keep
  // them above the `!data` early return so hook call order never changes.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!data) return null;

  const handleJoin = async () => {
    try {
      await joinPlaylist(playlistId).unwrap();
      // The join mutation is a plain REST call — it doesn't touch the
      // socket-driven playlistDetail slice, so isMember/canEdit would stay
      // stale until something else re-synced. Re-join the room for a fresh,
      // authoritative INITIAL_STATE (same resync pattern used for conflicts).
      dispatch(joinPlaylistRoom(playlistId));
      refetchMembers();
    } catch (err) {
      toast.error("Failed to join playlist", { description: errorMessage(err) });
    }
  };

  const handleLeave = async () => {
    try {
      await leavePlaylist(playlistId).unwrap();
      router.push("/playlist");
    } catch (err) {
      toast.error("Failed to leave playlist", { description: errorMessage(err) });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${data.name}"? This cannot be undone.`)) return;
    try {
      await deletePlaylist(playlistId).unwrap();
      router.push("/playlist");
    } catch (err) {
      toast.error("Failed to delete playlist", { description: errorMessage(err) });
    }
  };

  const handleVisibilityToggle = async (checked: boolean) => {
    try {
      await updatePlaylist({
        id: playlistId,
        name: data.name,
        description: data.description ?? undefined,
        visibility: checked ? PlaylistVisibility.PRIVATE : PlaylistVisibility.PUBLIC,
        currentVersion: data.version,
      }).unwrap();
    } catch (err) {
      toast.error("Failed to update visibility", { description: errorMessage(err) });
    }
  };

  const handleEditPolicyChange = async (editPolicy: PlaylistEditPolicy) => {
    try {
      await updateLicense({ id: playlistId, editPolicy, isEnabled: data.isEnabled ?? true }).unwrap();
    } catch (err) {
      toast.error("Failed to update license", { description: errorMessage(err) });
    }
  };

  const handleEditLockToggle = async (isEnabled: boolean) => {
    try {
      await updateLicense({
        id: playlistId,
        editPolicy: data.editPolicy ?? PlaylistEditPolicy.EVERYONE,
        isEnabled,
      }).unwrap();
    } catch (err) {
      toast.error("Failed to update license", { description: errorMessage(err) });
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await removeTrack({ id: playlistId, trackId, currentVersion: data.version }).unwrap();
    } catch (err) {
      toast.error("Failed to remove track", { description: errorMessage(err) });
    }
  };

  const handleMove = async (trackId: string, newPosition: number) => {
    try {
      await reorderTrack({ id: playlistId, trackId, newPosition, currentVersion: data.version }).unwrap();
    } catch (err) {
      toast.error("Failed to reorder track", { description: errorMessage(err) });
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      await uploadCover({ id: playlistId, file: formData }).unwrap();
      toast.success("Cover updated");
    } catch (err) {
      toast.error("Failed to update cover", { description: errorMessage(err) });
    }
  };

  const handleKick = async (userId: string) => {
    try {
      await kickMember({ id: playlistId, userId }).unwrap();
    } catch (err) {
      toast.error("Failed to remove member", { description: errorMessage(err) });
    }
  };

  // The playlist stays editable while a track plays - playback is local
  // client-side audio against the shared track-streaming endpoint, it
  // doesn't lock or otherwise interact with concurrent edits from others.
  const tracks = [...data.tracks].sort((a, b) => a.position - b.position);
  const existingTrackIds = tracks.map((t) => t.trackId);

  const playTrackAt = (index: number) => {
    const audio = audioRef.current;
    const track = tracks[index];
    if (!audio || !track) {
      setPlayingTrackId(null);
      setIsPlayingAll(false);
      return;
    }

    audio.src = `${process.env.NEXT_PUBLIC_API_URL}/api/track/stream/${track.trackId}`;
    audio.play().catch(() => {
      toast.error("Couldn't play this track");
      setPlayingTrackId(null);
      setIsPlayingAll(false);
    });
    setPlayingTrackId(track.trackId);
  };

  const handlePlayPause = (trackId: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingTrackId === trackId) {
      audio.pause();
      setPlayingTrackId(null);
      setIsPlayingAll(false);
      return;
    }

    setIsPlayingAll(false);
    playTrackAt(tracks.findIndex((t) => t.trackId === trackId));
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    setIsPlayingAll(true);
    playTrackAt(0);
  };

  const handleTrackEnded = () => {
    if (isPlayingAll) {
      playTrackAt(tracks.findIndex((t) => t.trackId === playingTrackId) + 1);
    } else {
      setPlayingTrackId(null);
    }
  };

  // dnd-kit reports the drag purely by id - the actual persisted order comes
  // back through the PLAYLIST_SYNC broadcast (same as the up/down arrows),
  // so this just translates the drop target into a 1-indexed target position.
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newIndex = tracks.findIndex((t) => t.trackId === over.id);
    if (newIndex === -1) return;

    handleMove(active.id as string, newIndex + 1);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 px-4 py-6">
      <audio
        ref={audioRef}
        onEnded={handleTrackEnded}
        onError={() => {
          setPlayingTrackId(null);
          setIsPlayingAll(false);
        }}
        className="hidden"
      />
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/playlist"
            className="flex text-muted-foreground items-center gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Playlists</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                {data.coverUrl ? (
                  <img src={ImageUrl(data.coverUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Music className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {data.isOwner && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    disabled={isUploadingCover}
                    className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#ff4d00] hover:bg-[#e64400] border-2 border-background p-0"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <Camera className="h-2.5 w-2.5" />
                  </Button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                </>
              )}
            </div>
            <h1 className="text-lg font-semibold">{data.name}</h1>
            <Badge variant="secondary" className="bg-muted/50">
              {data.visibility === PlaylistVisibility.PRIVATE ? (
                <>
                  <Lock className="mr-1 h-3 w-3" />
                  Private
                </>
              ) : (
                "Public"
              )}
            </Badge>
            {data.isOwner && (
              <Badge className="bg-[#ff4d00]/20 text-[#ff4d00] border-[#ff4d00]/30">
                <Crown className="mr-1 h-3 w-3" />
                Owner
              </Badge>
            )}
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-muted-foreground/40",
              )}
              title={isConnected ? "Live" : "Connecting…"}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!data.isMember && data.isCollaborative && (
            <Button onClick={handleJoin} className="bg-[#ff4d00] hover:bg-[#ff4d00]/90 text-white gap-2">
              Join Playlist
            </Button>
          )}
          {!data.isMember && !data.isCollaborative && (
            <span className="text-xs text-muted-foreground">
              This playlist's owner is on the free tier - it can't have other members
            </span>
          )}

          {data.isMember && data.canEdit && (
            <AddTrackToPlaylist
              playlistId={playlistId}
              currentVersion={data.version}
              existingTrackIds={existingTrackIds}
            />
          )}

          {data.isOwner && data.isCollaborative && <InvitePlaylistDialog playlistId={playlistId} />}
          {data.isOwner && !data.isCollaborative && (
            <Button variant="outline" disabled className="text-muted-foreground gap-2" title="Upgrade to a paid plan to invite collaborators">
              <Plus className="w-4 h-4" />
              Invite (upgrade required)
            </Button>
          )}

          {data.isMember && !data.isOwner && (
            <Button variant="outline" onClick={handleLeave} className="text-foreground gap-2">
              <LogOut className="w-4 h-4" />
              Leave
            </Button>
          )}

          {data.isOwner && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="text-foreground">
                  <Settings className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-card border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Private playlist</Label>
                    <p className="text-xs text-muted-foreground">Only invited users can view/join</p>
                  </div>
                  <Switch
                    checked={data.visibility === PlaylistVisibility.PRIVATE}
                    onCheckedChange={handleVisibilityToggle}
                    className="data-[state=checked]:bg-[#ff4d00]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Who can edit</Label>
                  <Select
                    value={data.editPolicy ?? PlaylistEditPolicy.EVERYONE}
                    onValueChange={(v: PlaylistEditPolicy) => handleEditPolicyChange(v)}
                  >
                    <SelectTrigger className="bg-background w-full border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value={PlaylistEditPolicy.EVERYONE}>Everyone (members)</SelectItem>
                      <SelectItem value={PlaylistEditPolicy.INVITED_ONLY}>Owner only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Editing enabled</Label>
                    <p className="text-xs text-muted-foreground">Kill switch - off means owner-only</p>
                  </div>
                  <Switch
                    checked={data.isEnabled ?? true}
                    onCheckedChange={handleEditLockToggle}
                    className="data-[state=checked]:bg-[#ff4d00]"
                  />
                </div>

                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="w-full gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete playlist
                </Button>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </header>

      {/* Main Content */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Tracks</h2>
              <Badge variant="outline" className="text-xs">
                {tracks.length} tracks
              </Badge>
            </div>
            {tracks.length > 0 && (
              <Button
                size="sm"
                onClick={isPlayingAll ? () => handlePlayPause(playingTrackId!) : handlePlayAll}
                className="bg-[#ff4d00] hover:bg-[#e64400] text-white gap-2"
              >
                {isPlayingAll ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlayingAll ? "Pause" : "Play All"}
              </Button>
            )}
          </div>

          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
              <div className="rounded-full bg-[#ff4d00]/10 p-4 mb-4">
                <Music className="h-8 w-8 text-[#ff4d00]/60" />
              </div>
              <h3 className="text-base font-medium text-foreground/90 mb-2">No tracks yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {data.canEdit ? "Add the first track to get started." : "Nothing here yet."}
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={existingTrackIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {tracks.map((item, index) => (
                    <SortableTrackRow
                      key={item.trackId}
                      item={item}
                      index={index}
                      total={tracks.length}
                      canEdit={data.canEdit}
                      isPlaying={playingTrackId === item.trackId}
                      onPlayPause={handlePlayPause}
                      onMove={handleMove}
                      onRemove={handleRemoveTrack}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Collaborators */}
          <div className="rounded-2xl border border-white/5 bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Collaborators
              </span>
              <span className="ml-auto text-sm font-semibold text-accent">{members?.length ?? 0}</span>
            </div>
            <ul className="space-y-1">
              {members?.map((member) => {
                const isOnline = data.onlineUsernames.includes(member.username);
                const isYou = member.id === user?.id;
                const isMemberOwner = member.id === data.ownerId;
                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="relative shrink-0">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={ImageUrl(member.profile?.avatarUrl || "")} />
                          <AvatarFallback className="bg-accent/20 text-accent text-xs">
                            {member.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span
                            title="Online"
                            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card"
                          />
                        )}
                      </span>
                      <span className="text-sm flex items-center gap-1.5 min-w-0">
                        <span className="truncate">@{member.username}</span>
                        {isYou && <span className="text-muted-foreground shrink-0">(you)</span>}
                        {isMemberOwner && <Crown className="h-3 w-3 text-[#ff4d00] shrink-0" />}
                      </span>
                    </div>
                    {data.isOwner && !isMemberOwner && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleKick(member.id)}
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Playlist Info */}
          <div className="rounded-2xl border border-white/5 bg-card p-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Playlist Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium text-foreground/90">@{data.ownerUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tracks</span>
                <span className="font-medium text-foreground/90">{tracks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Edit access</span>
                <span className="font-medium text-foreground/90">
                  {data.editPolicy === PlaylistEditPolicy.INVITED_ONLY || data.isEnabled === false
                    ? "Owner only"
                    : "All members"}
                </span>
              </div>
              {data.description && (
                <p className="text-muted-foreground pt-2 border-t border-white/5">{data.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
