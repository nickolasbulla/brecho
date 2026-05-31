import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile } from '@/lib/supabase';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function updateProfile(updates: Partial<Profile>) {
    if (!userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (!error && data) setProfile(data);
    if (error) throw error;
  }

  return { profile, loading, updateProfile, setProfile, refetch };
}
