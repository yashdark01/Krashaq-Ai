'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

interface Farmer {
  id: string;
  name: string;
  phone: string;
  location: string | null;
}

interface FarmerEditFormProps {
  farmer: Farmer;
  onSaved: (farmer: Farmer) => void;
  onCancel: () => void;
}

export default function FarmerEditForm({ farmer, onSaved, onCancel }: FarmerEditFormProps) {
  const { fetchWithAuth } = useAuth();
  const [name, setName] = useState(farmer.name);
  const [location, setLocation] = useState(farmer.location ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetchWithAuth(`/api/farmers/${farmer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || 'Failed to update farmer');
      }

      onSaved(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-secondary/40 p-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="edit-name">Full name</Label>
        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-phone">Phone</Label>
        <Input id="edit-phone" value={farmer.phone} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">Phone cannot be changed here</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-location">Location</Label>
        <Input
          id="edit-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or village"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          Save changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
