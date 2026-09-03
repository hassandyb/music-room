import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs';

export interface RawExternalTrack {
    name: string;
    artist_name?: string;
    album_name?: string;
    image?: string;
    audiodownload?: string;
    audio?: string;
    duration?: number;
}

interface DeezerSearchResult {
    data: {
        title: string;
        artist?: { name?: string };
        album?: { title?: string; cover_medium?: string };
        preview?: string;
        duration?: number;
    }[];
}

@Injectable()
export class ExternalService {
    constructor(
        private httpService: HttpService,
    ) { }

    // Deezer's public search endpoint needs no API key and hands back a
    // directly-streamable 30s preview URL (open CORS, no auth, long-lived)
    // in the same response — there's no separate download step at all. See
    // TrackService.getAudioStream for how playback uses that preview URL
    // directly instead of a locally-stored file.
    async searchDeezer(query: string, limit: number = 5): Promise<RawExternalTrack[]> {
        const url = 'https://api.deezer.com/search';

        try {
            const response = await firstValueFrom(
                this.httpService.get<DeezerSearchResult>(url, { params: { q: query, limit } }),
            );

            return (response.data.data ?? []).map((track) => ({
                name: track.title,
                artist_name: track.artist?.name,
                album_name: track.album?.title,
                image: track.album?.cover_medium,
                audiodownload: track.preview,
                duration: track.duration,
            }));
        } catch (error) {
            throw new Error('Failed to fetch from Deezer');
        }
    }
}
