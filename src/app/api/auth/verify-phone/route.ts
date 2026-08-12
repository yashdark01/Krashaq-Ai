import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      detail:
        'Phone verification is not enabled in the native monolith yet. Use email authentication.',
      code: 'NOT_IMPLEMENTED',
    },
    { status: 501 }
  );
}
