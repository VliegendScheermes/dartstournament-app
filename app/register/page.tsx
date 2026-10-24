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

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.user) {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell title="Bijna klaar" subtitle="Nog één stap">
        <div className="bg-[#004d30] p-8 rounded-lg border-2 border-[#d4af37] shadow-[0_24px_60px_rgba(0,0,0,0.65)] text-center">
          <div className="text-[#d4af37] text-5xl mb-4" aria-hidden="true">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-[#fdf5e6] mb-4">Check je e-mail</h2>
          <p className="text-[#fdf5e6]/80 mb-6">
            We hebben je een bevestigingsmail gestuurd. Klik op de link in die mail om je account te
            activeren.
          </p>
          <Link href="/login" className={`${authButtonClass} inline-block w-auto px-8`}>
            Naar inloggen
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Tournament Manager" subtitle="Maak je account aan">
      <AuthCard onSubmit={handleRegister}>
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
          <p className="mt-1.5 text-xs text-[#fdf5e6]/60">Minimaal 6 tekens</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className={authLabelClass}>
            Wachtwoord herhalen
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={authInputClass}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Account aanmaken...' : 'Account aanmaken'}
        </button>

        <div className="text-center text-sm text-[#fdf5e6]/70">
          Heb je al een account?{' '}
          <Link href="/login" className="text-[#d4af37] hover:text-[#e8c766] font-semibold">
            Log hier in
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
