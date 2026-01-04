"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home, Search, Bell, Hash, Settings, PenSquare,
  User as UserIcon, MoreHorizontal, Mail, Users,
  Bookmark, List, Briefcase, Zap
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface LeftSidebarProps {
  isMobile?: boolean
}

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Explore", href: "/explore" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Mail, label: "Messages", href: "/messages" },
  { icon: Users, label: "Communities", href: "/communities" },
  { icon: Zap, label: "Premium", href: "/premium" },
  { icon: UserIcon, label: "Profile", href: "/profile" },
  { icon: MoreHorizontal, label: "More", href: "/more" },
]

export function LeftSidebar({ isMobile }: LeftSidebarProps) {
  const pathname = usePathname()

  const UserInfo = () => (
    <div className="flex flex-col px-4 py-2 gap-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="font-bold text-base leading-tight">User Name</span>
        <span className="text-muted-foreground text-sm">@username</span>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground"><span className="font-bold text-foreground">123</span> Following</span>
        <span className="text-muted-foreground"><span className="font-bold text-foreground">45</span> Followers</span>
      </div>
    </div>
  )

  return (
    <aside className={cn(
      "sticky top-0 h-screen flex-col justify-between px-2 py-2",
      isMobile ? "flex w-full overflow-y-auto bg-black" : "hidden lg:flex w-[275px]"
    )}>
      <div className="flex flex-col gap-2">
        {/* Mobile Header */}
        {isMobile && <UserInfo />}

        {/* Logo (Desktop only here, MobileNav has its own) */}
        {!isMobile && (
          <Link href="/" className="flex items-center gap-2 px-4 py-2 w-min hover:bg-secondary/50 rounded-full transition-colors mb-1">
            <div className="h-8 w-8 bg-foreground rounded-full" />
          </Link>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const isHome = item.label === "Home"
            return (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "justify-start gap-5 text-xl h-14 px-4 rounded-full hover:bg-secondary/50 transition-colors w-min lg:w-full",
                  isActive && "font-bold",
                  isMobile && "w-full text-lg"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className={cn("h-7 w-7", isActive && "fill-current")} strokeWidth={isActive ? 3 : 2} />
                  <span>{item.label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>

        <Button size="lg" className="mt-4 rounded-full font-bold text-lg h-14 w-[90%] mx-auto bg-foreground hover:bg-foreground/90 text-background shadow-lg lg:w-full">
          <span>{isMobile ? "Post" : "Post"}</span>
        </Button>
      </div>

      {/* Desktop User Profile at bottom */}
      {!isMobile && (
        <div className="mt-auto mb-4">
          <Button variant="ghost" className="w-full justify-between h-16 rounded-full px-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start text-sm">
                <span className="font-bold">User Name</span>
                <span className="text-muted-foreground">@username</span>
              </div>
            </div>
            <MoreHorizontal className="h-5 w-5 hidden lg:block" />
          </Button>
        </div>
      )}
    </aside>
  )
}
