import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
let _offlineWarned = false

function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && url !== 'your_supabase_url' && key !== 'your_supabase_anon_key')
}

function getClient(): SupabaseClient {
  if (_client) return _client

  if (!isConfigured()) {
    if (!_offlineWarned) {
      console.warn(
        '⚠️  数据库未配置 — 运行在离线模式。\n' +
        '   基础页面可正常浏览，CRUD 操作暂不可用。\n' +
        '   配置方法: 编辑 .env.local，设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
        '   本地部署: docker-compose up -d postgres'
      )
      _offlineWarned = true
    }
    // Return a noop mock that returns empty data for all queries
    return createNoopClient()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  _client = createClient(url, key)
  return _client
}

/**
 * Noop client for offline mode.
 * All queries return { data: null/[], error: null } so the UI renders empty states.
 */
function createNoopClient(): SupabaseClient {
  const noopPromise = Promise.resolve({ data: null, error: null })
  const noopListPromise = Promise.resolve({ data: [], error: null })

  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    is: () => builder,
    in: () => builder,
    contains: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => noopPromise,
    maybeSingle: () => noopPromise,
    then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
  }

  // Chainable: all methods return the builder, terminal methods return noop
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
      if (prop === 'from') return () => builder
      if (prop === 'rpc') return () => noopPromise
      if (prop === 'auth') return { getUser: () => noopPromise, getSession: () => noopPromise }
      if (prop in builder) return builder[prop as keyof typeof builder]
      return () => builder
    },
  }

  return new Proxy({}, handler) as unknown as SupabaseClient
}

// Proxy that lazily initializes the Supabase client.
function createLazyClient(): SupabaseClient {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      const client = getClient()
      const value = (client as unknown as Record<string, unknown>)[prop]
      if (typeof value === 'function') {
        return value.bind(client)
      }
      return value
    },
  }

  return new Proxy({}, handler) as unknown as SupabaseClient
}

export const supabase: SupabaseClient = createLazyClient()
