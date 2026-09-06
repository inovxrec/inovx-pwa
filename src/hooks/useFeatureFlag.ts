import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Known feature flags.
 * Tier-4 "Should" features ship dark (default: false) until enabled via the database.
 */
export type KnownFeatureFlag =
  | 'dark_mode_theme'               // Tier-4: Alternate dark theme token set
  | 'analytics_export'              // Tier-4: CSV/PDF export of command deck metrics
  | 'occasion_engine_auto_spawn'    // Tier-4: Automatic task generation from birthdays/events
  | 'push_notifications_v2'         // Tier-4: Web Push background delivery
  | (string & {});

/**
 * Hardcoded fallbacks when offline or before DB fetch completes.
 * Tier-4 features default to false (shipped dark).
 */
const FALLBACK_FLAGS: Record<string, boolean> = {
  dark_mode_theme: false,
  analytics_export: false,
  occasion_engine_auto_spawn: false,
  push_notifications_v2: false,
};

export interface FeatureFlagState {
  isEnabled: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * React hook to evaluate a feature flag from the Supabase `feature_flags` table.
 * 
 * Includes realtime updates so flags toggled in the DB reflect immediately in the UI.
 * 
 * @example
 * ```tsx
 * const { isEnabled: isDarkThemeEnabled } = useFeatureFlag('dark_mode_theme');
 * if (isDarkThemeEnabled) {
 *   // Render dark theme feature
 * }
 * ```
 */
export function useFeatureFlag(
  flagKey: KnownFeatureFlag,
  defaultOverride?: boolean
): FeatureFlagState {
  const fallback = defaultOverride ?? FALLBACK_FLAGS[flagKey] ?? false;
  const [state, setState] = useState<FeatureFlagState>({
    isEnabled: fallback,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchFlag() {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('is_enabled')
          .eq('key', flagKey)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          setState({
            isEnabled: data ? Boolean(data.is_enabled) : fallback,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setState({
            isEnabled: fallback,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    }

    void fetchFlag();

    // Subscribe to live flag toggles from Supabase Realtime
    const channel = supabase
      .channel(`flag-${flagKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags',
          filter: `key=eq.${flagKey}`,
        },
        (payload) => {
          if (!isMounted) return;
          const newRow = payload.new as { is_enabled?: boolean } | null;
          if (newRow && typeof newRow.is_enabled === 'boolean') {
            setState({
              isEnabled: newRow.is_enabled,
              loading: false,
              error: null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [flagKey, fallback]);

  return state;
}

/**
 * Hook to retrieve all active feature flags as a key-value dictionary.
 */
export function useAllFeatureFlags(): {
  flags: Record<string, boolean>;
  loading: boolean;
  error: Error | null;
} {
  const [flags, setFlags] = useState<Record<string, boolean>>(FALLBACK_FLAGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAllFlags() {
      try {
        const { data, error: queryError } = await supabase
          .from('feature_flags')
          .select('key, is_enabled');

        if (queryError) throw queryError;

        if (isMounted && data) {
          const map = { ...FALLBACK_FLAGS };
          for (const item of data) {
            map[item.key] = Boolean(item.is_enabled);
          }
          setFlags(map);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    }

    void loadAllFlags();

    return () => {
      isMounted = false;
    };
  }, []);

  return { flags, loading, error };
}
