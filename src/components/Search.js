// "use client"

// import React, { useState } from "react"
// import { Input } from "./ui/input"
// import { useNavigate } from "react-router-dom"
// import { useData } from "../contexts/DataContext"
// import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command"
// import { Building, Home, User, DollarSign } from "lucide-react"

// export function Search() {
//   const [open, setOpen] = useState(false)
//   const navigate = useNavigate()
//   const { properties, apartments, clients, suppliers, expenses } = useData()

//   React.useEffect(() => {
//     const down = (e) => {
//       if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
//         e.preventDefault()
//         setOpen((open) => !open)
//       }
//     }

//     document.addEventListener("keydown", down)
//     return () => document.removeEventListener("keydown", down)
//   }, [])

//   const handleSelect = (item) => {
//     setOpen(false)

//     if (item.type === "property") {
//       navigate(`/properties/${item.id}`)
//     } else if (item.type === "apartment") {
//       navigate(`/apartments/${item.id}`)
//     } else if (item.type === "client") {
//       navigate(`/clients/${item.id}`)
//     } else if (item.type === "supplier") {
//       navigate(`/suppliers/${item.id}`)
//     } else if (item.type === "expense") {
//       navigate(`/expenses?id=${item.id}`)
//     }
//   }

//   return (
//     <>
//       <div className="relative w-full md:w-auto">
//         <Input
//           type="search"
//           placeholder="Qidirish... (⌘K)"
//           className="md:w-[200px] lg:w-[300px]"
//           onClick={() => setOpen(true)}
//         />
//       </div>

//       <CommandDialog open={open} onOpenChange={setOpen}>
//         <CommandInput placeholder="Qidirish..." />
//         <CommandList>
//           <CommandEmpty>Natija topilmadi.</CommandEmpty>

//           <CommandGroup heading="Obyektlar">
//             {properties.slice(0, 5).map((property) => (
//               <CommandItem
//                 key={`property-${property.id}`}
//                 onSelect={() => handleSelect({ type: "property", id: property.id })}
//               >
//                 <Building className="mr-2 h-4 w-4" />
//                 {property.name}
//               </CommandItem>
//             ))}
//           </CommandGroup>

//           <CommandGroup heading="Xonadonlar">
//             {apartments.slice(0, 5).map((apartment) => (
//               <CommandItem
//                 key={`apartment-${apartment.id}`}
//                 onSelect={() => handleSelect({ type: "apartment", id: apartment.id })}
//               >
//                 <Home className="mr-2 h-4 w-4" />
//                 {apartment.propertyName} - Xonadon {apartment.number}
//               </CommandItem>
//             ))}
//           </CommandGroup>

//           <CommandGroup heading="Mijozlar">
//             {clients.slice(0, 5).map((client) => (
//               <CommandItem key={`client-${client.id}`} onSelect={() => handleSelect({ type: "client", id: client.id })}>
//                 <User className="mr-2 h-4 w-4" />
//                 {client.name}
//               </CommandItem>
//             ))}
//           </CommandGroup>

//           <CommandGroup heading="Yetkazib beruvchilar">
//             {suppliers.slice(0, 5).map((supplier) => (
//               <CommandItem
//                 key={`supplier-${supplier.id}`}
//                 onSelect={() => handleSelect({ type: "supplier", id: supplier.id })}
//               >
//                 <Building className="mr-2 h-4 w-4" />
//                 {supplier.name}
//               </CommandItem>
//             ))}
//           </CommandGroup>

//           <CommandGroup heading="Xarajatlar">
//             {expenses.slice(0, 5).map((expense) => (
//               <CommandItem
//                 key={`expense-${expense.id}`}
//                 onSelect={() => handleSelect({ type: "expense", id: expense.id })}
//               >
//                 <DollarSign className="mr-2 h-4 w-4" />
//                 {expense.propertyName} - ${expense.amount}
//               </CommandItem>
//             ))}
//           </CommandGroup>
//         </CommandList>
//       </CommandDialog>
//     </>
//   )
// }

