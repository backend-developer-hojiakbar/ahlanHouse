// import { useData } from "../contexts/DataContext"
// import { Avatar, AvatarFallback } from './ui/avatar';
// import { formatCurrency, getInitials } from "../lib/utils"

// export const RecentSales = ({ extended = false }) => {
//   const { apartments, clients } = useData()

//   // Get sold apartments sorted by sold date (newest first)
//   const soldApartments = apartments
//     .filter((apartment) => apartment.status === "sold" && apartment.clientId)
//     .sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate))
//     .slice(0, extended ? 10 : 5)

//   return (
//     <div className="space-y-8">
//       {soldApartments.length > 0 ? (
//         soldApartments.map((apartment) => {
//           const client = clients.find((c) => c.id === apartment.clientId)

//           if (!client) return null

//           return (
//             <div key={apartment.id} className="flex items-center">
//               <Avatar className="h-9 w-9">
//                 <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
//               </Avatar>
//               <div className="ml-4 space-y-1">
//                 <p className="text-sm font-medium leading-none">{client.name}</p>
//                 <p className="text-sm text-muted-foreground">
//                   {apartment.propertyName}, Xonadon #{apartment.number}
//                 </p>
//               </div>
//               <div className="ml-auto font-medium">{formatCurrency(apartment.price)}</div>
//             </div>
//           )
//         })
//       ) : (
//         <div className="text-center text-muted-foreground py-4">Sotuvlar mavjud emas</div>
//       )}
//     </div>
//   )
// }

