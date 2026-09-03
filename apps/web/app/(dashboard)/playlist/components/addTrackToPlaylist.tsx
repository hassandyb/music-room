"use client"

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music2Icon, Plus, Loader2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSearchTrackQuery } from "@/services/eventApi";
import { useAddTracksToPlaylistMutation } from "@/services/playlistApi";
import { errorMessage, formatDuration } from "@/lib/utils";
import { toast } from "sonner";
import useDebounce from "@/hooks/use-debounce";

interface SearchedTrack {
    id: string;
    title: string;
    artist: string;
    album: string | null;
    duration: number;
    imageUrl: string | null;
    url: string;
    source: string;
}

export function AddTrackToPlaylist({
    playlistId,
    currentVersion,
    existingTrackIds,
}: {
    playlistId: string;
    currentVersion: number;
    existingTrackIds: string[];
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [tracks, setTracks] = useState<SearchedTrack[]>([]);
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const { data, isFetching } = useSearchTrackQuery(debouncedSearchQuery, {
        skip: !debouncedSearchQuery || debouncedSearchQuery.length < 2,
    });

    const [addTracks, { isLoading }] = useAddTracksToPlaylistMutation();

    useEffect(() => {
        if (data) {
            setTracks(
                data.map((track) => ({
                    id: track?.id?.toString() || "",
                    title: track?.title,
                    artist: track?.artist,
                    album: track?.album,
                    duration: track?.duration,
                    imageUrl: track?.imageUrl,
                    url: track?.url,
                    source: track?.source,
                })),
            );
        }
    }, [data]);

    const handleAddTrack = async (trackId: string) => {
        try {
            await addTracks({ id: playlistId, trackIds: [trackId], currentVersion }).unwrap();
            toast.success("Track added to playlist");
        } catch (err) {
            toast.error("Failed to add track", { description: errorMessage(err) });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#ff4d00] hover:bg-[#e64400] text-white">
                    <Music2Icon className="h-4 w-4" />
                    Add track
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border w-full min-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Add Track</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Search for a track to add to the playlist
                    </DialogDescription>
                </DialogHeader>

                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for tracks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-background border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20 pl-10"
                    />
                    {isFetching && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-[#ff4d00]" />
                    )}
                </div>

                <ScrollArea className="flex-1 min-w-0 max-h-[400px] pr-4 [&>div>div]:!block">
                    {tracks.length === 0 && searchQuery && !isFetching && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Music2Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No tracks found</p>
                        </div>
                    )}

                    {tracks.map((track, index) => {
                        const alreadyAdded = existingTrackIds.includes(track.id);
                        return (
                            <div key={track.id}>
                                <div className="flex items-center gap-4 py-3 hover:bg-accent rounded-lg px-3 transition-colors group">
                                    <div className="w-12 h-12 rounded-md bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {track.imageUrl ? (
                                            <img src={track.imageUrl} alt={track.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <Music2Icon className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                                            <span className="truncate min-w-0">
                                                {track.artist}
                                                {track.album ? ` • ${track.album}` : ""}
                                            </span>
                                            <span className="shrink-0 whitespace-nowrap">• {formatDuration(track.duration)}</span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleAddTrack(track.id)}
                                        disabled={alreadyAdded || isLoading}
                                        size="sm"
                                        className="bg-[#ff4d00] hover:bg-[#e64400] text-white h-8 px-3 disabled:opacity-40"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {alreadyAdded ? "Added" : "Add"}
                                    </Button>
                                </div>
                                {index < tracks.length - 1 && <Separator className="bg-border" />}
                            </div>
                        );
                    })}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
