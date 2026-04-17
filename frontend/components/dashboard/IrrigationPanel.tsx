"use client"

import { Droplets, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface IrrigationPanelProps {
  lastIrrigation?: string
  nextIrrigation?: string
  urgency?: "low" | "medium" | "high"
}

export function IrrigationPanel({ 
  lastIrrigation = "2 days ago", 
  nextIrrigation = "Tomorrow morning",
  urgency = "medium"
}: IrrigationPanelProps) {
  const urgencyConfig = {
    low: { color: "bg-green-500", text: "Low Priority" },
    medium: { color: "bg-yellow-500", text: "Medium Priority" },
    high: { color: "bg-red-500", text: "High Priority" }
  }

  const config = urgencyConfig[urgency]

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Irrigation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Irrigation</span>
            <span className="text-sm font-medium">{lastIrrigation}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Next Scheduled</span>
            <span className="text-sm font-medium">{nextIrrigation}</span>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant={urgency === "high" ? "destructive" : "secondary"}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {config.text}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
