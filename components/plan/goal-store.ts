"use client";

import type { PlannedGoal } from "@/lib/finance";

export interface SavedGoal extends PlannedGoal {
  id: string;
}

export interface GoalStore {
  goals: SavedGoal[];
  budget: number;
}

const key = "hisab.goals.v1";
const empty: GoalStore = { goals: [], budget: 20000 };
let snapshot: GoalStore = empty;
let hydrated = false;
const listeners = new Set<() => void>();

function readStored(): GoalStore {
  const stored = window.localStorage.getItem(key);
  if (!stored) return empty;
  try {
    const parsed = JSON.parse(stored) as Partial<GoalStore>;
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      budget: typeof parsed.budget === "number" ? parsed.budget : 20000,
    };
  } catch {
    window.localStorage.removeItem(key);
    return empty;
  }
}

function publish(next: GoalStore) {
  snapshot = next;
  window.localStorage.setItem(key, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function subscribeGoals(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGoalSnapshot(): GoalStore {
  if (!hydrated) {
    hydrated = true;
    snapshot = readStored();
  }
  return snapshot;
}

export function getGoalServerSnapshot(): GoalStore {
  return empty;
}

export function saveGoals(next: GoalStore) {
  publish(next);
}

export function clearGoals() {
  publish(empty);
}
