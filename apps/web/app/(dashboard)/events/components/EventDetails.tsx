"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import {
    ArrowLeft,
    Music,
    Users,
    Triangle,
    SkipForward,
    SkipBack,
    Play,
    Plus,
    LogOut,
} from "lucide-react";
import Link from "next/link";
import { SuggestTrack } from "../components/suggest-track";
import { cn, formatDuration, formateDate, formatDateTime, ImageUrl } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/rtk/hooks";
import React from "react";
import { hydrateEvent, clearError } from "@/lib/rtk/eventSlice";
import { connectSocket, disconnectSocket, joinRoom, joinEvent, startEvent, vote, leaveRoom } from "@/lib/rtk/socketMiddleware";
import { Event, EventStatus, EventTrack, Licence, Track } from "@repo/types";
import InviteToEvent from "./inviteToEvent";
import { toast } from "sonner";


export function EmptyTracksState() {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 p-12 text-center transition-all hover:border-[#ff4d00]/30">
            <div className="rounded-full bg-[#ff4d00]/10 p-4 mb-4">
                <Music className="h-8 w-8 text-[#ff4d00]/60" />
            </div>
            <h3 className="text-base font-medium text-white/90 mb-2">
                Queue is empty
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Be the first to suggest a track and get the party started!
            </p>
        </div>
    );
}

