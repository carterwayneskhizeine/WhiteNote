"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Moon, Sun, Monitor } from "lucide-react"

export default function SettingsPage() {
  const { setTheme } = useTheme()

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Theme</span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setTheme("system")}>
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
