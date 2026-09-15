"use client";

import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({ user }) {
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <SidebarMenu>
      <SidebarMenuItem className={isCollapsed ? "flex justify-center" : ""}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className={`text-sidebar-foreground hover:bg-white/5 hover:text-white aria-expanded:bg-white/5 ${
                  isCollapsed ? "justify-center !size-8 !p-0" : ""
                }`}
              />
            }
          >
            <UserAvatar name={user.name} size="sm" className="shrink-0" />
            {!isCollapsed && (
              <>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-montserrat text-xs font-medium text-white">{user.name}</span>
                  <span className="truncate font-montserrat text-[10px] text-sidebar-foreground">{user.role}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end" sideOffset={4} className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
