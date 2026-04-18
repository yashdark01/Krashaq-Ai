"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface User {
  id: number
  email: string
  name: string
  default_location: string | null
  role: string
  state?: string | null
  district?: string | null
  tehsil?: string | null
  locality?: string | null
  pincode?: string | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: () => boolean
  isPestisidesSupplier: () => boolean
  login: (code: string) => Promise<void>
  emailLogin: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<void>
}

interface RegisterData {
  email: string
  name: string
  default_location?: string
  location_details?: string
  phone?: string
  state?: string
  district?: string
  tehsil?: string
  locality?: string
  pincode?: string
}

interface SignupData {
  email: string
  name: string
  password: string
  state?: string
  district?: string
  tehsil?: string
  locality?: string
  pincode?: string
  phone?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  const fetchUserProfile = async (token: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser({
          id: data.id,
          email: data.email,
          name: data.name,
          default_location: data.default_location,
          role: data.role,
          state: data.state,
          district: data.district,
          tehsil: data.tehsil,
          locality: data.locality,
          pincode: data.pincode
        })
        localStorage.setItem("user", JSON.stringify({
          id: data.id,
          email: data.email,
          name: data.name,
          default_location: data.default_location,
          role: data.role,
          state: data.state,
          district: data.district,
          tehsil: data.tehsil,
          locality: data.locality,
          pincode: data.pincode
        }))
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Check for existing tokens on mount
    const storedAccessToken = localStorage.getItem("access_token")
    const storedRefreshToken = localStorage.getItem("refresh_token")
    const storedUser = localStorage.getItem("user")
    
    if (storedAccessToken && storedRefreshToken && storedUser) {
      setAccessToken(storedAccessToken)
      setRefreshToken(storedRefreshToken)
      setUser(JSON.parse(storedUser))
      
      // Fetch full user profile
      fetchUserProfile(storedAccessToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (code: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      const response = await fetch(`${apiUrl}/api/auth/google/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        throw new Error("Login failed")
      }

      const data = await response.json()
      // Store user info temporarily for registration
      localStorage.setItem("google_user_info", JSON.stringify(data.user_info))
      localStorage.setItem("google_tokens", JSON.stringify(data.google_tokens))
      
      // Redirect to registration page
      window.location.href = "/auth/register"
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const emailLogin = async (email: string, password: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      const response = await fetch(`${apiUrl}/api/auth/login/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Login failed")
      }

      const data = await response.json()
      
      // Store tokens and user
      setAccessToken(data.access_token)
      setRefreshToken(data.refresh_token)
      setUser(data.user)
      
      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
      localStorage.setItem("user", JSON.stringify(data.user))
      
      // Fetch full user profile
      await fetchUserProfile(data.access_token)
      
      // Redirect to dashboard
      window.location.href = "/"
    } catch (error) {
      console.error("Email login error:", error)
      throw error
    }
  }

  const signup = async (data: SignupData) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Signup failed")
      }

      const result = await response.json()
      
      // Store tokens and user
      setAccessToken(result.access_token)
      setRefreshToken(result.refresh_token)
      setUser(result.user)
      
      localStorage.setItem("access_token", result.access_token)
      localStorage.setItem("refresh_token", result.refresh_token)
      localStorage.setItem("user", JSON.stringify(result.user))
      
      // Fetch full user profile
      await fetchUserProfile(result.access_token)
      
      // Redirect to dashboard
      window.location.href = "/"
    } catch (error) {
      console.error("Signup error:", error)
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const googleUser = JSON.parse(localStorage.getItem("google_user_info") || "{}")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          default_location: data.default_location,
          location_details: data.location_details,
          phone: data.phone,
        }),
      })

      if (!response.ok) {
        throw new Error("Registration failed")
      }

      const result = await response.json()
      
      // Store tokens and user
      setAccessToken(result.access_token)
      setRefreshToken(result.refresh_token)
      setUser(result.user)
      
      localStorage.setItem("access_token", result.access_token)
      localStorage.setItem("refresh_token", result.refresh_token)
      localStorage.setItem("user", JSON.stringify(result.user))
      
      // Fetch full user profile
      await fetchUserProfile(result.access_token)
      
      // Clear temporary Google data
      localStorage.removeItem("google_user_info")
      localStorage.removeItem("google_tokens")
      
      // Redirect to dashboard
      window.location.href = "/"
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      if (refreshToken) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      // Clear local storage regardless of API call success
      setAccessToken(null)
      setRefreshToken(null)
      setUser(null)
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("user")
      localStorage.removeItem("google_user_info")
      localStorage.removeItem("google_tokens")
      
      window.location.href = "/auth/login"
    }
  }

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      throw new Error("No refresh token available")
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      const response = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        throw new Error("Token refresh failed")
      }

      const data = await response.json()
      
      setAccessToken(data.access_token)
      setRefreshToken(data.refresh_token)
      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
    } catch (error) {
      console.error("Token refresh error:", error)
      // If refresh fails, logout the user
      await logout()
      throw error
    }
  }

  const isAdmin = () => {
    return user?.role === "admin"
  }

  const isPestisidesSupplier = () => {
    return user?.role === "pestisides-supplier"
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        isPestisidesSupplier,
        login,
        emailLogin,
        signup,
        register,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
