import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL
    },
    values: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      DATABASE_URL_HOST: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]
    }
  }

  // Test Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    
    checks.supabase = {
      status: error ? 'ERROR' : 'OK',
      error: error?.message,
      userCount: data?.users?.length
    }
  } catch (error: any) {
    checks.supabase = {
      status: 'ERROR',
      error: error.message
    }
  }

  // Test Database connection
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    await prisma.$connect()
    const tournamentCount = await prisma.tournament.count()
    await prisma.$disconnect()
    
    checks.database = {
      status: 'OK',
      tournamentCount
    }
  } catch (error: any) {
    checks.database = {
      status: 'ERROR',
      error: error.message
    }
  }

  return NextResponse.json(checks, { status: 200 })
}
