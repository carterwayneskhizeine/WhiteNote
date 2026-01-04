"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LeftSidebar } from "./LeftSidebar"

export function MobileNav() {
  return (
    <div className="lg:hidden sticky top-0 z-40 border-b bg-background/95 backdrop-blur px-4 h-14 flex items-center justify-between">
      <Sheet>
        <SheetTrigger asChild>
          <button className="h-8 w-8 rounded-full overflow-hidden">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[80%] p-0 border-r border-border bg-background">
          <div className="h-full flex flex-col">
            <LeftSidebar isMobile />
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/" className="absolute left-1/2 -translate-x-1/2">
        <div className="h-7 w-7 bg-foreground rounded-full" />
      </Link>

      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Settings className="h-5 w-5" />
      </Button>
    </div>
  )
}
