'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/auth/supabase'
import {
  AuthShell,
  AuthCard,
  AuthError,
  authInputClass,
  authLabelClass,
  authButtonClass,
} from '@/components/auth/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (data.session) {
        router.push('/')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Tournament Manager" subtitle="Meld je aan om verder te gaan">
      <AuthCard onSubmit={handleLogin}>
        {error && <AuthError message={error} />}

        <div>
          <label htmlFor="email" className={authLabelClass}>
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={authInputClass}
            placeholder="jij@voorbeeld.nl"
          />
        </div>

        <div>
          <label htmlFor="password" className={authLabelClass}>
            Wachtwoord
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={authInputClass}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Bezig met inloggen...' : 'Inloggen'}
        </button>

        <div className="text-center text-sm text-[#fdf5e6]/70">
          Nog geen account?{' '}
          <Link href="/register" className="text-[#d4af37] hover:text-[#e8c766] font-semibold">
            Maak er hier een
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
