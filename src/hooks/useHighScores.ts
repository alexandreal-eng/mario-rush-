import { useCallback, useEffect, useState } from "react";

export interface ScoreEntry {
  name: string;
  score: number;
  mode: "adventure" | "race";
  label: string;
  date: number;
}

const KEY = "mario-rush-scores";
const NAME_KEY = "mario-rush-name";

function load(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreEntry[];
    if (!Array.isArray(arr)) return [];
    return arr.filter((e) => typeof e?.score === "number").slice(0, 25);
  } catch {
    return [];
  }
}

export function lastName() {
  try {
    return localStorage.getItem(NAME_KEY) || "MARIO";
  } catch {
    return "MARIO";
  }
}

export function useHighScores() {
  const [scores, setScores] = useState<ScoreEntry[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(scores.slice(0, 25)));
    } catch {
      /* ignore */
    }
  }, [scores]);

  const add = useCallback((e: ScoreEntry) => {
    setScores((prev) =>
      [...prev, e]
        .sort((a, b) => b.score - a.score)
        .slice(0, 25)
    );
    try {
      localStorage.setItem(NAME_KEY, e.name);
    } catch {
      /* ignore */
    }
  }, []);

  const clear = useCallback(() => setScores([]), []);

  return { scores, add, clear };
}
