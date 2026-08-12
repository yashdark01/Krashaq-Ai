import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { formatZodErrors } from './common';

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { detail: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          detail: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: formatZodErrors(result.error),
        },
        { status: 422 }
      ),
    };
  }

  return { success: true, data: result.data };
}

export function parseQuery<T>(searchParams: URLSearchParams, schema: ZodSchema<T>): ParseResult<T> {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          detail: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: formatZodErrors(result.error),
        },
        { status: 422 }
      ),
    };
  }
  return { success: true, data: result.data };
}
