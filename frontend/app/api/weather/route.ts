import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get("city")
    
    if (!city) {
      return NextResponse.json(
        { error: "City parameter required" },
        { status: 400 }
      )
    }
    
    const response = await fetch(`http://127.0.0.1:8000/api/weather?city=${encodeURIComponent(city)}`)
    
    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Weather API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    )
  }
}
