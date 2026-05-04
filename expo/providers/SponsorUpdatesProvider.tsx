import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SponsorSlotTier } from "@/constants/sponsors";

/**
 * Sponsor Updates: posts authored by sponsors (or you on their behalf).
 * Stored locally so they survive app restarts. Surfaced in the public
 * "Sponsor Updates" feed and can be pinned to home.
 */

const KEY = "tortsite.sponsor.updates.v1";

export interface SponsorUpdate {
  id: string;
  sponsorName: string;
  /** Optional slot tier the sponsor occupies (banner/title/etc.) */
  tier?: SponsorSlotTier;
  title: string;
  body: string;
  /** Optional image URL */
  imageUrl?: string;
  /** Optional click-through */
  url?: string;
  /** Pinned to top of feed */
  pinned: boolean;
  /** Show on home screen as a featured update */
  featured: boolean;
  /** ISO timestamp */
  createdAt: string;
}

export interface NewSponsorUpdateInput {
  sponsorName: string;
  tier?: SponsorSlotTier;
  title: string;
  body: string;
  imageUrl?: string;
  url?: string;
  pinned?: boolean;
  featured?: boolean;
}

async function loadAll(): Promise<SponsorUpdate[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SponsorUpdate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log("[SponsorUpdates] load error", e);
    return [];
  }
}

async function persist(items: SponsorUpdate[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.log("[SponsorUpdates] persist error", e);
  }
}

function uid(): string {
  return `su_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const [SponsorUpdatesProvider, useSponsorUpdates] = createContextHook(() => {
  const [updates, setUpdates] = useState<SponsorUpdate[]>([]);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    loadAll().then((items) => {
      setUpdates(items);
      setHydrated(true);
    });
  }, []);

  const addUpdate = useCallback(async (input: NewSponsorUpdateInput) => {
    const next: SponsorUpdate = {
      id: uid(),
      sponsorName: input.sponsorName.trim(),
      tier: input.tier,
      title: input.title.trim(),
      body: input.body.trim(),
      imageUrl: input.imageUrl?.trim() || undefined,
      url: input.url?.trim() || undefined,
      pinned: !!input.pinned,
      featured: !!input.featured,
      createdAt: new Date().toISOString(),
    };
    setUpdates((prev) => {
      const merged = [next, ...prev];
      persist(merged);
      return merged;
    });
    return next;
  }, []);

  const updateUpdate = useCallback(
    async (id: string, patch: Partial<NewSponsorUpdateInput>) => {
      setUpdates((prev) => {
        const merged = prev.map((u) =>
          u.id === id
            ? {
                ...u,
                ...patch,
                sponsorName: patch.sponsorName?.trim() ?? u.sponsorName,
                title: patch.title?.trim() ?? u.title,
                body: patch.body?.trim() ?? u.body,
                imageUrl: patch.imageUrl?.trim() || u.imageUrl,
                url: patch.url?.trim() || u.url,
                pinned: patch.pinned ?? u.pinned,
                featured: patch.featured ?? u.featured,
              }
            : u,
        );
        persist(merged);
        return merged;
      });
    },
    [],
  );

  const removeUpdate = useCallback(async (id: string) => {
    setUpdates((prev) => {
      const merged = prev.filter((u) => u.id !== id);
      persist(merged);
      return merged;
    });
  }, []);

  const togglePinned = useCallback(async (id: string) => {
    setUpdates((prev) => {
      const merged = prev.map((u) => (u.id === id ? { ...u, pinned: !u.pinned } : u));
      persist(merged);
      return merged;
    });
  }, []);

  const toggleFeatured = useCallback(async (id: string) => {
    setUpdates((prev) => {
      const merged = prev.map((u) =>
        u.id === id ? { ...u, featured: !u.featured } : u,
      );
      persist(merged);
      return merged;
    });
  }, []);

  const clearAll = useCallback(async () => {
    setUpdates([]);
    await persist([]);
  }, []);

  const sorted = useMemo<SponsorUpdate[]>(() => {
    return [...updates].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [updates]);

  const featured = useMemo<SponsorUpdate[]>(
    () => sorted.filter((u) => u.featured),
    [sorted],
  );

  return {
    hydrated,
    updates: sorted,
    featured,
    addUpdate,
    updateUpdate,
    removeUpdate,
    togglePinned,
    toggleFeatured,
    clearAll,
  };
});
