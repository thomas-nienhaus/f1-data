import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = 'https://aadamscjqrztfuowoyrb.supabase.co';
const SUPABASE_ANON    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZGFtc2NqcXJ6dGZ1b3dveXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzQ1ODQsImV4cCI6MjA5NDA1MDU4NH0.7NJIeDecDS05k_IR4KT9sg_Tf71cQ5E6babVqlyZNoQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth ─────────────────────────────────────────────────────

export async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
  return (await supabase.auth.getUser()).data.user;
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return (await supabase.auth.getUser()).data.user;
}

export async function linkEmail(email, password) {
  await supabase.auth.signOut({ scope: 'local' });
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error('E-mailbevestiging is nog ingeschakeld in Supabase. Zet "Confirm email" uit onder Authentication → Sign In / Up.');
}

export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// ── Lists ────────────────────────────────────────────────────

export async function fetchLists() {
  const { data, error } = await supabase
    .from('wl_lists')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(rowToList);
}

export async function insertList(list) {
  const { data, error } = await supabase
    .from('wl_lists')
    .insert(listToRow(list))
    .select()
    .single();
  if (error) throw error;
  return rowToList(data);
}

export async function updateList(id, changes) {
  const row = {};
  if (changes.name       !== undefined) row.name        = changes.name;
  if (changes.sourceLang !== undefined) row.source_lang = changes.sourceLang;
  if (changes.targetLang !== undefined) row.target_lang = changes.targetLang;
  const { error } = await supabase.from('wl_lists').update(row).eq('id', id);
  if (error) throw error;
}

export async function removeList(id) {
  const { error } = await supabase.from('wl_lists').delete().eq('id', id);
  if (error) throw error;
}

// ── Words ────────────────────────────────────────────────────

export async function fetchWords() {
  const { data, error } = await supabase
    .from('wl_words')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(rowToWord);
}

export async function insertWords(words) {
  if (words.length === 0) return [];
  const { data, error } = await supabase
    .from('wl_words')
    .insert(words.map(wordToRow))
    .select();
  if (error) throw error;
  return data.map(rowToWord);
}

export async function updateWordFields(id, changes) {
  const row = {};
  if (changes.source      !== undefined) row.source      = changes.source;
  if (changes.translation !== undefined) row.translation = changes.translation;
  const { error } = await supabase.from('wl_words').update(row).eq('id', id);
  if (error) throw error;
}

export async function upsertWordSR(word) {
  const { error } = await supabase
    .from('wl_words')
    .update({
      sr_interval:     word.sr.interval,
      sr_ease_factor:  word.sr.easeFactor,
      sr_repetitions:  word.sr.repetitions,
      sr_due_date:     word.sr.dueDate,
      sr_total_correct: word.sr.totalCorrect,
      sr_total_wrong:   word.sr.totalWrong,
      sr_last_studied:  word.sr.lastStudied,
    })
    .eq('id', word.id);
  if (error) throw error;
}

export async function removeWord(id) {
  const { error } = await supabase.from('wl_words').delete().eq('id', id);
  if (error) throw error;
}

// ── Stats ────────────────────────────────────────────────────

export async function fetchStats() {
  const user = await getCurrentUser();
  if (!user) return defaultStats();
  const { data, error } = await supabase
    .from('wl_stats')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStats(data) : defaultStats();
}

export async function upsertStats(stats) {
  const user = await getCurrentUser();
  if (!user) return;
  const { error } = await supabase
    .from('wl_stats')
    .upsert({ user_id: user.id, ...statsToRow(stats) });
  if (error) throw error;
}

// ── Row ↔ App object mapping ─────────────────────────────────

function rowToList(r) {
  return {
    id:         r.id,
    name:       r.name,
    sourceLang: r.source_lang,
    targetLang: r.target_lang,
    createdAt:  new Date(r.created_at).getTime(),
  };
}

function listToRow(l) {
  return {
    id:          l.id,
    name:        l.name,
    source_lang: l.sourceLang || 'Bronwoord',
    target_lang: l.targetLang || 'Vertaling',
  };
}

function rowToWord(r) {
  return {
    id:          r.id,
    listId:      r.list_id,
    source:      r.source,
    translation: r.translation,
    createdAt:   new Date(r.created_at).getTime(),
    sr: {
      interval:     r.sr_interval,
      easeFactor:   parseFloat(r.sr_ease_factor),
      repetitions:  r.sr_repetitions,
      dueDate:      r.sr_due_date,
      totalCorrect: r.sr_total_correct,
      totalWrong:   r.sr_total_wrong,
      lastStudied:  r.sr_last_studied,
    },
  };
}

function wordToRow(w) {
  return {
    id:              w.id,
    list_id:         w.listId,
    source:          w.source,
    translation:     w.translation,
    sr_interval:     w.sr.interval,
    sr_ease_factor:  w.sr.easeFactor,
    sr_repetitions:  w.sr.repetitions,
    sr_due_date:     w.sr.dueDate,
    sr_total_correct: w.sr.totalCorrect,
    sr_total_wrong:   w.sr.totalWrong,
    sr_last_studied:  w.sr.lastStudied ?? null,
  };
}

function rowToStats(r) {
  return {
    streak:          r.streak,
    lastStudyDate:   r.last_study_date,
    allTimeCorrect:  r.all_time_correct,
    allTimeWrong:    r.all_time_wrong,
  };
}

function statsToRow(s) {
  return {
    streak:           s.streak,
    last_study_date:  s.lastStudyDate,
    all_time_correct: s.allTimeCorrect,
    all_time_wrong:   s.allTimeWrong,
  };
}

function defaultStats() {
  return { streak: 0, lastStudyDate: null, allTimeCorrect: 0, allTimeWrong: 0 };
}
