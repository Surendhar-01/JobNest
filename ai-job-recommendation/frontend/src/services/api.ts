import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api',
  timeout: 180000,
})

api.interceptors.request.use(async (config) => {
  let token: string | undefined

  if (supabase) {
    try {
      const session = await supabase.auth.getSession()
      token = session?.data.session?.access_token
    } catch {
      // fallback to local storage
    }
  }

  if (!token) {
    token = localStorage.getItem('pathfinder_token') || undefined
  }

  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return 'Please check the entered information.'
    if (!error.response) return 'Cannot reach the backend. Ensure FastAPI is running on port 8001.'
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return (await api.get<T>(path, { params })).data
}
