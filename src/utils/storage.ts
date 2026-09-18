const PLAYER_ID_KEY = "party_game_player_id";
const PLAYER_NAME_KEY = "party_game_player_name";
const PLAYER_AVATAR_KEY = "party_game_player_avatar";

export function getStoredPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = "p_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getStoredPlayerName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PLAYER_NAME_KEY) || "";
}

export function setStoredPlayerName(name: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  }
}

export function getStoredPlayerAvatar(): string {
  if (typeof window === "undefined") return "🦊";
  return localStorage.getItem(PLAYER_AVATAR_KEY) || "🦊";
}

export function setStoredPlayerAvatar(avatar: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PLAYER_AVATAR_KEY, avatar);
  }
}
