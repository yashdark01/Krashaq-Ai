"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

export default function ProfileSettingsPage() {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    default_location: "",
    location_details: "",
  })

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      const token = localStorage.getItem("access_token")
      
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfileData(data)
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          default_location: data.default_location || "",
          location_details: data.location_details || "",
        })
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      const token = localStorage.getItem("access_token")
      
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setProfileData(data)
        setSuccess("Profile updated successfully")
      } else {
        const errorData = await response.json()
        setError(errorData.detail || "Failed to update profile")
      }
    } catch (error) {
      setError("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError("New passwords do not match")
      return
    }

    if (passwordData.new_password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsSaving(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      const token = localStorage.getItem("access_token")
      
      const response = await fetch(`${apiUrl}/api/auth/me/password`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      })

      if (response.ok) {
        setSuccess("Password updated successfully")
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        })
      } else {
        const errorData = await response.json()
        setError(errorData.detail || "Failed to update password")
      }
    } catch (error) {
      setError("Failed to update password")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profileData?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_location">Default Location</Label>
                    <Input
                      id="default_location"
                      value={formData.default_location}
                      onChange={(e) => setFormData({ ...formData, default_location: e.target.value })}
                      placeholder="e.g., Delhi, Mumbai, Pune"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location_details">Location Details</Label>
                    <Input
                      id="location_details"
                      value={formData.location_details}
                      onChange={(e) => setFormData({ ...formData, location_details: e.target.value })}
                      placeholder="e.g., coordinates, district, state"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      required
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      required
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      required
                      placeholder="Re-enter new password"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {error && (
            <div className="mt-6 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 p-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md">
              {success}
            </div>
          )}

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/profile"}
            >
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
