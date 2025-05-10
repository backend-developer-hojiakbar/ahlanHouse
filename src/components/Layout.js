// "use client"

// import { useState, useEffect } from "react"
// import { useNavigate, useLocation } from "react-router-dom"
// import { Search } from "./Search"
// import { UserNav } from "./UserNav"
// import { Button } from "./ui/button"
// import { Menu, X, Sun, Moon, ChevronLeft } from "lucide-react"
// import { useAuth } from "../contexts/AuthContext"
// import { useTheme } from "./theme-provider"
// import { cn } from "../lib/utils"
// import { Sidebar } from "./Sidebar"
// import { CommandMenu } from "./CommandMenu"

// export const Layout = ({ children }) => {
//   const [sidebarOpen, setSidebarOpen] = useState(false)
//   const [scrolled, setScrolled] = useState(false)
//   const [commandOpen, setCommandOpen] = useState(false)
//   const { currentUser } = useAuth()
//   const { theme, setTheme } = useTheme()
//   const navigate = useNavigate()
//   const location = useLocation()

//   // Get the current page title based on the route
//   const getPageTitle = () => {
//     const path = location.pathname

//     if (path === "/") return "Bosh sahifa"
//     if (path.startsWith("/properties")) {
//       if (path === "/properties") return "Obyektlar"
//       if (path === "/properties/add") return "Yangi obyekt qo'shish"
//       if (path.match(/^\/properties\/\d+$/)) return "Obyekt ma'lumotlari"
//     }
//     if (path.startsWith("/apartments")) {
//       if (path === "/apartments") return "Xonadonlar"
//       if (path === "/apartments/add") return "Yangi xonadon qo'shish"
//       if (path.match(/^\/apartments\/\d+$/)) return "Xonadon ma'lumotlari"
//       if (path.match(/^\/apartments\/\d+\/reserve$/)) return "Xonadonni band qilish"
//     }
//     if (path.startsWith("/clients")) {
//       if (path === "/clients") return "Mijozlar"
//       if (path === "/clients/add") return "Yangi mijoz qo'shish"
//       if (path.match(/^\/clients\/\d+$/)) return "Mijoz ma'lumotlari"
//     }
//     if (path === "/documents") return "Hujjatlar"
//     if (path === "/payments") return "To'lovlar"
//     if (path.startsWith("/suppliers")) {
//       if (path === "/suppliers") return "Yetkazib beruvchilar"
//       if (path === "/suppliers/add") return "Yangi yetkazib beruvchi qo'shish"
//       if (path.match(/^\/suppliers\/\d+$/)) return "Yetkazib beruvchi ma'lumotlari"
//     }
//     if (path === "/expenses") return "Xarajatlar"
//     if (path === "/invoices") return "Hisob-fakturalar"
//     if (path === "/reports") return "Hisobotlar"
//     if (path.startsWith("/settings")) {
//       if (path === "/settings") return "Sozlamalar"
//       if (path === "/settings/profile") return "Profil sozlamalari"
//       if (path === "/settings/security") return "Xavfsizlik sozlamalari"
//       if (path === "/settings/notifications") return "Bildirishnomalar sozlamalari"
//       if (path === "/settings/users") return "Foydalanuvchilar boshqaruvi"
//       if (path === "/settings/roles") return "Rollar boshqaruvi"
//       if (path === "/settings/roles/add") return "Yangi rol qo'shish"
//     }

//     return "Ahlan House"
//   }

//   useEffect(() => {
//     const handleScroll = () => {
//       if (window.scrollY > 10) {
//         setScrolled(true)
//       } else {
//         setScrolled(false)
//       }
//     }

//     window.addEventListener("scroll", handleScroll)
//     return () => window.removeEventListener("scroll", handleScroll)
//   }, [])

//   useEffect(() => {
//     const down = (e) => {
//       if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
//         e.preventDefault()
//         setCommandOpen((open) => !open)
//       }
//     }

//     document.addEventListener("keydown", down)
//     return () => document.removeEventListener("keydown", down)
//   }, [])

//   if (!currentUser) {
//     navigate("/login")
//     return null
//   }

//   const toggleTheme = () => {
//     setTheme(theme === "dark" ? "light" : "dark")
//   }

//   const showBackButton = location.pathname !== "/" && !location.pathname.match(/^\/[^/]+$/)

//   return (
//     <div className="flex min-h-screen flex-col">
//       <header className={cn("sticky top-0 z-40 border-b bg-background transition-all", scrolled && "shadow-sm")}>
//         <div className="flex h-16 items-center px-4">
//           <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
//             {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
//           </Button>

//           {showBackButton && (
//             <Button variant="ghost" size="icon" className="mr-2" onClick={() => navigate(-1)} aria-label="Orqaga">
//               <ChevronLeft className="h-5 w-5" />
//             </Button>
//           )}

//           <h1 className="text-xl font-semibold">{getPageTitle()}</h1>

//           <div className="ml-auto flex items-center space-x-4">
//             <Search />
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={toggleTheme}
//               aria-label={theme === "dark" ? "Yorug' rejimga o'tish" : "Qorong'u rejimga o'tish"}
//             >
//               {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
//             </Button>
//             <UserNav />
//           </div>
//         </div>
//       </header>

//       <div className="flex flex-1">
//         {/* Desktop sidebar */}
//         <Sidebar className="hidden md:block" />

//         {/* Mobile sidebar */}
//         {sidebarOpen && (
//           <div className="fixed inset-0 z-40 md:hidden">
//             <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
//             <div className="fixed inset-y-0 left-0 w-64 bg-background p-4 overflow-y-auto">
//               <Sidebar isMobile={true} onClose={() => setSidebarOpen(false)} />
//             </div>
//           </div>
//         )}

//         <main className="flex-1 p-4 md:p-8 transition-all duration-200 ease-in-out">
//           <div className="mx-auto max-w-7xl">{children}</div>
//         </main>
//       </div>

//       <CommandMenu open={commandOpen} setOpen={setCommandOpen} />
//     </div>
//   )
// }

