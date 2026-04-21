'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

interface Config {
  llm_provider: string;
  ollama_base_url: string;
  ollama_model: string;
  weather_api_key: string;
  twilio_account_sid: string;
  twilio_whatsapp_number: string;
}

export default function ConfigPanel() {
  const [config, setConfig] = useState<Config>({
    llm_provider: '',
    ollama_base_url: '',
    ollama_model: '',
    weather_api_key: '',
    twilio_account_sid: '',
    twilio_whatsapp_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/api/admin/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async () => {
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/api/admin/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('Configuration updated successfully');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">System Configuration</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>LLM Provider Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="llm_provider">LLM Provider</Label>
            <Input
              id="llm_provider"
              value={config.llm_provider}
              onChange={(e) => setConfig({ ...config, llm_provider: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ollama_base_url">Ollama Base URL</Label>
            <Input
              id="ollama_base_url"
              value={config.ollama_base_url}
              onChange={(e) => setConfig({ ...config, ollama_base_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ollama_model">Ollama Model</Label>
            <Input
              id="ollama_model"
              value={config.ollama_model}
              onChange={(e) => setConfig({ ...config, ollama_model: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weather_api_key">Weather API Key</Label>
            <Input
              id="weather_api_key"
              type="password"
              value={config.weather_api_key}
              onChange={(e) => setConfig({ ...config, weather_api_key: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twilio_account_sid">Twilio Account SID</Label>
            <Input
              id="twilio_account_sid"
              type="password"
              value={config.twilio_account_sid}
              onChange={(e) => setConfig({ ...config, twilio_account_sid: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twilio_whatsapp_number">Twilio WhatsApp Number</Label>
            <Input
              id="twilio_whatsapp_number"
              value={config.twilio_whatsapp_number}
              onChange={(e) => setConfig({ ...config, twilio_whatsapp_number: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={updateConfig} disabled={saving}>
        {saving ? 'Saving...' : 'Save Configuration'}
      </Button>
    </div>
  );
}
