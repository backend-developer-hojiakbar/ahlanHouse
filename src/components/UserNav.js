// "use client"
// import { useNavigate } from "react-router-dom"
// import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
// import { Button } from "./ui/button"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "./ui/dropdown-menu"
// import { useAuth } from "../contexts/AuthContext"

// export function UserNav() {
//   const navigate = useNavigate()
//   const { currentUser, logout } = useAuth()

//   if (!currentUser) return null

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="relative h-8 w-8 rounded-full">
//           <Avatar className="h-8 w-8">
//             <AvatarImage
//               src={`https://ui-avatars.com/api/?name=${currentUser.name}&background=random`}
//               alt={currentUser.name}
//             />
//             <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
//           </Avatar>
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent className="w-56" align="end" forceMount>
//         <DropdownMenuLabel className="font-normal">
//           <div className="flex flex-col space-y-1">
//             <p className="text-sm font-medium leading-none">{currentUser.name}</p>
//             <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
//           </div>
//         </DropdownMenuLabel>
//         <DropdownMenuSeparator />
//         <DropdownMenuGroup>
//           <DropdownMenuItem onClick={() => navigate("/settings/profile")}>Profil</DropdownMenuItem>
//           <DropdownMenuItem onClick={() => navigate("/settings")}>Sozlamalar</DropdownMenuItem>
//           <DropdownMenuItem onClick={() => navigate("/settings/notifications")}>Bildirishnomalar</DropdownMenuItem>
//         </DropdownMenuGroup>
//         <DropdownMenuSeparator />
//         <DropdownMenuItem onClick={logout}>Chiqish</DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   )
// }

