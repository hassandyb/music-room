"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Users, Plus } from "lucide-react";
import { ImageUrl, errorMessage } from "@/lib/utils";
import { useSendInviteMutation } from "@/services/eventApi";
import { useGetFriendsQuery } from "@/services/friendshipApi";
import { toast } from "sonner";

export default function InviteToEvent({
    eventId
}: {
    eventId: string
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: friends, isLoading } = useGetFriendsQuery();
    const [sendInvite] = useSendInviteMutation();

    const filteredFriends = useMemo(() => {
        if (!friends) return [];
        const q = searchQuery.trim().toLowerCase();
        if (!q) return friends;
        return friends.filter((f) => f.username.toLowerCase().includes(q));
    }, [friends, searchQuery]);

    const handleInvite = async (userId: string) => {
        try {
            await sendInvite({ eventId, userId }).unwrap();
            toast.success("Invitation sent");
        } catch (err) {
            toast.error("Failed to send invitation", { description: errorMessage(err) });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-foreground gap-2">
                    <Plus className="w-4 h-4" />
                    Invite
                </Button>
            </DialogTrigger>
            <DialogContent className="min-w-[600px] max-h-[90vh] bg-card border-border p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        Invite to Event
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Only friends can be invited to join your event
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Search */}
                    <div className="p-6 pb-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search your friends..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 border-white/10 bg-white/5 text-sm placeholder:text-muted-foreground focus:border-[#ff4d00]/50 focus:ring-[#ff4d00]/20"
                            />
                        </div>
                    </div>

                    <div className="flex-1 px-6 pb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                {filteredFriends.length} friend{filteredFriends.length === 1 ? "" : "s"}
                            </span>
                        </div>

                        {isLoading ? (
                            <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
                        ) : !friends || friends.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="rounded-full bg-white/5 p-4 mb-4">
                                    <Users className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm text-muted-foreground">You have no friends yet</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    Add friends from your{" "}
                                    <Link href="/profile" className="text-[#ff4d00] hover:underline">
                                        profile
                                    </Link>{" "}
                                    first
                                </p>
                            </div>
                        ) : filteredFriends.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-sm text-muted-foreground">No friends match "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {filteredFriends.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 rounded-lg transition-all hover:bg-white/5 border border-transparent hover:border-white/10"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={ImageUrl(user.profile?.avatarUrl || "")} />
                                                <AvatarFallback className="bg-[#ff4d00]/20 text-[#ff4d00] text-xs">
                                                    {user.username.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate text-foreground">{user.username}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleInvite(user.id)}
                                            className="text-muted-foreground hover:text-foreground hover:bg-white/10 gap-1.5"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            <span className="text-xs hidden sm:inline">Invite</span>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
