-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "LicenceType" AS ENUM ('FREE', 'INVITE_ONLY', 'GEOTIME');

-- CreateEnum
CREATE TYPE "EventPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('CREATED', 'VOTING', 'PLAYING', 'FINISHED');

-- CreateEnum
CREATE TYPE "Subscription" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PlaylistEditPolicy" AS ENUM ('EVERYONE', 'INVITED_ONLY');

-- CreateEnum
CREATE TYPE "PlaylistVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "googleId" TEXT,
    "facebookId" TEXT,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "resetPasswordTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription" "Subscription" NOT NULL DEFAULT 'FREE',
    "searchPreference" TEXT DEFAULT '{}',

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION DEFAULT 100,
    "status" "EventStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "privacy" "EventPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "licence" "LicenceType" NOT NULL DEFAULT 'FREE',
    "currentTrackId" TEXT,
    "currentTrackStartTime" TIMESTAMP(3),
    "round" INTEGER NOT NULL DEFAULT 0,
    "geoVotingStart" TIMESTAMP(3),
    "geoVotingEnd" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventMembers" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitationId" TEXT,

    CONSTRAINT "eventMembers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventInvites" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "eventInvites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "imageUrl" TEXT,
    "duration" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'YOUTUBE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "visibility" "PlaylistVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlistMembers" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlistMembers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlistTracks" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlistTracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlistLicenses" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "editPolicy" "PlaylistEditPolicy" NOT NULL DEFAULT 'EVERYONE',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "playlistLicenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlistInvitations" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlistInvitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventTracks" (
    "eventId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER DEFAULT 0,

    CONSTRAINT "eventTracks_pkey" PRIMARY KEY ("eventId","trackId")
);

-- CreateTable
CREATE TABLE "trackVotes" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isWithinRadius" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "round" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "trackVotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendRequests" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actionLogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ip" TEXT,
    "platform" TEXT,
    "deviceName" TEXT,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actionLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_facebookId_key" ON "User"("facebookId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "profiles_userId_idx" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "events_id_idx" ON "events"("id");

-- CreateIndex
CREATE INDEX "eventMembers_eventId_idx" ON "eventMembers"("eventId");

-- CreateIndex
CREATE INDEX "eventMembers_userId_idx" ON "eventMembers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "eventInvites_inviteKey_key" ON "eventInvites"("inviteKey");

-- CreateIndex
CREATE INDEX "eventInvites_eventId_idx" ON "eventInvites"("eventId");

-- CreateIndex
CREATE INDEX "eventInvites_userId_idx" ON "eventInvites"("userId");

-- CreateIndex
CREATE INDEX "tracks_id_idx" ON "tracks"("id");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_title_artist_source_key" ON "tracks"("title", "artist", "source");

-- CreateIndex
CREATE INDEX "playlists_id_idx" ON "playlists"("id");

-- CreateIndex
CREATE INDEX "playlists_ownerId_idx" ON "playlists"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_ownerId_name_key" ON "playlists"("ownerId", "name");

-- CreateIndex
CREATE INDEX "playlistMembers_playlistId_idx" ON "playlistMembers"("playlistId");

-- CreateIndex
CREATE INDEX "playlistMembers_userId_idx" ON "playlistMembers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "playlistMembers_playlistId_userId_key" ON "playlistMembers"("playlistId", "userId");

-- CreateIndex
CREATE INDEX "playlistTracks_playlistId_idx" ON "playlistTracks"("playlistId");

-- CreateIndex
CREATE INDEX "playlistTracks_trackId_idx" ON "playlistTracks"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "playlistTracks_playlistId_trackId_key" ON "playlistTracks"("playlistId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "playlistLicenses_playlistId_key" ON "playlistLicenses"("playlistId");

-- CreateIndex
CREATE INDEX "playlistInvitations_playlistId_idx" ON "playlistInvitations"("playlistId");

-- CreateIndex
CREATE INDEX "playlistInvitations_userId_idx" ON "playlistInvitations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "playlistInvitations_playlistId_userId_key" ON "playlistInvitations"("playlistId", "userId");

-- CreateIndex
CREATE INDEX "eventTracks_eventId_trackId_idx" ON "eventTracks"("eventId", "trackId");

-- CreateIndex
CREATE INDEX "trackVotes_trackId_idx" ON "trackVotes"("trackId");

-- CreateIndex
CREATE INDEX "trackVotes_eventId_idx" ON "trackVotes"("eventId");

-- CreateIndex
CREATE INDEX "trackVotes_userId_idx" ON "trackVotes"("userId");

-- CreateIndex
CREATE INDEX "friendRequests_senderId_idx" ON "friendRequests"("senderId");

-- CreateIndex
CREATE INDEX "friendRequests_receiverId_idx" ON "friendRequests"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "friendRequests_senderId_receiverId_key" ON "friendRequests"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "actionLogs_userId_idx" ON "actionLogs"("userId");

-- CreateIndex
CREATE INDEX "actionLogs_action_idx" ON "actionLogs"("action");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_currentTrackId_fkey" FOREIGN KEY ("currentTrackId") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventMembers" ADD CONSTRAINT "eventMembers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventMembers" ADD CONSTRAINT "eventMembers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventMembers" ADD CONSTRAINT "eventMembers_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "eventInvites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventInvites" ADD CONSTRAINT "eventInvites_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventInvites" ADD CONSTRAINT "eventInvites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlistMembers" ADD CONSTRAINT "playlistMembers_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlistMembers" ADD CONSTRAINT "playlistMembers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlistTracks" ADD CONSTRAINT "playlistTracks_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlistTracks" ADD CONSTRAINT "playlistTracks_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlistLicenses" ADD CONSTRAINT "playlistLicenses_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlistInvitations" ADD CONSTRAINT "playlistInvitations_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlistInvitations" ADD CONSTRAINT "playlistInvitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventTracks" ADD CONSTRAINT "eventTracks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventTracks" ADD CONSTRAINT "eventTracks_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackVotes" ADD CONSTRAINT "trackVotes_eventId_trackId_fkey" FOREIGN KEY ("eventId", "trackId") REFERENCES "eventTracks"("eventId", "trackId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackVotes" ADD CONSTRAINT "trackVotes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackVotes" ADD CONSTRAINT "trackVotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendRequests" ADD CONSTRAINT "friendRequests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendRequests" ADD CONSTRAINT "friendRequests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actionLogs" ADD CONSTRAINT "actionLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
