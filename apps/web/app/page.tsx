import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { UserWithProfile } from "@repo/types";

export default async function Home() {
  await api.fetch<UserWithProfile>("/auth/me");
  redirect("/profile");
}
