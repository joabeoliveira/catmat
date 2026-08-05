import { NextResponse } from 'next/server'

export async function GET() {
  const grade = typeof globalThis !== 'undefined' ? [] : []
  return NextResponse.json({ items: grade })
}
