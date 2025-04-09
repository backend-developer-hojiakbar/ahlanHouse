// "use client"

// import { createContext, useState, useContext, useEffect } from "react";
// import { useRouter } from "next/navigation"; // Next.js uchun useRouter
// import { useToast } from "../components/ui/use-toast"; // To‘g‘ri import

// const AuthContext = createContext();

// export const useAuth = () => useContext(AuthContext);

// export const AuthProvider = ({ children }) => {
//   const [currentUser, setCurrentUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter(); // useNavigate o‘rniga useRouter
//   const { toast } = useToast(); // useToast hookidan toast ni olish

//   useEffect(() => {
//     // Check if user is already logged in
//     const user = localStorage.getItem("ahlan_user");
//     if (user) {
//       setCurrentUser(JSON.parse(user));
//     }
//     setLoading(false);
//   }, []);

//   const login = (email, password) => {
//     return new Promise((resolve, reject) => {
//       // Simulate API call
//       setTimeout(() => {
//         if (
//           (email === "admin@ahlanhouse.uz" && password === "admin123") ||
//           (email === "sales@ahlanhouse.uz" && password === "sales123") ||
//           (email === "accountant@ahlanhouse.uz" && password === "account123")
//         ) {
//           let role = "admin";
//           if (email === "sales@ahlanhouse.uz") role = "sales";
//           if (email === "accountant@ahlanhouse.uz") role = "accountant";

//           const user = {
//             email,
//             role,
//             name: role === "admin" ? "Administrator" : role === "sales" ? "Sales Manager" : "Accountant",
//           };

//           setCurrentUser(user);
//           localStorage.setItem("ahlan_user", JSON.stringify(user));

//           toast({
//             title: "Muvaffaqiyatli kirish",
//             description: "Tizimga muvaffaqiyatli kirdingiz",
//           });

//           resolve(user);
//         } else {
//           reject(new Error("Invalid email or password"));
//         }
//       }, 1000);
//     });
//   };

//   const logout = () => {
//     setCurrentUser(null);
//     localStorage.removeItem("ahlan_user");
//     router.push("/login"); // navigate o‘rniga router.push

//     toast({
//       title: "Chiqish",
//       description: "Tizimdan muvaffaqiyatli chiqdingiz",
//     });
//   };

//   const value = {
//     currentUser,
//     login,
//     logout,
//     isAdmin: currentUser?.role === "admin",
//     isSales: currentUser?.role === "sales",
//     isAccountant: currentUser?.role === "accountant",
//   };

//   return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
// };