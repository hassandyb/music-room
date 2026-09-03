
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { Event, EventStatus, Licence, Privacy, PaginatedResponse } from "@repo/types";
import {
  Disc3,
  Play,
  MapPin,
  AudioLines,
  User,
  Music2,
} from "lucide-react";
import Link from "next/link";
import { CreateEvent } from "./components/createEvent";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import EventsFilter from "./components/filterEvents";
import EventSearch from "./components/eventSearch";
import EventInvitationsBar from "./components/eventInvitationsBar";


export function EmptyEventsState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-white/5 bg-card p-12 text-center transition-all hover:border-[#ff4d00]/20">
      <div className="rounded-full bg-[#ff4d00]/10 p-4 mb-4">
        <Disc3 className="h-8 w-8 text-[#ff4d00]/60" />
      </div>
      <h3 className="text-lg font-medium text-foreground/90 mb-2">
        No events yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Create your first music event and start sharing the rhythm with your audience.
      </p>
    </div>
  );
}




type SearchParams = { [key: string]: string | string[] | undefined };

const EVENTS_PER_PAGE = 12;

function toValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function buildApiQuery(sp: SearchParams) {
  const params = new URLSearchParams();
  params.set("page", toValues(sp.page)[0] ?? "1");
  params.set("limit", String(EVENTS_PER_PAGE));

  const search = toValues(sp.search)[0];
  if (search) params.set("search", search);

  for (const key of ["status", "privacy", "licence"] as const) {
    toValues(sp[key]).forEach((v) => params.append(key, v));
  }

  if (toValues(sp.hasGeoVoting).includes("true")) {
    params.set("hasGeoVoting", "true");
  }

  return params.toString();
}

function buildPageHref(sp: SearchParams, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "page") continue;
    toValues(value).forEach((v) => params.append(key, v));
  }
  params.set("page", String(page));
  return `?${params.toString()}`;
}

