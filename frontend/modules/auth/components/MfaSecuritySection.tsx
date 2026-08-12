'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Shield, ShieldCheck, Copy, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

type SetupState = 'idle' | 'qr' | 'backup' | 'disable';

export function MfaSecuritySection() {
  const { user, fetchWithAuth, refreshProfile } = useAuth();
  const enabled = Boolean(user?.two_factor_enabled);

  const [setupState, setSetupState] = useState<SetupState>('idle');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupRemaining, setBackupRemaining] = useState<number | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenPassword, setRegenPassword] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (enabled && setupState !== 'backup') {
      void (async () => {
        try {
          const res = await fetchWithAuth('/api/auth/2fa/backup-codes/generate');
          if (res.ok) {
            const data = await res.json();
            setBackupRemaining(data.remaining ?? null);
          }
        } catch {
          /* optional */
        }
      })();
    }
  }, [enabled, setupState, fetchWithAuth]);

  const startEnable = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/auth/2fa/enable', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start MFA setup');
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setManualKey(data.manualEntryKey ?? data.secret ?? '');
      setSetupState('qr');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'MFA setup failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/auth/2fa/enable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: confirmCode.replace(/\s/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid verification code');
      setBackupCodes(data.backup_codes ?? []);
      setSetupState('backup');
      setMessage('Two-factor authentication is now enabled.');
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const regenerateBackupCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/auth/2fa/backup-codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: regenPassword,
          code: regenCode.replace(/\s/g, ''),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to regenerate codes');
      setBackupCodes(data.backup_codes ?? []);
      setSetupState('backup');
      setRegenPassword('');
      setRegenCode('');
      setMessage('New backup codes generated. Save them securely.');
      setBackupRemaining(data.backup_codes?.length ?? 10);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed');
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.replace(/\s/g, ''),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to disable MFA');
      setSetupState('idle');
      setDisablePassword('');
      setDisableCode('');
      setBackupCodes([]);
      setMessage('Two-factor authentication disabled.');
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disable failed');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (!backupCodes.length) return;
    void navigator.clipboard.writeText(backupCodes.join('\n'));
    setMessage('Backup codes copied to clipboard.');
  };

  const downloadBackupCodes = () => {
    if (!backupCodes.length) return;
    const blob = new Blob(
      [`Krashaq backup codes — save securely\n\n`, ...backupCodes.map((c) => `${c}\n`)],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'krashaq-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (enabled && setupState !== 'backup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Your account is protected with an authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge variant="outline" className="text-primary border-primary/40">
            2FA enabled
          </Badge>
          {backupRemaining !== null && (
            <p className="text-sm text-muted-foreground">
              Backup codes remaining: <strong>{backupRemaining}</strong>
            </p>
          )}

          <form onSubmit={regenerateBackupCodes} className="space-y-3 border rounded-lg p-4">
            <p className="text-sm font-medium">Regenerate backup codes</p>
            <div className="space-y-2">
              <Label htmlFor="regen-password">Password</Label>
              <Input
                id="regen-password"
                type="password"
                value={regenPassword}
                onChange={(e) => setRegenPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regen-code">Authenticator code</Label>
              <Input
                id="regen-code"
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value)}
                placeholder="6-digit code"
                required
              />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={loading}>
              Generate new backup codes
            </Button>
          </form>

          {setupState === 'disable' ? (
            <form onSubmit={disableMfa} className="space-y-3 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm font-medium text-destructive">Disable 2FA</p>
              <div className="space-y-2">
                <Label htmlFor="disable-password">Password</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disable-code">Authenticator or backup code</Label>
                <Input
                  id="disable-code"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" size="sm" disabled={loading}>
                  Confirm disable
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSetupState('idle')}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30"
              onClick={() => setSetupState('disable')}
            >
              Disable 2FA
            </Button>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
        </CardContent>
      </Card>
    );
  }

  if (setupState === 'backup' && backupCodes.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Save your backup codes
          </CardTitle>
          <CardDescription>
            Each code works once if you lose access to your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted/50 rounded-lg p-4">
            {backupCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyBackupCodes}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={downloadBackupCodes}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setSetupState('idle');
                setBackupCodes([]);
              }}
            >
              Done
            </Button>
          </div>
          {message && <p className="text-sm text-primary">{message}</p>}
        </CardContent>
      </Card>
    );
  }

  if (setupState === 'qr') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Set up authenticator
          </CardTitle>
          <CardDescription>Scan with Google Authenticator, Authy, or similar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCodeDataUrl && (
            <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
              <Image src={qrCodeDataUrl} alt="MFA QR code" width={180} height={180} unoptimized />
            </div>
          )}
          {manualKey && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Manual entry key</p>
              <code className="text-xs break-all bg-muted px-2 py-1 rounded">{manualKey}</code>
            </div>
          )}
          <form onSubmit={confirmEnable} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="mfa-confirm">Enter 6-digit code from app</Label>
              <Input
                id="mfa-confirm"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Verifying…' : 'Enable 2FA'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSetupState('idle')}>
                Cancel
              </Button>
            </div>
          </form>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Add an extra layer of security to your Krashaq account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Use an authenticator app to generate a code at login. You will also receive backup codes
          to use if you lose your phone.
        </p>
        <Button onClick={startEnable} disabled={loading}>
          {loading ? 'Starting…' : 'Enable 2FA'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
