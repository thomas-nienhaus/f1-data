// Minimal Supabase stub voor unit tests
function makeQuery(result = { data: [], error: null }) {
  const q = {
    select: () => q,
    insert: () => q,
    update: () => q,
    delete: () => q,
    upsert: () => q,
    eq: () => q,
    order: () => q,
    maybeSingle: async () => result,
    single: async () => result,
    then: (res) => Promise.resolve(result).then(res),
  };
  return q;
}

export function createClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInAnonymously: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      updateUser: async () => ({ error: null }),
      signInWithOtp: async () => ({ error: null }),
    },
    from: () => makeQuery(),
  };
}
