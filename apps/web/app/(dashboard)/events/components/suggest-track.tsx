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
import { useFetchTracksQuery, useSearchTrackQuery } from "@/services/eventApi";
import { errorMessage, formatDuration } from "@/lib/utils";
import { toast } from "sonner";
import useDebounce from "@/hooks/use-debounce";
import { addTrackToEvent } from "@/lib/rtk/socketMiddleware";
import { useDispatch } from "react-redux";
import { TrackItem } from "@repo/types";



export function SuggestTrack({
    eventId
}: {
    eventId: string
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [tracks, setTracks] = useState<TrackItem[]>([]);
    const debouncedSearchQuery = useDebounce(searchQuery, 2000);
    const { data, isFetching } = useSearchTrackQuery(debouncedSearchQuery, {
        skip: !debouncedSearchQuery || debouncedSearchQuery.length < 2
    });

    const { data: existingTracks, isFetching: isFetchingExistingTracks } = useFetchTracksQuery()

    const dispatch = useDispatch()


    const handleAddTrack = async (trackId: string) => {

        try {
            dispatch(addTrackToEvent(eventId, trackId))
            toast.success("Track added successfully", {
                description: "The track has been added to the event"
            })
        } catch (err) {
            toast.error("Failed to add track", {
                description: errorMessage(err)
            })
        }
    };

    useEffect(() => {
        if (existingTracks) {
            setTracks(existingTracks);
        }
    }, [existingTracks]);

    useEffect(() => {
        if (data) {
            setTracks(data);
        }
    }, [data]);



    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-[#ff4d00] hover:bg-[#e64400] text-white">
                        <Music2Icon className="h-4 w-4" />
                        Suggest Track
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border w-full min-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Add Track</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Search for a track to add to the event queue
                        </DialogDescription>
                    </DialogHeader>

                    {/* Search Input */}
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

                    {/* Results Count */}
                    {tracks.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            Found {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                        </p>
                    )}

                    {/* Track List */}
                    <ScrollArea className="flex-1 min-w-0 max-h-[400px] pr-4 [&>div>div]:!block">
                        {tracks.length === 0 && searchQuery && !isFetching && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Music2Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No tracks found</p>
                                <p className="text-sm">Try searching with different keywords</p>
                            </div>
                        )}

                        {isFetching && tracks.length === 0 && (
                            <div className="text-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-[#ff4d00] mx-auto" />
                                <p className="text-muted-foreground mt-2">Searching...</p>
                            </div>
                        )}

                        {tracks.map((track, index) => (
                            <div key={track.id}>
                                <div className="flex items-center gap-4 py-3 hover:bg-accent rounded-lg px-3 transition-colors group">
                                    {/* Track Cover or Placeholder */}
                                    <div className="w-12 h-12 rounded-md bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {track.imageUrl ? (
                                            <img
                                                src={track.imageUrl}
                                                alt={track.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Music2Icon className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* Track Info */}
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {track.title}
                                        </p>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                                            <span className="truncate min-w-0">
                                                {track.artist}
                                                {track.album ? ` • ${track.album}` : ""}
                                            </span>
                                            <span className="shrink-0 whitespace-nowrap">
                                                • {formatDuration(track.duration)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            onClick={() => handleAddTrack(track.id)}
                                            size="sm"
                                            className="bg-[#ff4d00] hover:bg-[#e64400] text-white h-8 px-3"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add
                                        </Button>
                                    </div>
                                </div>
                                {index < tracks.length - 1 && (
                                    <Separator className="bg-border" />
                                )}
                            </div>
                        ))}
                    </ScrollArea>

                    {/* Footer with Quick Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            {tracks.length > 0 ? `${tracks.length} tracks found` : "No tracks found"}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => setOpen(false)}
                                className="bg-[#ff4d00] hover:bg-[#e64400] text-white"
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}


