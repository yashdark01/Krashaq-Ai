'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, CheckCircle2, XCircle } from 'lucide-react';

interface AdminConfig {
  llm_provider: string;
  groq_model: string;
  gemini_model: string;
  llm_fallback_chain: string[];
  langsmith_tracing: boolean;
  langsmith_project: string;
  agent_runtime: string;
  services: Record<string, boolean>;
  note: string;
}

function ServiceRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span>{label}</span>
      {ok ? (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Configured
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <XCircle className="h-3 w-3" /> Not set
        </Badge>
      )}
    </div>
  );
}

export default function ConfigPanel() {
  const { fetchWithAuth } = useAuth();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/admin/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [fetchWithAuth]);

  if (loading) {
    return <div className="flex justify-center py-8 text-muted-foreground">Loading configuration…</div>;
  }

  if (!config) {
    return <div className="text-destructive py-8">Failed to load configuration</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">System configuration</h2>
      </div>

      <p className="text-sm text-muted-foreground">{config.note}</p>

      <Card>
        <CardHeader>
          <CardTitle>LLM & agent</CardTitle>
          <CardDescription>Active provider and models from environment</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Provider: <strong className="capitalize">{config.llm_provider}</strong>
          </p>
          <p>
            Groq model: <code className="text-xs bg-muted px-1 rounded">{config.groq_model}</code>
          </p>
          <p>
            Gemini model: <code className="text-xs bg-muted px-1 rounded">{config.gemini_model}</code>
          </p>
          <p>
            Agent runtime: <strong>{config.agent_runtime}</strong>
          </p>
          <p>
            Fallback chain: {config.llm_fallback_chain.join(' → ')}
          </p>
          <p>
            LangSmith:{' '}
            {config.langsmith_tracing ? (
              <Badge variant="default">Tracing on · {config.langsmith_project}</Badge>
            ) : (
              <Badge variant="outline">Off</Badge>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service connectivity</CardTitle>
          <CardDescription>Whether required env keys are present (values are never shown)</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ServiceRow label="MongoDB" ok={config.services.mongodb} />
          <ServiceRow label="Redis" ok={config.services.redis} />
          <ServiceRow label="SMTP (email)" ok={config.services.smtp} />
          <ServiceRow label="Weather API" ok={config.services.weather} />
          <ServiceRow label="Groq API" ok={config.services.groq} />
          <ServiceRow label="Google / Gemini API" ok={config.services.google} />
          <ServiceRow label="OpenAI API" ok={config.services.openai} />
          <ServiceRow label="Anthropic API" ok={config.services.anthropic} />
          <ServiceRow label="Tavily search" ok={config.services.tavily} />
          <ServiceRow label="LangSmith" ok={config.services.langsmith} />
        </CardContent>
      </Card>
    </div>
  );
}
