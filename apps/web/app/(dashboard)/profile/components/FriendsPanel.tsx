"use client"

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Users, X, Check, Plus } from "lucide-react";
import { useSearchUsersQuery } from "@/services/userApi";
import useDebounce from "@/hooks/use-debounce";
import { ImageUrl, errorMessage } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAcceptFriendRequestMutation,
  useGetFriendsQuery,
  useGetIncomingFriendRequestsQuery,
  useGetSentFriendRequestsQuery,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
  useSendFriendRequestMutation,
} from "@/services/friendshipApi";

function AddFriendDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data: users } = useSearchUsersQuery(debouncedSearchQuery, {
    skip: !debouncedSearchQuery || debouncedSearchQuery.length < 2,
  });
  const { data: friends } = useGetFriendsQuery();
  const { data: sent } = useGetSentFriendRequestsQuery();
  const [sendRequest, { isLoading }] = useSendFriendRequestMutation();

  const friendIds = new Set((friends ?? []).map((f) => f.id));
  const sentIds = new Set((sent ?? []).map((r) => r.receiverId));

  const handleSend = async (userId: string) => {
    try {
      await sendRequest(userId).unwrap();
      toast.success("Friend request sent");
    } catch (err) {
      toast.error("Failed to send friend request", { description: errorMessage(err) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border w-full min-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Friend</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Search for a username to send a friend request
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background border-border focus:border-[#ff4d00] focus:ring-[#ff4d00]/20 pl-10"
          />
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {users?.map((user) => {
            const isFriend = friendIds.has(user.id);
            const isPending = sentIds.has(user.id);
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={ImageUrl(user.profile?.avatarUrl || "")} />
                    <AvatarFallback className="bg-[#ff4d00]/20 text-[#ff4d00] text-xs">
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium truncate text-foreground">{user.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isFriend || isPending || isLoading}
                  onClick={() => handleSend(user.id)}
                  className="text-muted-foreground hover:text-foreground hover:bg-white/10 gap-1.5 disabled:opacity-40"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="text-xs">{isFriend ? "Friends" : isPending ? "Pending" : "Add"}</span>
                </Button>
              </div>
            );
          })}
          {debouncedSearchQuery && users?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FriendsPanel() {
  const { data: friends, isLoading: isLoadingFriends } = useGetFriendsQuery();
  const { data: incoming } = useGetIncomingFriendRequestsQuery();
  const [acceptRequest] = useAcceptFriendRequestMutation();
  const [rejectRequest] = useRejectFriendRequestMutation();
  const [removeFriend] = useRemoveFriendMutation();

  const handleAccept = async (id: string) => {
    try {
      await acceptRequest(id).unwrap();
      toast.success("Friend request accepted");
    } catch (err) {
      toast.error("Failed to accept request", { description: errorMessage(err) });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRequest(id).unwrap();
    } catch (err) {
      toast.error("Failed to decline request", { description: errorMessage(err) });
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeFriend(userId).unwrap();
    } catch (err) {
      toast.error("Failed to remove friend", { description: errorMessage(err) });
    }
  };

  return (
    <Card className="border border-white/5 bg-card">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          Friends
          <span className="text-accent">{friends?.length ?? 0}</span>
        </CardTitle>
        <AddFriendDialog />
      </CardHeader>
      <CardContent className="space-y-3">
        {incoming && incoming.length > 0 && (
          <div className="space-y-2 mb-2">
            {incoming.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#ff4d00]/5 border border-[#ff4d00]/10">
                <p className="text-sm truncate">
                  <span className="font-medium">{req.senderUsername}</span>
                  <span className="text-muted-foreground"> wants to be friends</span>
                </p>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" className="h-6 w-6 bg-[#ff4d00] hover:bg-[#e64400]" onClick={() => handleAccept(req.id)}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleReject(req.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoadingFriends ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !friends || friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No friends yet - add some to start collaborating on playlists.
          </p>
        ) : (
          friends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={ImageUrl(friend.profile?.avatarUrl || "")} />
                  <AvatarFallback className="bg-accent/20 text-accent text-xs">
                    {friend.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">@{friend.username}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(friend.id)}
                className="h-6 w-6 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
