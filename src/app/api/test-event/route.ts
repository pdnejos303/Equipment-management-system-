import { NextResponse } from 'next/server';
import { eventEmitter } from '@/lib/eventEmitter';

export async function GET() {
  eventEmitter.emit('update');
  return NextResponse.json({ success: true });
}
