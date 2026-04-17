"use client"

import { useEffect } from "react"

export default function AuthCallbackPage() {
  useEffect(() => {
    // Get the authorization code from the URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const error = params.get("error")

    if (error) {
      // Redirect to login page with error
      window.location.href = `/auth/login?error=${encodeURIComponent(error)}`
      return
    }

    if (code) {
      // Redirect to login page with the code
      window.location.href = `/auth/login?code=${code}`
    } else {
      // No code or error, redirect to login
      window.location.href = "/auth/login"
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  )
}
