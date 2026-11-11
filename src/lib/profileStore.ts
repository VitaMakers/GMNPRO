"use client";

import { useSyncExternalStore } from "react";

export interface Profile {
  location_name: string;
  title: string | null;
  photoUrl: string | null;
}

const KEY = "gmnpro.activeProfile";

let activeLocation: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    activeLocation = localStorage.getItem(KEY);
  } catch {
    activeLocation = null;
  }
}

export function setActiveProfile(location_name: string) {
  ensureLoaded();
  if (activeLocation === location_name) return;
  activeLocation = location_name;
  try {
    localStorage.setItem(KEY, location_name);
  } catch {
    /* ignora */
  }
  emit();
}

/** Define um padrão só se ainda não houver nenhum selecionado. */
export function initActiveProfile(location_name: string) {
  ensureLoaded();
  if (!activeLocation && location_name) {
    activeLocation = location_name;
    try {
      localStorage.setItem(KEY, location_name);
    } catch {
      /* ignora */
    }
    emit();
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): string | null {
  ensureLoaded();
  return activeLocation;
}

export function useActiveProfile(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
