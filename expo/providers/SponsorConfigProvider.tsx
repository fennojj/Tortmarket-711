import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SPONSOR_CREATIVES,
  type SponsorCreative,
  type SponsorSlotTier,
} from "@/constants/sponsors";

/**
 * Sponsor creatives can come from three sources, in priority order:
 *   1. Local override (paste JSON in /admin) — instant, no network
 *   2. Remote feed at EXPO_PUBLIC_SPONSOR_FEED_URL — polled every 60s
 *   3. Static SPONSOR_CREATIVES from constants/sponsors.ts
 *
 * The merged map is exposed via creativeFor(tier).
 */

const LOCAL_KEY = "tortsite.sponsors.local.v1";
const REMOTE_URL = process.env.EXPO_PUBLIC_SPONSOR_FEED_URL ?? "";

export type SponsorMap = Partial<Record<SponsorSlotTier, SponsorCreative>>;

async function fetchRemote(): Promise<SponsorMap> {
  if (!REMOTE_URL) return {};
  try {
    const res = await fetch(REMOTE_URL, { cache: "no-store" });
    if (!res.ok) {
      console.log("[Sponsors] remote feed status", res.status);
      return {};
    }
    const json = (await res.json()) as SponsorMap;
    return json ?? {};
  } catch (e) {
    console.log("[Sponsors] remote feed error", e);
    return {};
  }
}

async function loadLocal(): Promise<SponsorMap> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SponsorMap;
  } catch (e) {
    console.log("[Sponsors] local load error", e);
    return {};
  }
}

export const [SponsorConfigProvider, useSponsorConfig] = createContextHook(() => {
  const qc = useQueryClient();
  const [local, setLocal] = useState<SponsorMap>({});
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    loadLocal()
      .then((m) => {
        setLocal(m);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, []);

  const remoteQuery = useQuery({
    queryKey: ["sponsor-feed"],
    queryFn: fetchRemote,
    enabled: REMOTE_URL.length > 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const merged: SponsorMap = useMemo(() => {
    const base: SponsorMap = { ...SPONSOR_CREATIVES };
    const remote = (remoteQuery.data ?? {}) as SponsorMap;
    return { ...base, ...remote, ...local };
  }, [remoteQuery.data, local]);

  const creativeFor = useCallback(
    (tier: SponsorSlotTier): SponsorCreative | undefined => merged[tier],
    [merged],
  );

  const setLocalOverride = useCallback(async (next: SponsorMap) => {
    setLocal(next);
    try {
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch (e) {
      console.log("[Sponsors] save local error", e);
    }
  }, []);

  const clearLocalOverride = useCallback(async () => {
    setLocal({});
    try {
      await AsyncStorage.removeItem(LOCAL_KEY);
    } catch (e) {
      console.log("[Sponsors] clear local error", e);
    }
  }, []);

  const refreshRemote = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["sponsor-feed"] });
  }, [qc]);

  return {
    creatives: merged,
    creativeFor,
    setLocalOverride,
    clearLocalOverride,
    refreshRemote,
    remoteUrl: REMOTE_URL,
    remoteEnabled: REMOTE_URL.length > 0,
    remoteUpdatedAt: remoteQuery.dataUpdatedAt,
    remoteFetching: remoteQuery.isFetching,
    localActive: Object.keys(local).length > 0,
    hydrated,
  };
});
