import { Inject, Injectable, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { ExternalService } from '../external/external.service';
import { PrismaService } from '../prisma/prisma.service';
import { Track, TrackSearch, UserWithProfile } from '@repo/types';
import { type IStorageService, STORAGE_SERVICE } from '../storage/storage.interface';
import { parseRangeHeader } from '../../common/utils/utils';

type ExternalTrackResult = TrackSearch & { source: string };


@Injectable()
export class TrackService {
    private readonly logger = new Logger(TrackService.name);
    private readonly searchThreshold = 10;

    constructor(
        private readonly externalService: ExternalService,
        private readonly prisma: PrismaService,
        @Inject(STORAGE_SERVICE)
        private readonly storageService: IStorageService,
    ) { }


    async searchTracks(query: string, user: UserWithProfile) {
        // 1. Check the cache first
        const cachedTracks = await this.prisma.track.findMany({
            where: {
                OR: [
                    { title: { contains: query } },
                    { album: { contains: query } },
                    { artist: { contains: query } },
                ],
            },
            take: this.searchThreshold,
        });

        const stillNeeded = this.searchThreshold - cachedTracks.length;
        if (stillNeeded <= 0) {
            return cachedTracks;
        }

        // 2. Fill the rest from Deezer
        const rawResults = await this.externalService
            .searchDeezer(query, stillNeeded)
            .catch((err) => {
                this.logger.warn(`Deezer search failed: ${err}`);
                return [];
            });

        const externalTracks: ExternalTrackResult[] = rawResults.map((r) => ({
            title: r.name,
            artist: r.artist_name ?? 'Unknown Artist',
            album: r.album_name ?? null,
            imageUrl: r.image ?? null,
            duration: r.duration ?? 0,
            source: 'deezer',
            url: r.audiodownload ?? r.audio ?? '',
        }));

        // 3. Persist newly found tracks
        const newlySaved = await Promise.all(
            externalTracks.map((track) => this.upsertExternalTrack(track)),
        );

        // 4. Merge cache + newly saved, de-duplicated, capped at threshold
        const merged = [...cachedTracks, ...newlySaved.filter((t) => t !== null)];
        const deduped = Array.from(new Map(merged.map((t) => [t.id, t])).values());

        return deduped.slice(0, this.searchThreshold);
    }

    private async upsertExternalTrack(track: ExternalTrackResult) {
        // upsert on the (title, artist, source) unique constraint instead of
        // find-then-create: two concurrent searches racing to save the same
        // track no longer produce duplicate rows or a lost result.
        return await this.prisma.track
            .upsert({
                where: {
                    title_artist_source: {
                        title: track.title,
                        artist: track.artist,
                        source: track.source,
                    },
                },
                update: {},
                create: {
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    imageUrl: track.imageUrl,
                    duration: track.duration,
                    url: track.url,
                    source: track.source,
                    path: '',
                },
            })
            .catch((err) => {
                this.logger.error(`Failed to save track "${track.title}": ${err}`);
                return null;
            });
    }

    async getTrackById(id: string) {
        return await this.prisma.track.findUnique({
            where: {
                id,
            },
        });
    }

    async getAllTracks(count: number = 10) {
        return await this.prisma.track.findMany({
            take: count,
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Deezer tracks hand back a directly-playable preview URL, so there's
    // nothing stored locally to stream — just point the client at it.
    // `path` is only ever set for tracks uploaded directly (see
    // StorageService), which do stream from disk.
    async getAudioStream(
        id: string,
        rangeHeader?: string,
    ): Promise<
        | { kind: 'redirect'; url: string }
        | { kind: 'stream'; file: StreamableFile; totalSize: number; range?: { start: number; end: number } }
    > {
        const track = await this.prisma.track.findUnique({ where: { id } });
        if (!track) {
            throw new NotFoundException('Track not found');
        }

        if (track.path) {
            const totalSize = await this.storageService.getFileSize(track.path);
            const range = parseRangeHeader(rangeHeader, totalSize);

            const { stream, mimeType } = await this.storageService.getFileStream(track.path, range);
            return {
                kind: 'stream',
                file: new StreamableFile(stream, { type: mimeType, disposition: 'inline' }),
                totalSize,
                range,
            };
        }

        if (track.url) {
            return { kind: 'redirect', url: track.url };
        }

        throw new NotFoundException('Track not found');
    }
}
