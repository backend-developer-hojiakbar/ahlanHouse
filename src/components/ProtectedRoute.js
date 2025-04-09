// const ProtectedRoute = ({ children, requiredRole }) => {
//   const token = localStorage.getItem("access_token");

//   if (!token) {
//     return <Navigate to="/login" replace />;
//   }

//   // Token mavjud, ammo roli tekshirish kerak
//   if (requiredRole && !token.includes(requiredRole)) {
//     return <Navigate to="/login" replace />;
//   }

//   return children;
// };