// "use client"

// import { useLocation, Link } from "react-router-dom"
// import {
//   Building,
//   Home,
//   Users,
//   FileText,
//   CreditCard,
//   Package,
//   DollarSign,
//   FileSpreadsheet,
//   BarChart,
//   Settings,
//   LogOut,
// } from "lucide-react"
// import { useAuth } from "../contexts/AuthContext"
// import { cn } from "../lib/utils"
// import { Button } from "./ui/button"
// import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

// export const Sidebar = ({ isMobile = false, onClose }) => {
//   const { currentUser, logout, isAdmin, isSales, isAccountant } = useAuth()
//   const location = useLocation()

//   const isActive = (path) => {
//     return location.pathname === path || location.pathname.startsWith(`${path}/`)
//   }

//   const handleLogout = () => {
//     logout()
//     if (isMobile && onClose) {
//       onClose()
//     }
//   }

//   const handleLinkClick = () => {
//     if (isMobile && onClose) {
//       onClose()
//     }
//   }

//   return (
//     <div className="h-full flex flex-col border-r bg-background">
//       <div className="p-4 border-b">
//         <div className="flex items-center gap-2">
//           <Avatar className="h-8 w-8">
//             <AvatarImage src="/logo.svg" alt="Ahlan House" />
//             <AvatarFallback>AH</AvatarFallback>
//           </Avatar>
//           <div className="flex flex-col">
//             <span className="text-sm font-semibold">Ahlan House</span>
//             <span className="text-xs text-muted-foreground">Boshqaruv tizimi</span>
//           </div>
//         </div>
//       </div>

//       <div className="flex-1 overflow-auto py-2">
//         <nav className="grid gap-1 px-2">
//           <Link
//             to="/"
//             onClick={handleLinkClick}
//             className={cn(
//               "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//               isActive("/") ? "bg-accent text-accent-foreground" : "transparent",
//             )}
//           >
//             <BarChart className="h-4 w-4" />
//             <span>Bosh sahifa</span>
//           </Link>

//           <Link
//             to="/properties"
//             onClick={handleLinkClick}
//             className={cn(
//               "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//               isActive("/properties") ? "bg-accent text-accent-foreground" : "transparent",
//             )}
//           >
//             <Building className="h-4 w-4" />
//             <span>Obyektlar</span>
//           </Link>

//           <Link
//             to="/apartments"
//             onClick={handleLinkClick}
//             className={cn(
//               "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//               isActive("/apartments") ? "bg-accent text-accent-foreground" : "transparent",
//             )}
//           >
//             <Home className="h-4 w-4" />
//             <span>Xonadonlar</span>
//           </Link>

//           <Link
//             to="/clients"
//             onClick={handleLinkClick}
//             className={cn(
//               "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//               isActive("/clients") ? "bg-accent text-accent-foreground" : "transparent",
//             )}
//           >
//             <Users className="h-4 w-4" />
//             <span>Mijozlar</span>
//           </Link>

//           <Link
//             to="/documents"
//             onClick={handleLinkClick}
//             className={cn(
//               "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//               isActive("/documents") ? "bg-accent text-accent-foreground" : "transparent",
//             )}
//           >
//             <FileText className="h-4 w-4" />
//             <span>Hujjatlar</span>
//           </Link>

//           <Link
//             to="/payments"
//             onClick={handleLinkClick}
//             className={cn(
//               "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//               isActive("/payments") ? "bg-accent text-accent-foreground" : "transparent",
//             )}
//           >
//             <CreditCard className="h-4 w-4" />
//             <span>To'lovlar</span>
//           </Link>

//           {(isAdmin || isAccountant) && (
//             <>
//               <Link
//                 to="/suppliers"
//                 onClick={handleLinkClick}
//                 className={cn(
//                   "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//                   isActive("/suppliers") ? "bg-accent text-accent-foreground" : "transparent",
//                 )}
//               >
//                 <Package className="h-4 w-4" />
//                 <span>Yetkazib beruvchilar</span>
//               </Link>

//               <Link
//                 to="/expenses"
//                 onClick={handleLinkClick}
//                 className={cn(
//                   "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//                   isActive("/expenses") ? "bg-accent text-accent-foreground" : "transparent",
//                 )}
//               >
//                 <DollarSign className="h-4 w-4" />
//                 <span>Xarajatlar</span>
//               </Link>

//               <Link
//                 to="/invoices"
//                 onClick={handleLinkClick}
//                 className={cn(
//                   "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//                   isActive("/invoices") ? "bg-accent text-accent-foreground" : "transparent",
//                 )}
//               >
//                 <FileSpreadsheet className="h-4 w-4" />
//                 <span>Hisob-fakturalar</span>
//               </Link>

//               <Link
//                 to="/reports"
//                 onClick={handleLinkClick}
//                 className={cn(
//                   "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//                   isActive("/reports") ? "bg-accent text-accent-foreground" : "transparent",
//                 )}
//               >
//                 <BarChart className="h-4 w-4" />
//                 <span>Hisobotlar</span>
//               </Link>
//             </>
//           )}

//           {isAdmin && (
//             <Link
//               to="/settings"
//               onClick={handleLinkClick}
//               className={cn(
//                 "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
//                 isActive("/settings") ? "bg-accent text-accent-foreground" : "transparent",
//               )}
//             >
//               <Settings className="h-4 w-4" />
//               <span>Sozlamalar</span>
//             </Link>
//           )}
//         </nav>
//       </div>

//       <div className="mt-auto p-4 border-t">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <Avatar className="h-8 w-8">
//               <AvatarFallback>{currentUser?.name?.charAt(0) || "U"}</AvatarFallback>
//             </Avatar>
//             <div className="flex flex-col">
//               <span className="text-sm font-medium">{currentUser?.name || "Foydalanuvchi"}</span>
//               <span className="text-xs text-muted-foreground">
//                 {currentUser?.role === "admin"
//                   ? "Administrator"
//                   : currentUser?.role === "sales"
//                     ? "Sotuv menejeri"
//                     : currentUser?.role === "accountant"
//                       ? "Buxgalter"
//                       : "Foydalanuvchi"}
//               </span>
//             </div>
//           </div>
//           <Button variant="ghost" size="icon" onClick={handleLogout}>
//             <LogOut className="h-4 w-4" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   )
// }

