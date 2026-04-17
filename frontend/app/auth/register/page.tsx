"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
  const { register } = useAuth()
  const [googleUser, setGoogleUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    default_location: "",
    location_details: "",
    phone: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get Google user info from localStorage
    const storedGoogleUser = localStorage.getItem("google_user_info")
    if (storedGoogleUser) {
      const user = JSON.parse(storedGoogleUser)
      setGoogleUser(user)
      setFormData((prev) => ({
        ...prev,
        email: user.email,
        name: user.name,
      }))
    } else {
      // No Google user info, redirect to login
      window.location.href = "/auth/login"
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await register(formData)
    } catch (err) {
      setError("Registration failed. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🌾</div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Set up your Krashaq account for personalized farming insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
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
              <Label htmlFor="default_location">Default Location *</Label>
              <Input
                id="default_location"
                name="default_location"
                type="text"
                value={formData.default_location}
                onChange={handleInputChange}
                required
                placeholder="e.g., Delhi, Mumbai, Pune"
              />
              <p className="text-xs text-muted-foreground">
                This will be used for weather data and farming recommendations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_details">Location Details (Optional)</Label>
              <Input
                id="location_details"
                name="location_details"
                type="text"
                value={formData.location_details}
                onChange={handleInputChange}
                placeholder="e.g., coordinates, district, state"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+91 XXXXX XXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Required for SMS-based 2FA
              </p>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Complete Registration"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("google_user_info")
                  localStorage.removeItem("google_tokens")
                  window.location.href = "/auth/login"
                }}
                className="text-blue-600 hover:underline"
              >
                Cancel and go back to login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
