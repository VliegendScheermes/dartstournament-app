import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
    
    return NextResponse.json({
      success: true,
      message: 'Migrations completed successfully',
      output: stdout,
      errors: stderr
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Migration failed',
      error: error.message,
      output: error.stdout,
      errors: error.stderr
    }, { status: 500 })
  }
}
