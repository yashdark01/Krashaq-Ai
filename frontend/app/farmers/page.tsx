'use client';

import { useState, useEffect } from 'react';
import FarmerForm from '@/components/FarmerForm';
import Link from 'next/link';

interface Farmer {
  id: number;
  name: string;
  phone: string;
  location: string | null;
}

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchFarmers = async () => {
    try {
      const res = await fetch('/api/farmers');
      if (!res.ok) throw new Error('Failed to fetch farmers');
      const data = await res.json();
      setFarmers(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch farmers';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const handleFarmerAdded = (farmer: Farmer) => {
    setFarmers((prev) => [...prev, farmer]);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this farmer?')) return;

    try {
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setFarmers((prev) => prev.filter((f) => f.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      alert(message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">👨‍🌾 Farmers</h1>
            <p className="text-gray-600 mt-1">Manage registered farmers and their details</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            ← Back to Chat
          </Link>
        </header>

        {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4">{error}</div>}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Registered Farmers</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add Farmer'}
            </button>
          </div>

          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <FarmerForm onFarmerAdded={handleFarmerAdded} />
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : farmers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No farmers registered yet.
              <br />
              Click "Add Farmer" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Location
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {farmers.map((farmer) => (
                    <tr key={farmer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{farmer.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{farmer.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{farmer.location || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(farmer.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Farmers can also register via WhatsApp by sending a message to the bot.</p>
        </div>
      </div>
    </main>
  );
}
