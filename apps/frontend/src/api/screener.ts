import type { ScreenerResponse } from "../types/screener";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4040";

export async function getScreenerResults(): Promise<ScreenerResponse> {
  const response = await fetch(`${API_BASE_URL}/api/screener`);

  if (!response.ok) {
    throw new Error(`Screener API error: ${response.status}`);
  }

  return response.json();
}
