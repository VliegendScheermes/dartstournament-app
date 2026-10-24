/**
 * Shared look for the login and register pages: the darts photo used on the
 * viewer screens, behind a dark veil, with the green/gold club styling of the
 * OBS overlay.
 */

import React from 'react'

/** Input styling shared by every field on these pages */
export const authInputClass =
  'w-full px-4 py-3 bg-[#00351f] border border-[#d4af37]/50 rounded-md text-[#fdf5e6] placeholder-[#fdf5e6]/40 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent'

/** Label styling shared by every field on these pages */
export const authLabelClass =
  'block text-xs font-medium uppercase tracking-[0.12em] text-[#d4af37] mb-2'

/** Primary button styling shared by both pages */
export const authButtonClass =
  'w-full py-3.5 px-4 bg-[#d4af37] hover:bg-[#e8c766] text-[#10240f] font-bold uppercase tracking-[0.14em] ' +
  'rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

interface AuthShellProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-cover bg-center"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0, 0, 0, 0.82), rgba(8, 10, 8, 0.9)), url(/images/background-darts.png)',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      <div className="max-w-md w-full space-y-7">
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-3.5">
            <span className="text-2xl" aria-hidden="true">
              🎯
            </span>
            <span className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">
              Darts Tournament
            </span>
          </div>
          <h1
            className="text-4xl font-bold text-[#fdf5e6] mb-2.5 leading-tight"
            style={{ textShadow: '0 2px 18px rgba(0,0,0,0.8)' }}
          >
            {title}
          </h1>
          <p className="text-[#fdf5e6]/75">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  )
}

/** The form card itself — dark green with a gold edge */
export function AuthCard({ children, ...props }: React.ComponentProps<'form'>) {
  return (
    <form
      {...props}
      className="space-y-5 bg-[#004d30] p-8 rounded-lg border-2 border-[#d4af37] shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
    >
      {children}
    </form>
  )
}

/** Error banner shown above the fields */
export function AuthError({ message }: { message: string }) {
  return (
    <div className="bg-red-950/70 border border-red-400 text-red-100 px-4 py-3 rounded-md text-sm">
      {message}
    </div>
  )
}
