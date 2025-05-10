"use client"
import { useLocation, Link } from "react-router-dom"
import {
  Building,
  Home,
  Users,
  FileText,
  CreditCard,
  Package,
  DollarSign,
  FileSpreadsheet,
  BarChart,
  Settings,
  LogOut,
} from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export function AppSidebar({ ...props }) {
  const { currentUser, logout, isAdmin, isSales, isAccountant } = useAuth()
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/logo.svg" alt="Ahlan House" />
            <AvatarFallback>AH</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Ahlan House</span>
            <span className="text-xs text-muted-foreground">Boshqaruv tizimi</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Bosh sahifa">
                  <Link to="/">
                    <BarChart className="mr-2" />
                    <span>Bosh Menu</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/properties")} tooltip="Obyektlar">
                  <Link to="/properties">
                    <Building className="mr-2" />
                    <span>Obyektlar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/apartments")} tooltip="Xonadonlar">
                  <Link to="/apartments">
                    <Home className="mr-2" />
                    <span>Xonadonlar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/clients")} tooltip="Mijozlar">
                  <Link to="/clients">
                    <Users className="mr-2" />
                    <span>Mijozlar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/documents")} tooltip="Hujjatlar">
                  <Link to="/documents">
                    <FileText className="mr-2" />
                    <span>Hujjatlar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/payments")} tooltip="To'lovlar">
                  <Link to="/payments">
                    <CreditCard className="mr-2" />
                    <span>To'lovlar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {(isAdmin || isAccountant) && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/suppliers")} tooltip="Yetkazib beruvchilar">
                      <Link to="/suppliers">
                        <Package className="mr-2" />
                        <span>Yetkazib beruvchilar</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/expenses")} tooltip="Xarajatlar">
                      <Link to="/expenses">
                        <DollarSign className="mr-2" />
                        <span>Xarajatlar</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/invoices")} tooltip="Hisob-fakturalar">
                      <Link to="/invoices">
                        <FileSpreadsheet className="mr-2" />
                        <span>Hisob-fakturalar</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem> */}

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/reports")} tooltip="Hisobotlar">
                      <Link to="/reports">
                        <BarChart className="mr-2" />
                        <span>Hisobotlar</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Sozlamalar">
                    <Link to="/settings">
                      <Settings className="mr-2" />
                      <span>Sozlamalar</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Chiqish">
                  <Button variant="ghost" className="w-full justify-start" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Chiqish</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

