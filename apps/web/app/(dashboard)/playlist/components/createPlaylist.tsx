"use client"

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreatePlaylistData, CreatePlaylistSchema } from "@/validations/playlist/create-playlist";
import { useCreatePlaylistMutation } from "@/services/playlistApi";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { PlaylistVisibility } from "@repo/types";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function CreatePlaylist() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const [createPlaylist] = useCreatePlaylistMutation();

    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue, reset } = useForm({
        resolver: zodResolver(CreatePlaylistSchema),
        defaultValues: { visibility: PlaylistVisibility.PUBLIC as PlaylistVisibility },
    });

    const onSubmit = async (data: CreatePlaylistData) => {
        try {
            const playlist = await createPlaylist(data).unwrap();
            toast.success("Playlist created!");
            setOpen(false);
            reset();
            router.push(`/playlist/${playlist.id}`);
        } catch (error: unknown) {
            toast.error("Failed to create playlist", { description: errorMessage(error) });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#ff4d00] hover:bg-[#e64400] text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    New Playlist
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border min-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Create Playlist</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Start a collaborative playlist with friends
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                            Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="Friday Night Mix"
                            className="bg-background border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                            {...register("name")}
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="What's this playlist about?"
                            className="bg-background border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20"
                            {...register("description")}
                        />
                        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                        <div className="space-y-0.5">
                            <Label htmlFor="visibility" className="text-sm font-medium text-muted-foreground">
                                {watch("visibility") === PlaylistVisibility.PRIVATE ? "Private Playlist" : "Public Playlist"}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {watch("visibility") === PlaylistVisibility.PRIVATE
                                    ? "Only invited users can see and join this playlist"
                                    : "Anyone can find and join this playlist"}
                            </p>
                        </div>
                        <Switch
                            id="visibility"
                            checked={watch("visibility") === PlaylistVisibility.PRIVATE}
                            onCheckedChange={(checked) =>
                                setValue("visibility", checked ? PlaylistVisibility.PRIVATE : PlaylistVisibility.PUBLIC)
                            }
                            className="data-[state=checked]:bg-[#ff4d00]"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#ff4d00] hover:bg-[#e64400] text-white disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Playlist"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
