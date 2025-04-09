// "use client"
// import { Link, useLocation } from "react-router-dom"
// import { cn } from "../lib/utils"
// import { Building, Home, Users, FileText, Settings, BarChart3, CreditCard, DollarSign } from "lucide-react"
// import { useAuth } from "../contexts/AuthContext"

// export function MainNav({ className, isMobile = false, ...props }) {
//   const location = useLocation()
//   const { isAdmin, isSales, isAccountant } = useAuth()

//   const routes = [
//     {
//       href: "/",
//       label: "Bosh sahifa",
//       icon: Home,
//       active: location.pathname === "/",
//       roles: ["admin", "sales", "accountant"],
//     },
//     {
//       href: "/properties",
//       label: "Obyektlar",
//       icon: Building,
//       active: location.pathname === "/properties" || location.pathname.startsWith("/properties/"),
//       roles: ["admin", "sales", "accountant"],
//     },
//     {
//       href: "/apartments",
//       label: "Xonadonlar",
//       icon: Home,
//       active: location.pathname === "/apartments" || location.pathname.startsWith("/apartments/"),
//       roles: ["admin", "sales", "accountant"],
//     },
//     {
//       href: "/clients",
//       label: "Mijozlar",
//       icon: Users,
//       active: location.pathname === "/clients" || location.pathname.startsWith("/clients/"),
//       roles: ["admin", "sales", "accountant"],
//     },
//     {
//       href: "/documents",
//       label: "Hujjatlar",
//       icon: FileText,
//       active: location.pathname === "/documents" || location.pathname.startsWith("/documents/"),
//       roles: ["admin", "sales", "accountant"],
//     },
//     {
//       href: "/payments",
//       label: "To'lovlar",
//       icon: CreditCard,
//       active: location.pathname === "/payments" || location.pathname.startsWith("/payments/"),
//       roles: ["admin", "sales", "accountant"],
//     },
//     {
//       href: "/suppliers",
//       label: "Yetkazib beruvchilar",
//       icon: Building,
//       active: location.pathname === "/suppliers" || location.pathname.startsWith("/suppliers/"),
//       roles: ["admin", "accountant"],
//     },
//     {
//       href: "/expenses",
//       label: "Xarajatlar",
//       icon: DollarSign,
//       active: location.pathname === "/expenses" || location.pathname.startsWith("/expenses/"),
//       roles: ["admin", "accountant"],
//     },
//     {
//       href: "/invoices",
//       label: "Hisob-fakturalar",
//       icon: FileText,
//       active: location.pathname === "/invoices" || location.pathname.startsWith("/invoices/"),
//       roles: ["admin", "accountant"],
//     },
//     {
//       href: "/reports",
//       label: "Hisobotlar",
//       icon: BarChart3,
//       active: location.pathname === "/reports" || location.pathname.startsWith("/reports/"),
//       roles: ["admin", "accountant"],
//     },
//     {
//       href: "/settings",
//       label: "Sozlamalar",
//       icon: Settings,
//       active: location.pathname === "/settings" || location.pathname.startsWith("/settings/"),
//       roles: ["admin"],
//     },
//   ]

//   // Filter routes based on user role
//   const filteredRoutes = routes.filter((route) => {
//     if (isAdmin) return route.roles.includes("admin")
//     if (isSales) return route.roles.includes("sales")
//     if (isAccountant) return route.roles.includes("accountant")
//     return false
//   })

//   return (
//     <nav
//       className={cn(
//         isMobile ? "flex flex-col space-y-2 w-full" : "flex items-center space-x-4 lg:space-x-6",
//         className,
//       )}
//       {...props}
//     >
//       {filteredRoutes.map((route) => (
//         <Link
//           key={route.href}
//           to={route.href}
//           className={cn(
//             "flex items-center text-sm font-medium transition-colors hover:text-primary",
//             route.active ? "text-primary" : "text-muted-foreground",
//             isMobile && "py-2",
//           )}
//           onClick={isMobile ? () => document.body.classList.remove("overflow-hidden") : undefined}
//         >
//           <route.icon className="mr-2 h-4 w-4" />
//           <span className={isMobile ? "inline-block" : "hidden md:inline-block"}>{route.label}</span>
//         </Link>
//       ))}
//     </nav>
//   )
// }

