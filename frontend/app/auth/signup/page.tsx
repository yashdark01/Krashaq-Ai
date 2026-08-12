'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KrashaqLogo } from '@/modules/common/components/KrashaqLogo';
import { getBrowserApiBaseUrl } from '@/lib/api/base-url';

interface LocationItem {
  id: string;
  name: string;
  type?: string;
  pincode?: string;
}

export default function SignupPage() {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    state: '',
    district: '',
    tehsil: '',
    locality: '',
    pincode: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Location data
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [tehsils, setTehsils] = useState<LocationItem[]>([]);
  const [localities, setLocalities] = useState<LocationItem[]>([]);

  // Loading states
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingTehsils, setIsLoadingTehsils] = useState(false);
  const [isLoadingLocalities, setIsLoadingLocalities] = useState(false);

  const apiBase = getBrowserApiBaseUrl();

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const response = await fetch(`${apiBase}/api/locations/states`);
      if (response.ok) {
        const data = await response.json();
        setStates(data.states);
      }
    } catch (error) {
      console.error('Failed to fetch states:', error);
    } finally {
      setIsLoadingStates(false);
    }
  };

  const fetchDistricts = async (state: string) => {
    if (!state) {
      setDistricts([]);
      return;
    }
    setIsLoadingDistricts(true);
    try {
      const response = await fetch(
        `${apiBase}/api/locations/districts?state=${encodeURIComponent(state)}`
      );
      if (response.ok) {
        const data = await response.json();
        setDistricts(data.districts);
      }
    } catch (error) {
      console.error('Failed to fetch districts:', error);
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const fetchTehsils = async (state: string, district: string) => {
    if (!state || !district) {
      setTehsils([]);
      return;
    }
    setIsLoadingTehsils(true);
    try {
      const response = await fetch(
        `${apiBase}/api/locations/tehsils?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`
      );
      if (response.ok) {
        const data = await response.json();
        setTehsils(data.tehsils);
      }
    } catch (error) {
      console.error('Failed to fetch tehsils:', error);
    } finally {
      setIsLoadingTehsils(false);
    }
  };

  const fetchLocalities = async (state: string, district: string, tehsil: string) => {
    if (!state || !district || !tehsil) {
      setLocalities([]);
      return;
    }
    setIsLoadingLocalities(true);
    try {
      const response = await fetch(
        `${apiBase}/api/locations/localities?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&tehsil=${encodeURIComponent(tehsil)}`
      );
      if (response.ok) {
        const data = await response.json();
        setLocalities(data.localities);
      }
    } catch (error) {
      console.error('Failed to fetch localities:', error);
    } finally {
      setIsLoadingLocalities(false);
    }
  };

  const handleStateChange = (state: string) => {
    setFormData({ ...formData, state, district: '', tehsil: '', locality: '', pincode: '' });
    setDistricts([]);
    setTehsils([]);
    setLocalities([]);
    if (state) fetchDistricts(state);
  };

  const handleDistrictChange = (district: string) => {
    setFormData({ ...formData, district, tehsil: '', locality: '', pincode: '' });
    setTehsils([]);
    setLocalities([]);
    if (district) fetchTehsils(formData.state, district);
  };

  const handleTehsilChange = (tehsil: string) => {
    setFormData({ ...formData, tehsil, locality: '', pincode: '' });
    setLocalities([]);
    if (tehsil) fetchLocalities(formData.state, formData.district, tehsil);
  };

  const handleLocalityChange = (locality: string) => {
    const selectedLocality = localities.find((l) => l.name === locality);
    const pincode = selectedLocality?.pincode || '';
    setFormData({ ...formData, locality, pincode });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate location hierarchy
    if (!formData.state || !formData.district || !formData.tehsil || !formData.locality) {
      setError('Please select all location fields (state, district, tehsil, locality)');
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        state: formData.state,
        district: formData.district,
        tehsil: formData.tehsil,
        locality: formData.locality,
        pincode: formData.pincode,
        phone: formData.phone,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <Card className="w-full max-w-4xl shadow-md animate-fade-in">
        <CardHeader className="text-center pb-2">
          <KrashaqLogo size="md" className="mb-2" />
          <CardTitle className="text-2xl font-display">Create your account</CardTitle>
          <CardDescription>Join Krashaq for AI-powered farming insights</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Re-enter password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                {isLoadingStates ? (
                  <div className="text-sm text-muted-foreground">Loading states...</div>
                ) : (
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District *</Label>
                {isLoadingDistricts ? (
                  <div className="text-sm text-muted-foreground">Loading districts...</div>
                ) : (
                  <select
                    id="district"
                    value={formData.district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    disabled={!formData.state}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select District</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.name}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tehsil">Tehsil *</Label>
                {isLoadingTehsils ? (
                  <div className="text-sm text-muted-foreground">Loading tehsils...</div>
                ) : (
                  <select
                    id="tehsil"
                    value={formData.tehsil}
                    onChange={(e) => handleTehsilChange(e.target.value)}
                    disabled={!formData.district}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Tehsil</option>
                    {tehsils.map((tehsil) => (
                      <option key={tehsil.id} value={tehsil.name}>
                        {tehsil.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="locality">Locality *</Label>
                {isLoadingLocalities ? (
                  <div className="text-sm text-muted-foreground">Loading localities...</div>
                ) : (
                  <select
                    id="locality"
                    value={formData.locality}
                    onChange={(e) => handleLocalityChange(e.target.value)}
                    disabled={!formData.tehsil}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Locality</option>
                    {localities.map((locality) => (
                      <option key={locality.name} value={locality.name}>
                        {locality.name} ({locality.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXX XXXXX"
                />
                <p className="text-xs text-muted-foreground">Required for SMS-based 2FA</p>
              </div>
            </div>

            {error && (
              <div
                className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg"
                role="alert"
              >
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={isLoading} disabled={isLoading}>
              Create account
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Already have an account?</p>
              <button
                type="button"
                onClick={() => (window.location.href = '/auth/login')}
                className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Sign in with Google or Email
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
