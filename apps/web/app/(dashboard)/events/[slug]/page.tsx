import { api } from "@/lib/api";
import { Event } from "@repo/types";
import EventDetails from "../components/EventDetails";

export default async function TrackVotePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {

  const { slug } = await params;

  const eventDetails = await api.fetch<Event>(`/event/${slug}`, {
    cache: "no-store",
  })

  console.log(eventDetails, slug)

  if (!eventDetails) {
    return <div className="flex items-center justify-center h-screen">
      <p>Event not found</p>
    </div>
  }

  return (
    <EventDetails eventDetails={eventDetails} eventId={slug} />
  );
}
