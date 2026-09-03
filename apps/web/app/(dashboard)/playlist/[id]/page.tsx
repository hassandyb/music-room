import { api } from "@/lib/api";
import { PlaylistPreview } from "@repo/types";
import PlaylistDetails from "../components/PlaylistDetails";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const playlist = await api.fetch<PlaylistPreview>(`/playlists/${id}/preview`, {
    cache: "no-store",
  });

  if (!playlist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Playlist not found</p>
      </div>
    );
  }

  return <PlaylistDetails playlist={playlist} playlistId={id} />;
}
