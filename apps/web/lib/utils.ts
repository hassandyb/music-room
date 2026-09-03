import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Runs client-side (used from "use client" components), so it needs the
// NEXT_PUBLIC_ prefix to be inlined into the browser bundle — see
// apps/web/.env and Next's docs on environment variables.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export function ImageUrl(image?: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${image}`;
}

// Full-page navigation (not a fetch) — this hits the backend's dedicated web
// OAuth2 start route directly (see auth.controller.ts's
// google/web|facebook/web routes, separate from the mobile app's own), which
// redirects to the provider and back, ending in a redirect to /auth/callback
// with the session cookie already set.
export function oauthStartUrl(provider: "google" | "facebook") {
  return `${BACKEND_URL}/api/auth/${provider}/web`;
}

export function formateDate(dateString?: string) {
  if (!dateString) return "";
  const dateObject = parseISO(dateString);
  return format(dateObject, "MMMM d, yyyy");
}

export function relativeDate(dateString?: string) {
  if (!dateString) return "";
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

export function formatDateTime(dateString?: string | Date) {
  if (!dateString) return "";
  const dateObject = typeof dateString === "string" ? parseISO(dateString) : dateString;
  return format(dateObject, "MMM d, h:mm a");
}

interface ApiResponseError {

  data: {
    error: string
    message: string;
  };
  status: number
}


function isApiResponseError(error: unknown): error is ApiResponseError {
  return (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as any).data === "object" &&
    (error as any).data !== null &&
    "message" in (error as any).data
  );
}

export function errorMessage(error: unknown): string {
  if (isApiResponseError(error)) {
    return error.data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};