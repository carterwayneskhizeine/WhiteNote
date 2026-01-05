"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Home, Bell, Tag, Network, Settings, PenLine } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LeftSidebar } from "./LeftSidebar"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <>
      {/* Top Header */}
      <div className="desktop:hidden sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md px-4 h-[53px] flex items-center justify-between">
        <Sheet>
          <SheetTrigger asChild>
            <button className="h-8 w-8 rounded-full overflow-hidden">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80%] max-w-[320px] p-0 border-r border-border bg-black">
            <div className="h-full flex flex-col">
              <LeftSidebar isMobile />
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          {/* Logo Placeholder - X uses a small logo in center */}
          <div className="h-6 w-6 bg-foreground rounded-full" />
        </Link>

        {/* Spacer for symmetry or Settings/Sparkle icon space */}
        <div className="w-8" />
      </div>

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
