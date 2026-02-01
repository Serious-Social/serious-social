import { NextRequest, NextResponse } from 'next/server';
import { clearAllMarketData } from '~/lib/kv';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await clearAllMarketData();
  return NextResponse.json({
    success: true,
    message: `Cleared ${result.deletedKeys} keys (recent markets list + cast mappings)`,
  });
}
