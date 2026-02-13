import { createClient } from '@/lib/auth/supabase'

export class ApiClient {
  private async getAuthHeader(): Promise<string | null> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? `Bearer ${session.access_token}` : null
  }

  async fetch<T = any>(path: string, options?: RequestInit): Promise<T> {
    const authHeader = await this.getAuthHeader()

    if (!authHeader) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        ...options?.headers
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }

      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `API error: ${response.statusText}`)
    }

    return response.json()
  }

  async get<T = any>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: 'GET' })
  }

  async post<T = any>(path: string, data: any): Promise<T> {
    return this.fetch<T>(path, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put<T = any>(path: string, data: any): Promise<T> {
    return this.fetch<T>(path, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete<T = any>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
