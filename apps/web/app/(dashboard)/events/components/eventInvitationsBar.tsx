"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  useAcceptEventInvitationMutation,
  useGetMyEventInvitationsQuery,
  useRejectEventInvitationMutation,
} from "@/services/eventApi";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

export default function EventInvitationsBar() {
  const router = useRouter();
  const { data: invitations } = useGetMyEventInvitationsQuery();
  const [accept] = useAcceptEventInvitationMutation();
  const [reject] = useRejectEventInvitationMutation();

  if (!invitations || invitations.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#ff4d00]/20 bg-[#ff4d00]/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
        <Mail className="h-4 w-4 text-[#ff4d00]" />
        Pending event invitations
      </div>
      <div className="space-y-2">
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2">
            <p className="text-sm text-foreground/80 truncate">
              <span className="font-medium">{inv.creatorUsername}</span> invited you to{" "}
              <span className="font-medium">{inv.eventName}</span>
            </p>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-[#ff4d00] hover:bg-[#e64400] text-white h-7 px-3"
                onClick={async () => {
                  try {
                    await accept(inv.id).unwrap();
                    toast.success("Invitation accepted");
                    router.refresh();
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
