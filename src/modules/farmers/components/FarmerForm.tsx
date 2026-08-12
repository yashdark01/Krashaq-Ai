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

interface FarmerFormProps {
  onFarmerAdded: (farmer: Farmer) => void;
}

export default function FarmerForm({ onFarmerAdded }: FarmerFormProps) {
  const { fetchWithAuth } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('trial');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetchWithAuth('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          location: location.trim() || null,
          subscription_plan: subscriptionPlan,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || 'Failed to register farmer');
      }

      const farmer = await res.json();
      setSuccess(`${farmer.name} registered successfully.`);
      setName('');
      setPhone('');
      setLocation('');
      onFarmerAdded(farmer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-primary/30 bg-accent p-3 text-sm text-primary">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="farmer-name">Full Name *</Label>
        <Input
          id="farmer-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter farmer's name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="farmer-phone">Phone Number *</Label>
        <Input
          id="farmer-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="+91 9876543210"
        />
        <p className="text-xs text-muted-foreground">
          Include country code for WhatsApp (e.g., +91 for India)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="farmer-location">Location / City</Label>
        <Input
          id="farmer-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Delhi, Bhopal"
        />
        <p className="text-xs text-muted-foreground">Used for weather and irrigation advice</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="farmer-plan">Subscription plan to sell</Label>
        <select
          id="farmer-plan"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          value={subscriptionPlan}
          onChange={(e) => setSubscriptionPlan(e.target.value)}
        >
          <option value="trial">Trial — 14 days free</option>
          <option value="basic">Basic — ₹99 / 30 days</option>
          <option value="standard">Standard — ₹249 / 90 days</option>
          <option value="premium">Premium — ₹799 / 365 days</option>
        </select>
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting} disabled={isSubmitting}>
        {isSubmitting ? 'Registering…' : 'Register Farmer'}
      </Button>
    </form>
  );
}