export default function EventDetails({
    eventDetails,
    eventId
}: {
    eventDetails: any,
    eventId: string
}) {

    const { user } = useAppSelector((state) => state.user);
    const [timeToVote, setTimeToVote] = React.useState(0)

    const dispatch = useAppDispatch();
    const { data, isConnected, isJoined, error } = useAppSelector((state) => state.event);
    const audioRef = React.useRef<HTMLAudioElement>(null);

    React.useEffect(() => {
        dispatch(hydrateEvent(eventDetails));
    }, [dispatch, eventDetails]);

    React.useEffect(() => {
        dispatch(connectSocket());
        return () => {
            dispatch(leaveRoom(eventId));
            dispatch(disconnectSocket());
        };
    }, [dispatch, eventId]);

    React.useEffect(() => {
        if (isConnected && !isJoined) {
            dispatch(joinRoom(eventId));
        }
    }, [isConnected, isJoined, dispatch, eventId]);

    React.useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearError());
        }
    }, [error, dispatch]);

    React.useEffect(() => {
        if (data?.status === EventStatus.VOTING) {
            setTimeToVote(20000)
            const timer = setInterval(() => {
                setTimeToVote((prev) => Math.max(prev - 1000, 0));
            }, 1000);
            return () => clearInterval(timer);
        }
        // Only restart the countdown when a new voting round actually begins,
        // not on every track/vote update within the same round.
    }, [data?.status, data?.round])

    const handleJoinEvent = () => {
        dispatch(joinEvent(eventId));
    }

    const handleStartEvent = () => {
        dispatch(startEvent(eventId));
    }

    const calculateVotePercentage = (totalVotes: number, totalMembers: number) => {
        return Math.round((totalVotes * 100) / (totalMembers || 1))
    }

    const handleVote = (trackId: string) => {
        if (data?.licence !== Licence.GEOTIME) {
            dispatch(vote(eventId, trackId));
            return;
        }

        if (!navigator.geolocation) {
            toast.error('Your location is required to vote in this event, but geolocation is not available in this browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                dispatch(vote(eventId, trackId, {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }));
            },
            () => {
                toast.error('We need your location to vote in this event.');
            }
        );
    }


    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    // Browsers block audio.play() unless it's called from a direct user
    // gesture — the `autoPlay` attribute (and any programmatic play() that
    // isn't) can get silently rejected, most often the first time a track
    // starts after the page loaded without a click. When that happens we
    // surface a button so the listener can unlock playback themselves.
    const [audioBlocked, setAudioBlocked] = React.useState(false);

    React.useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        setAudioBlocked(false);

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);

            // Sync playback position to the server's currentTrackStartTime so
            // a listener joining mid-track lands at the same point as everyone
            // else, instead of starting the track over from 0.
            if (data?.currentTrackStartTime) {
                const startedAt = new Date(data.currentTrackStartTime).getTime();
                const offsetSeconds = (Date.now() - startedAt) / 1000;
                if (offsetSeconds > 0 && offsetSeconds < audio.duration) {
                    audio.currentTime = offsetSeconds;
                }
            }

            audio.play().catch(() => setAudioBlocked(true));
        };

        const handleEnded = () => {
            // Optional: handle track end
            console.log('Track ended');
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [data?.currentTrack, data?.currentTrackStartTime]);

    const handleUnlockAudio = () => {
        audioRef.current?.play()
            .then(() => setAudioBlocked(false))
            .catch(() => setAudioBlocked(true));
    };

    if (!data) return null;

    const { tracks, members } = data

    const isMember = members?.some((member) => member?.id === user?.id);

    const sortedTracks = [...(tracks || [])].sort((a, b) => {
        if (a.played !== b.played) return a.played ? -1 : 1;
        if (a.played && b.played) return (a.order ?? 0) - (b.order ?? 0);
        return (b?.votes?.length || 0) - (a?.votes?.length || 0)
            || (a?.track?.title || "").localeCompare(b?.track?.title || "");
    });

    // The leader highlight should track the current front-runner among
    // unplayed tracks, not literal list position — played tracks now sort
    // first, so index 0 no longer means "about to be picked".
    const topUnplayedTrackId = sortedTracks.find((t) => !t.played)?.trackId;

    const hasVotedThisRound = tracks?.some((t) =>
        t?.votes?.some((v) => v.userId === user?.id && v.round === data.round)
    );

    const totalVotes = tracks?.reduce((sum, t) => sum + (t?.votes?.length || 0), 0) || 0;


    const formatDuration = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    // console.log("details Page => ", data)

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 px-4 py-6">
            {/* Header */}
            <header className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <Link
                        href="/events"
                        className="flex text-muted-foreground items-center gap-2 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Events</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-semibold">{data?.title}</h1>
                        <Badge className="bg-accent hover:bg-accent/50 text-white border-0">
                            {data?.status}
                        </Badge>
                        {
                            data?.status === "VOTING" && (
                                <div className="flex items-center gap-2">
                                    <Progress className="w-40" value={timeToVote / 200} />
                                    <span className="text-sm text-muted-foreground font-mono">
                                        {timeToVote / 1000}s
                                    </span>
                                </div>
                            )
                        }
                        <Badge variant="secondary" className="bg-muted/50">
                            {data?.privacy === "PUBLIC" ? "Public" : "Private"}
                        </Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    {
                        !isMember ?
                            <Button onClick={handleJoinEvent} className="bg-[#ff4d00] hover:bg-[#ff4d00]/90 text-white gap-2">
                                <Plus />
                                Join Event</Button>
                            :
                            <>
                                {data?.createdBy?.id === user?.id && (
                                    <InviteToEvent eventId={data?.id.toString() || eventId} />
                                )}
                                <SuggestTrack eventId={data?.id.toString() || eventId} />
                            </>
                    }
                </div>
            </header>

            {/* Currently Playing */}
            {
                data.currentTrack && (
                    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-white/5 p-6 backdrop-blur-sm">
                        <div className="flex flex-wrap items-center gap-6">
                            {
                                (data.status === EventStatus.PLAYING && data.currentTrack && isMember) && (
                                    <audio key={data.currentTrack?.id} ref={audioRef} src={`${process.env.NEXT_PUBLIC_API_URL}/api/track/stream/${data.currentTrack?.id}`} />
                                )
                            }
                            {
                                data?.currentTrack?.imageUrl ? <img src={data?.currentTrack?.imageUrl} className="w-20 h-20 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/10" alt={data?.currentTrack?.title} /> :

                                    <div className="w-20 h-20 rounded-xl bg-accent flex items-center justify-center shadow-xl shadow-accent/20">
                                        <Music className="w-8 h-8 text-white" />
                                    </div>
                            }
                            <div className="flex-1 min-w-[200px]">
                                <p className="text-xl font-semibold text-white">{data?.currentTrack?.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {data?.currentTrack?.artist}
                                </p>
                                <div className="flex items-center gap-4 mt-3">
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {formatDuration(currentTime)}
                                    </span>
                                    <Progress value={(currentTime) / (duration) * 100} className="h-1.5 bg-white/10" />
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {formatDuration(duration)}
                                    </span>
                                </div>
                            </div>
                            {audioBlocked && isMember && (
                                <Button
                                    onClick={handleUnlockAudio}
                                    className="bg-[#ff4d00] hover:bg-[#e64400] text-white gap-2 shrink-0"
                                >
                                    <Play className="w-4 h-4" />
                                    Tap to hear live audio
                                </Button>
                            )}
                        </div>
                    </section>
                )
            }

            {/* Main Content */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Queue */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Queue · Vote to reorder
                        </h2>
                        <Badge variant="outline" className="text-xs">
                            {tracks?.length || 0} tracks
                        </Badge>
                    </div>
                    <ul className="space-y-2">
                        {tracks?.length == 0 ? <EmptyTracksState /> : sortedTracks.map((track: EventTrack, index: number) => {
                            const hasVotedForThisTrack = track?.votes?.some(
                                (v) => v.userId === user?.id && v.round === data.round
                            );
                            return (
                            <li
                                key={track?.track.id}
                                className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${track.trackId === topUnplayedTrackId
                                    ? "bg-accent/5 border-accent/30 hover:border-accent/50"
                                    : "bg-card border-white/5 hover:border-white/10 hover:bg-accent/5"
                                    }`}
                            >
                                <span className="text-sm font-mono text-muted-foreground w-8 text-center">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                {
                                    track?.track?.imageUrl ?
                                        <img src={track?.track?.imageUrl} className="w-10 h-10 text-muted-foreground border-none" /> :
                                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                            <Music className="w-5 h-5 text-muted-foreground" />
                                        </div>

                                }
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {
                                            track.track.title
                                        }
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {track.track.artist}
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {/* Voting Controls */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleVote(track.trackId)}
                                                disabled={data.status !== EventStatus.VOTING || hasVotedThisRound || track.played}
                                                data-voted={hasVotedForThisTrack}
                                                size="icon"
                                                variant="ghost"
                                                className={cn(
                                                    "h-8 w-8 rounded-full transition-all duration-200",
                                                    "hover:bg-[#ff4d00]/10 hover:scale-110",
                                                    "data-[voted=true]:bg-[#ff4d00]/20",
                                                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                                                    "focus-visible:ring-2 focus-visible:ring-[#ff4d00]/50"
                                                )}
                                            >
                                                <Triangle
                                                    className={cn(
                                                        "h-3.5 w-3.5 transition-all",
                                                        hasVotedForThisTrack
                                                            ? "fill-[#ff4d00] text-[#ff4d00]"
                                                            : "fill-none text-muted-foreground hover:text-[#ff4d00]"
                                                    )}
                                                />
                                            </Button>
                                            <span className="min-w-[2ch] text-sm font-mono font-medium text-foreground tabular-nums">
                                                {track?.votes?.length || 0}
                                            </span>
                                        </div>

                                        {/* Progress Bar with Label */}
                                        <div className="flex-1 flex items-center gap-3">
                                            <Progress
                                                value={calculateVotePercentage(track?.votes?.length || 0, members?.length || 1)}
                                                className="h-1.5 flex-1 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-[#ff4d00] [&>div]:to-[#ff6a33]"
                                            />
                                            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                                                {Math.round(calculateVotePercentage(track?.votes?.length || 0, members?.length || 1))}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Voter Avatars */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1.5">
                                                {track?.votes?.slice(0, 4).map((vote, index) => (
                                                    <div
                                                        key={vote.id}
                                                        className="relative transition-all hover:z-10 hover:scale-110"
                                                        style={{ zIndex: track.votes.length - index }}
                                                    >
                                                        <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-white/10">
                                                            <AvatarImage src={ImageUrl(vote?.user?.profile.avatarUrl)} />
                                                            <AvatarFallback className="bg-[#ff4d00]/20 text-[10px] font-medium text-[#ff4d00]">
                                                                {vote.user.username[0].toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                ))}
                                                {track?.votes?.length > 5 && (
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-white/5 text-[10px] font-medium text-muted-foreground ring-1 ring-white/10">
                                                        +{track.votes.length - 5}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Vote Status Indicator */}
                                        {track.played ? (
                                            <Badge
                                                variant="secondary"
                                                className="ml-2 h-5 border-white/10 bg-white/5 px-2 text-[10px] font-medium text-muted-foreground"
                                            >
                                                Played
                                            </Badge>
                                        ) : hasVotedForThisTrack && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-2 h-5 border-[#ff4d00]/30 bg-[#ff4d00]/10 px-2 text-[10px] font-medium text-[#ff4d00]"
                                            >
                                                <span className="mr-1">✓</span> Voted
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Live Listeners */}
                    <div className="rounded-2xl border border-white/5 bg-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-4 h-4 text-accent" />
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Live Listeners
                            </span>
                            <span className="ml-auto text-sm font-semibold text-accent">
                                {members?.length}
                            </span>
                        </div>
                        <ul className="space-y-2">
                            {
                                members?.map(member => (
                                    <li key={member?.id} className="flex items-center justify-between py-1 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={ImageUrl(member?.profile?.avatarUrl || "")} />
                                                <AvatarFallback className="bg-accent/20 text-accent text-xs">
                                                    {member?.username?.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">
                                                {member?.username}{" "}
                                                {/* <span className="text-muted-foreground">(you)</span> */}
                                            </span>
                                        </div>
                                        {
                                            member.isOnline &&
                                            <Badge
                                                variant="secondary"
                                                className="bg-green-500/10 text-green-500 border-0 text-xs"
                                            >
                                                Online
                                            </Badge>
                                        }
                                    </li>
                                ))
                            }
                        </ul>
                    </div>

                    {/* Event Info */}
                    <div className="rounded-2xl border border-white/5 bg-card p-5">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                            Event Info
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Hosted</span>
                                <span className="font-medium text-white/90">@{data?.createdBy?.username || "unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tracks</span>
                                <span className="font-medium text-white/90">{tracks?.length} in queue</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total votes</span>
                                <span className="font-medium text-white/90">{totalVotes}</span>
                            </div>
                            {
                                data?.licence === Licence.GEOTIME && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Voting starts</span>
                                            <span className="font-medium text-white/90">{formatDateTime(data?.geoVotingStart)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Voting ends</span>
                                            <span className="font-medium text-white/90">{formatDateTime(data?.geoVotingEnd)}</span>
                                        </div>
                                    </>
                                )
                            }
                            {
                                (data?.status === EventStatus.CREATED && data?.createdBy.id === user?.id) && (
                                    <div>
                                        <Button onClick={handleStartEvent} className="bg-accent text-white hover:bg-accent/90 w-full">
                                            <Play /> Start Event
                                        </Button>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}