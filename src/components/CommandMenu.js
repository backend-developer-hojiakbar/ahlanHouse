// "use client"

// import { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
// import {
//   CommandDialog,
//   CommandInput,
//   CommandList,
//   CommandEmpty,
//   CommandGroup,
//   CommandItem,
//   CommandSeparator,
// } from "./ui/command"
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
// } from "lucide-react"
// import { useAuth } from "../contexts/AuthContext"

// export const CommandMenu = ({ open, setOpen }) => {
//   const navigate = useNavigate()
//   const { isAdmin, isSales, isAccountant } = useAuth()
//   const [searchResults, setSearchResults] = useState([])
//   const [searchQuery, setSearchQuery] = useState("")

//   useEffect(() => {
//     const down = (e) => {
//       if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
//         e.preventDefault()
//         setOpen((open) => !open)
//       }
//     }

//     document.addEventListener("keydown", down)
//     return () => document.removeEventListener("keydown", down)
//   }, [setOpen])

//   const runCommand = (command) => {
//     setOpen(false)
//     command()
//   }

//   const performSearch = (query) => {
//     setSearchQuery(query)

//     if (!query) {
//       setSearchResults([])
//       return
//     }

//     // Simulate search results
//     setTimeout(() => {
//       const results = [
//         { type: "property", id: 1, name: "Navoiy 108K" },
//         { type: "property", id: 2, name: "Navoiy 108L" },
//         { type: "property", id: 3, name: "Baqachorsu" },
//         { type: "apartment", id: 101, name: "Xonadon #101", property: "Navoiy 108K" },
//         { type: "apartment", id: 102, name: "Xonadon #102", property: "Navoiy 108K" },
//         { type: "client", id: 1, name: "Mijoz 1" },
//         { type: "client", id: 2, name: "Mijoz 2" },
//       ].filter(
//         (item) =>
//           item.name.toLowerCase().includes(query.toLowerCase()) ||
//           (item.property && item.property.toLowerCase().includes(query.toLowerCase())),
//       )

//       setSearchResults(results)
//     }, 300)
//   }

//   return (
//     <CommandDialog open={open} onOpenChange={setOpen}>
//       <CommandInput placeholder="Qidiruv..." value={searchQuery} onValueChange={performSearch} />
//       <CommandList>
//         <CommandEmpty>Natija topilmadi.</CommandEmpty>

//         {searchQuery && searchResults.length > 0 ? (
//           <CommandGroup heading="Qidiruv natijalari">
//             {searchResults.map((result) => (
//               <CommandItem
//                 key={`${result.type}-${result.id}`}
//                 onSelect={() =>
//                   runCommand(() => {
//                     if (result.type === "property") {
//                       navigate(`/properties/${result.id}`)
//                     } else if (result.type === "apartment") {
//                       navigate(`/apartments/${result.id}`)
//                     } else if (result.type === "client") {
//                       navigate(`/clients/${result.id}`)
//                     }
//                   })
//                 }
//               >
//                 {result.type === "property" && <Building className="mr-2 h-4 w-4" />}
//                 {result.type === "apartment" && <Home className="mr-2 h-4 w-4" />}
//                 {result.type === "client" && <Users className="mr-2 h-4 w-4" />}
//                 <span>{result.name}</span>
//                 {result.property && <span className="ml-2 text-muted-foreground">({result.property})</span>}
//               </CommandItem>
//             ))}
//           </CommandGroup>
//         ) : (
//           <>
//             <CommandGroup heading="Asosiy">
//               <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
//                 <BarChart className="mr-2 h-4 w-4" />
//                 <span>Bosh sahifa</span>
//               </CommandItem>
//               <CommandItem onSelect={() => runCommand(() => navigate("/properties"))}>
//                 <Building className="mr-2 h-4 w-4" />
//                 <span>Obyektlar</span>
//               </CommandItem>
//               <CommandItem onSelect={() => runCommand(() => navigate("/apartments"))}>
//                 <Home className="mr-2 h-4 w-4" />
//                 <span>Xonadonlar</span>
//               </CommandItem>
//               <CommandItem onSelect={() => runCommand(() => navigate("/clients"))}>
//                 <Users className="mr-2 h-4 w-4" />
//                 <span>Mijozlar</span>
//               </CommandItem>
//             </CommandGroup>

//             <CommandSeparator />

//             <CommandGroup heading="Hujjatlar va to'lovlar">
//               <CommandItem onSelect={() => runCommand(() => navigate("/documents"))}>
//                 <FileText className="mr-2 h-4 w-4" />
//                 <span>Hujjatlar</span>
//               </CommandItem>
//               <CommandItem onSelect={() => runCommand(() => navigate("/payments"))}>
//                 <CreditCard className="mr-2 h-4 w-4" />
//                 <span>To'lovlar</span>
//               </CommandItem>
//             </CommandGroup>

//             {(isAdmin || isAccountant) && (
//               <>
//                 <CommandSeparator />

//                 <CommandGroup heading="Moliya">
//                   <CommandItem onSelect={() => runCommand(() => navigate("/suppliers"))}>
//                     <Package className="mr-2 h-4 w-4" />
//                     <span>Yetkazib beruvchilar</span>
//                   </CommandItem>
//                   <CommandItem onSelect={() => runCommand(() => navigate("/expenses"))}>
//                     <DollarSign className="mr-2 h-4 w-4" />
//                     <span>Xarajatlar</span>
//                   </CommandItem>
//                   <CommandItem onSelect={() => runCommand(() => navigate("/invoices"))}>
//                     <FileSpreadsheet className="mr-2 h-4 w-4" />
//                     <span>Hisob-fakturalar</span>
//                   </CommandItem>
//                   <CommandItem onSelect={() => runCommand(() => navigate("/reports"))}>
//                     <BarChart className="mr-2 h-4 w-4" />
//                     <span>Hisobotlar</span>
//                   </CommandItem>
//                 </CommandGroup>
//               </>
//             )}

//             {isAdmin && (
//               <>
//                 <CommandSeparator />

//                 <CommandGroup heading="Boshqaruv">
//                   <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
//                     <Settings className="mr-2 h-4 w-4" />
//                     <span>Sozlamalar</span>
//                   </CommandItem>
//                   <CommandItem onSelect={() => runCommand(() => navigate("/settings/users"))}>
//                     <Users className="mr-2 h-4 w-4" />
//                     <span>Foydalanuvchilar</span>
//                   </CommandItem>
//                   <CommandItem onSelect={() => runCommand(() => navigate("/settings/roles"))}>
//                     <Users className="mr-2 h-4 w-4" />
//                     <span>Rollar</span>
//                   </CommandItem>
//                 </CommandGroup>
//               </>
//             )}
//           </>
//         )}
//       </CommandList>
//     </CommandDialog>
//   )
// }

