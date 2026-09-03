import { cookies } from "next/headers";
import { redirect } from "next/navigation";

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.API_INTERNAL_URL}/api`;
  }

  private handleRedirect(url: string) {
    redirect(url);
  }

  async fetch<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T | undefined> {
    try {
      const cookieStore = await cookies();
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Cookie: cookieStore.toString(),
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (res.status === 401) {
        this.handleRedirect("/login");
      }
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    } catch (error) {
      console.error("API request failed:", error);
    }
  }
}

export const api = new ApiClient();
