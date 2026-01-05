"use client"

import { Button } from "@/components/ui/button"
import { Home, Bell, Tag, Network, Settings, PenLine } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="desktop:hidden fixed bottom-[70px] right-4 z-50">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-[0_0_10px_rgba(29,155,240,0.5)] bg-primary hover:bg-primary/90 text-white"
        >
          <PenLine className="h-6 w-6" />
        </Button>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="desktop:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-[53px] flex items-center justify-between px-4 pb-[env(safe-area-inset-bottom)]">
        <Link href="/" className="flex flex-col items-center justify-center w-full h-full">
          <Home className={cn("h-7 w-7", isActive("/") ? "fill-foreground" : "text-foreground")} strokeWidth={isActive("/") ? 0 : 2} />
        </Link>

        <Link href="/notifications" className="flex flex-col items-center justify-center w-full h-full">
          <Bell className={cn("h-7 w-7", isActive("/notifications") ? "fill-foreground" : "text-foreground")} strokeWidth={isActive("/notifications") ? 0 : 2} />
        </Link>

        <Link href="/tags" className="flex flex-col items-center justify-center w-full h-full">
          <Tag className={cn("h-7 w-7", isActive("/tags") ? "fill-foreground" : "text-foreground")} strokeWidth={isActive("/tags") ? 0 : 2} />
        </Link>

        <Link href="/graph" className="flex flex-col items-center justify-center w-full h-full">
          <Network className={cn("h-7 w-7", isActive("/graph") ? "stroke-[3px]" : "text-foreground")} />
        </Link>

        <Link href="/settings" className="flex flex-col items-center justify-center w-full h-full">
          <Settings className={cn("h-7 w-7", isActive("/settings") ? "fill-foreground" : "text-foreground")} strokeWidth={isActive("/settings") ? 0 : 2} />
        </Link>
      </div>
    </>
  )
}
