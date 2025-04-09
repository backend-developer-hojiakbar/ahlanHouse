"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Building, Home, Users, FileText, Settings, BarChart3, CreditCard, DollarSign } from "lucide-react"

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {}

export function MainNav({ className, ...props }: MainNavProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/",
      label: "Bosh sahifa",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/properties",
      label: "Obyektlar",
      icon: Building,
      active: pathname === "/properties" || pathname.startsWith("/properties/"),
    },
    {
      href: "/apartments",
      label: "Xonadonlar",
      icon: Home,
      active: pathname === "/apartments" || pathname.startsWith("/apartments/"),
    },
    {
      href: "/clients",
      label: "Mijozlar",
      icon: Users,
      active: pathname === "/clients" || pathname.startsWith("/clients/"),
    },
    {
      href: "/documents",
      label: "Hujjatlar",
      icon: FileText,
      active: pathname === "/documents" || pathname.startsWith("/documents/"),
    },
    {
      href: "/payments",
      label: "To'lovlar",
      icon: CreditCard,
      active: pathname === "/payments" || pathname.startsWith("/payments/"),
    },
    {
      href: "/suppliers",
      label: "Yetkazib beruvchilar",
      icon: Building,
      active: pathname === "/suppliers" || pathname.startsWith("/suppliers/"),
    },
    {
      href: "/expenses",
      label: "Xarajatlar",
      icon: DollarSign,
      active: pathname === "/expenses" || pathname.startsWith("/expenses/"),
    },
    // {
    //   href: "/invoices",
    //   label: "Hisob-fakturalar",
    //   icon: FileText,
    //   active: pathname === "/invoices" || pathname.startsWith("/invoices/"),
    // },
    {
      href: "/reports",
      label: "Hisobotlar",
      icon: BarChart3,
      active: pathname === "/reports" || pathname.startsWith("/reports/"),
    },
    {
      href: "/settings",
      label: "Sozlamalar",
      icon: Settings,
      active: pathname === "/settings" || pathname.startsWith("/settings/"),
    },
  ]

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            route.active ? "text-primary" : "text-muted-foreground",
          )}
        >
          <route.icon className="mr-2 h-4 w-4" />
          <span className="hidden md:inline-block">{route.label}</span>
        </Link>
      ))}
    </nav>
  )
}

