"use client"

import { useState } from "react"
import { Plus, MessageSquare, Settings, Cpu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [conversations] = useState([
    { id: "1", title: "Weather in Delhi", date: "Today" },
    { id: "2", title: "Wheat irrigation advice", date: "Yesterday" },
    { id: "3", title: "Fertilizer for rice", date: "2 days ago" },
  ])

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-muted/40", className)}>
      <div className="p-4">
        <Button className="w-full justify-start gap-2" variant="default">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2 p-2">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Today
          </div>
          {conversations.slice(0, 2).map((conv) => (
            <button
              key={conv.id}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{conv.title}</span>
            </button>
          ))}

          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Previous 7 Days
          </div>
          {conversations.slice(2).map((conv) => (
            <button
              key={conv.id}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{conv.title}</span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2"
            onClick={() => window.location.href = "/profile"}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2"
            onClick={() => window.location.href = "/profile/settings"}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Cpu className="h-4 w-4" />
            LLM Provider
          </Button>
        </div>
      </div>
    </div>
  )
}
