"use client";

export interface TeamContext {
  teamId: string;
  ownerId: string;
  ownerName: string;
}

const COOKIE_NAME = "es_team_context";

export function getTeamContext(): TeamContext | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function setTeamContext(ctx: TeamContext): void {
  const value = encodeURIComponent(JSON.stringify(ctx));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict`;
}

export function clearTeamContext(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