function getPaginationRange(current: number, total: number): (number | "ellipsis")[] {
  const range: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) range.push("ellipsis");
  for (let page = left; page <= right; page++) range.push(page);
  if (right < total - 1) range.push("ellipsis");
  if (total > 1) range.push(total);

  return range;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const response = await api.fetch<PaginatedResponse<Event>>(
    `/event/all?${buildApiQuery(sp)}`,
  );

  const events = response?.data ?? [];
  const meta = response?.meta ?? {
    page: 1,
    limit: EVENTS_PER_PAGE,
    total: 0,
    totalPages: 1,
  };
  const paginationRange = getPaginationRange(meta.page, meta.totalPages);

  return (
    <div className="w-full h-full flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Music <span className="text-[#ff4d00]">Events</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover and join live music events
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <EventSearch />
          <CreateEvent />
        </div>
      </header>


      <EventInvitationsBar />

      {/* My Events */}
      <section className="flex flex-col gap-4">
        {/* Filters Section */}
        <div className="py-4">
          <EventsFilter />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {events.length === 0 ? (
            <EmptyEventsState />
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </div>
      </section>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={buildPageHref(sp, Math.max(1, meta.page - 1))}
                  aria-disabled={meta.page <= 1}
                  className={meta.page <= 1 ? "pointer-events-none opacity-40" : undefined}
                />
              </PaginationItem>
              {paginationRange.map((page, index) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href={buildPageHref(sp, page)}
                      isActive={page === meta.page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href={buildPageHref(sp, Math.min(meta.totalPages, meta.page + 1))}
                  aria-disabled={meta.page >= meta.totalPages}
                  className={meta.page >= meta.totalPages ? "pointer-events-none opacity-40" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}



function EventCard({ event }: { event: Event }) {
  const isLive = event.status === EventStatus.VOTING || event.status === EventStatus.PLAYING; // adjust to match your EventStatus enum
  const trackCount = event.tracks?.length ?? 0;
  const visibleTracks = event.tracks?.slice(0, 5) ?? [];
  const overflowCount = trackCount - visibleTracks.length;
  const hasLocation = typeof event.latitude === "number" && typeof event.longitude === "number";


  console.log(event)

  return (
    <Link href={`/events/${event.id}`} className="group block">
      <Card className="overflow-hidden bg-card p-0 transition-colors hover:border-[#ff4d00]/40">
        <CardHeader className="relative h-42 p-0 overflow-hidden">
          <div className="absolute flex justify-center border-b border-white/10 items-center inset-0 bg-gradient-to-br from-[#ff4d00]/10 via-[#ff4d00]/5 to-transparent">
            {/* <WavyLine width={315} height={128} /> */}
            <AudioLines size={30} />
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="rounded-full bg-[#ff4d00]/20 p-3 backdrop-blur-sm">
              <Play className="h-6 w-6 text-[#ff4d00] fill-[#ff4d00]" aria-hidden="true" />
            </div>
          </div>

          <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
            {isLive && (
              <Badge className="bg-[#ff4d00]/20 text-[#ff4d00] border-[#ff4d00]/30 backdrop-blur-sm">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#ff4d00] animate-pulse" />
                Live
              </Badge>
            )}
            {event.round != null && (
              <Badge
                variant="secondary"
                className="border-white/10 bg-background/70 text-foreground/70 text-[10px] font-mono backdrop-blur-sm"
              >
                Round {event.round}
              </Badge>
            )}
          </div>

          {isLive && event.currentTrack && (
            <div className="absolute bottom-0 inset-x-0 bg-background/70 backdrop-blur-sm px-2.5 py-1.5">
              <p className="text-[10px] font-mono text-foreground/70 truncate">
                <span className="text-[#ff4d00]">Now</span> {event.currentTrack.title}
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4">
          <CardTitle className="text-sm capitalize font-medium text-foreground/90 mb-1 truncate group-hover:text-[#ff4d00] transition-colors">
            {event.title}
          </CardTitle>
          <CardDescription className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 truncate">
                <User size={12} />
                {event.createdBy?.username}
              </p>
              {hasLocation && (
                <MapPin className="h-3 w-3 shrink-0" aria-label="Location-restricted event" />
              )}
            </div>



            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <Badge
                  variant="secondary"
                  className={event.privacy === "PUBLIC"
                    ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
                    : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"}
                >
                  {event.privacy}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px]"
                >
                  {event.licence}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground/50 font-mono text-[10px]">
                {trackCount > 0 && (
                  <div className="flex items-center">
                    {visibleTracks.map((track, i) => (
                      <div
                        key={track.trackId}
                        className="relative h-6 w-6 rounded-full border-2 border-card overflow-hidden bg-white/10 shrink-0"
                        style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visibleTracks.length - i }}
                      >
                        {track.track?.imageUrl ? (
                          <img
                            src={track.track?.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Music2 className="h-3 w-3 text-foreground/30" />
                          </div>
                        )}
                      </div>
                    ))}
                    {overflowCount > 0 && (
                      <div
                        className="relative h-6 w-6 rounded-full border-2 border-card bg-white/10 flex items-center justify-center text-[9px] font-mono text-foreground/60 shrink-0"
                        style={{ marginLeft: -8, zIndex: 0 }}
                      >
                        +{overflowCount}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}

export function WavyLine({ width = 315, height = 80 }) {
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-40"
    >
      <polyline
        points="0,98 26,34 53,69 79,42 105,65 131,88 158,96 184,71 210,89 236,34 263,102 289,83 315,38"
        fill="none"
        stroke="#ff4d00"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <polyline
        points="0,88 26,54 53,49 79,62 105,45 131,78 158,76 184,91 210,69 236,54 263,82 289,73 315,58"
        fill="none"
        stroke="#ff4d00"
        strokeWidth="0.5"
        opacity="0.3"
      />
    </svg>
  );
}

