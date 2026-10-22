import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { get } from '../services/api'
import type { Profile } from '../types'

interface SessionLike {
  user: {
    id: string
    email?: string
  }
  access_token?: string
}

interface AuthState {
  session: Session | SessionLike | null
  profile: Profile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const Context = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | SessionLike | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cache = useQueryClient()

  async function refresh() {
    try {
      const p = await get<Profile>('/users/me')
      setProfile(p)
      if (!session) {
        setSession({ user: { id: p.id, email: p.email } })
      }
      setError(null)
    } catch (e) {
      // Check if local token exists
      const localToken = localStorage.getItem('pathfinder_token')
      if (localToken) {
        try {
          const p = await get<Profile>('/users/me')
          setProfile(p)
          setSession({ user: { id: p.id, email: p.email } })
          setError(null)
          return
        } catch {
          // Token expired or server unreachable
        }
      }
      setError(e instanceof Error ? e.message : 'Profile unavailable')
    }
  }

  useEffect(() => {
    let alive = true

    async function initAuth() {
      // 1. If Supabase configured, check Supabase session
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession()
          if (alive && data.session) {
            setSession(data.session)
            setLoading(false)
            return
          }
        } catch {
          // ignore
        }
      }

      // 2. Check local storage token
      const localToken = localStorage.getItem('pathfinder_token')
      if (localToken) {
        try {
          const p = await get<Profile>('/users/me')
          if (alive) {
            setProfile(p)
            setSession({ user: { id: p.id, email: p.email }, access_token: localToken })
            setLoading(false)
            return
          }
        } catch {
          localStorage.removeItem('pathfinder_token')
          localStorage.removeItem('pathfinder_user')
        }
      }

      if (alive) {
        setLoading(false)
      }
    }

    initAuth()

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, next) => {
        if (alive) {
          setSession(next)
          setProfile(null)
          setError(null)
          cache.clear()
        }
      })
      return () => {
        alive = false
        data.subscription.unsubscribe()
      }
    }

    return () => {
      alive = false
    }
  }, [cache])

  useEffect(() => {
    if (session) {
      let alive = true
      get<Profile>('/users/me')
        .then((p) => {
          if (alive) setProfile(p)
        })
        .catch(() => {
          if (alive) setError('Profile unavailable. Check backend connection.')
        })
      return () => {
        alive = false
      }
    }
  }, [session])

  async function logout() {
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('pathfinder_token')
    localStorage.removeItem('pathfinder_user')
    setSession(null)
    setProfile(null)
    cache.clear()
  }

  return (
    <Context.Provider value={{ session, profile, loading, error, refresh, logout }}>
      {children}
    </Context.Provider>
  )
}

export function useAuth() {
  const value = useContext(Context)
  if (!value) throw new Error('AuthProvider missing')
  return value
}
