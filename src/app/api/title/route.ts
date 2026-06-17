import { generateTitle } from '@/lib/zhipu';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const title = await generateTitle(message);
    return NextResponse.json({ title });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
