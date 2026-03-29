"use client";

import { signOut, useSession } from "next-auth/react";
import { Menu, LogOut, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const { setSidebarOpen } = useAppStore();

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" className="rounded-full p-0 h-9 w-9">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="z-50 min-w-[180px] rounded-md border bg-popover p-1 shadow-md"
            >
              <div className="px-3 py-2 border-b mb-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
              <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer hover:bg-accent focus:outline-none">
                <User className="h-4 w-4" />
                Profil
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer text-destructive hover:bg-destructive/10 focus:outline-none"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
