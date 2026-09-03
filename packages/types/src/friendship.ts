import { UserWithProfile } from "./user";

export enum FriendRequestStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
}

export interface FriendRequest {
    id: string;
    senderId: string;
    receiverId: string;
    status: FriendRequestStatus;
    createdAt: string;
}

export interface FriendRequestDetail extends FriendRequest {
    senderUsername: string;
    receiverUsername: string;
}

export type Friend = UserWithProfile;

// WebSocket payload - pushed on the shared /notifications channel (§5.3-style,
// same personal per-user room the playlist invitation push already uses).
export interface FriendRequestReceivedPayload {
    id: string;
    senderId: string;
    senderUsername: string;
}
