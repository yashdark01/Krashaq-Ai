import { NextRequest, NextResponse } from 'next/server';
import { buildKrashaqTools } from '@/lib/server/agents/tools';

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-mcp-api-key');
  const expected = process.env.MCP_API_KEY;
  if (expected && apiKey !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tools = buildKrashaqTools({
    location: 'Delhi',
    language: 'en',
    message: '',
  }).map((t) => ({
    name: t.name,
    description: t.description,
  }));

  return NextResponse.json({
    protocol: 'mcp-json',
    version: '1.0',
    server: 'krashaq-agents',
    tools,
  });
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-mcp-api-key');
  const expected = process.env.MCP_API_KEY;
  if (expected && apiKey !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { tool, args, context } = body as {
    tool: string;
    args?: Record<string, unknown>;
    context?: { location?: string; language?: string; message?: string };
  };

  if (!tool) {
    return NextResponse.json({ error: 'tool is required' }, { status: 400 });
  }

  const ctx = {
    location: context?.location ?? 'Delhi',
    language: context?.language ?? 'en',
    message: context?.message ?? '',
  };

  const tools = buildKrashaqTools(ctx);
  const selected = tools.find((t) => t.name === tool);
  if (!selected) {
    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 404 });
  }

  try {
    const output = await (selected as { invoke: (input: Record<string, unknown>) => Promise<unknown> }).invoke(
      args ?? {}
    );
    return NextResponse.json({ tool, output: String(output) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tool invocation failed' },
      { status: 500 }
    );
  }
}
