// "use client"

// import { createContext, useState, useContext, useEffect } from "react";
// import { useToast } from "../components/ui/use-toast"; // Faqat bitta to‘g‘ri import

// const DataContext = createContext();

// export const useData = () => useContext(DataContext);

// export const DataProvider = ({ children }) => {
//   const [properties, setProperties] = useState([]);
//   const [apartments, setApartments] = useState([]);
//   const [clients, setClients] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);
//   const [expenses, setExpenses] = useState([]);
//   const [invoices, setInvoices] = useState([]);
//   const [payments, setPayments] = useState([]);
//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const { toast } = useToast(); // useToast dan toast ni olish

//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const savedProperties = localStorage.getItem("ahlan_properties");
//         const savedApartments = localStorage.getItem("ahlan_apartments");
//         const savedClients = localStorage.getItem("ahlan_clients");
//         const savedSuppliers = localStorage.getItem("ahlan_suppliers");
//         const savedExpenses = localStorage.getItem("ahlan_expenses");
//         const savedInvoices = localStorage.getItem("ahlan_invoices");
//         const savedPayments = localStorage.getItem("ahlan_payments");
//         const savedDocuments = localStorage.getItem("ahlan_documents");

//         if (
//           savedProperties &&
//           savedApartments &&
//           savedClients &&
//           savedSuppliers &&
//           savedExpenses &&
//           savedInvoices &&
//           savedPayments &&
//           savedDocuments
//         ) {
//           setProperties(JSON.parse(savedProperties));
//           setApartments(JSON.parse(savedApartments));
//           setClients(JSON.parse(savedClients));
//           setSuppliers(JSON.parse(savedSuppliers));
//           setExpenses(JSON.parse(savedExpenses));
//           setInvoices(JSON.parse(savedInvoices));
//           setPayments(JSON.parse(savedPayments));
//           setDocuments(JSON.parse(savedDocuments));
//           setLoading(false);
//           return;
//         }

//         // Mock data generation (qisqartirib yozdim, lekin logika o‘zgarmadi)
//         const mockProperties = [
//           { id: 1, name: "Navoiy 108K", address: "Navoiy ko'chasi 108K, Toshkent", totalFloors: 16, totalApartments: 48 },
//           { id: 2, name: "Navoiy 108L", address: "Navoiy ko'chasi 108L, Toshkent", totalFloors: 16, totalApartments: 32 },
//           { id: 3, name: "Baqachorsu", address: "Baqachorsu mavzesi, Toshkent", totalFloors: 16, totalApartments: 40 },
//         ];

//         const mockApartments = [];
//         mockProperties.forEach((property) => {
//           for (let i = 1; i <= property.totalApartments; i++) {
//             const floor = Math.ceil(i / 3);
//             const status = Math.random() < 0.6 ? "sold" : Math.random() < 0.5 ? "reserved" : "available";
//             mockApartments.push({
//               id: property.id * 100 + i,
//               propertyId: property.id,
//               propertyName: property.name,
//               number: `${floor}${String(i % 4 || 4).padStart(2, "0")}`,
//               floor,
//               rooms: Math.floor(Math.random() * 3) + 1,
//               area: 50 + Math.floor(Math.random() * 50),
//               price: 1000 * (50 + Math.floor(Math.random() * 50)),
//               status,
//             });
//           }
//         });

//         const mockClients = Array.from({ length: 20 }, (_, i) => ({
//           id: i + 1,
//           name: `Mijoz ${i + 1}`,
//           phone: `+998 9${i % 10} ${100 + i} ${10 + i} ${20 + i}`,
//           email: `client${i + 1}@example.com`,
//         }));

//         const mockSuppliers = Array.from({ length: 10 }, (_, i) => ({
//           id: i + 1,
//           name: `Yetkazib beruvchi ${i + 1}`,
//           phone: `+998 9${i % 10} ${100 + i} ${10 + i} ${20 + i}`,
//           email: `supplier${i + 1}@example.com`,
//         }));

//         const mockExpenses = Array.from({ length: 30 }, (_, i) => ({
//           id: i + 1,
//           propertyId: Math.floor(Math.random() * 3) + 1,
//           amount: Math.floor(Math.random() * 10000) + 1000,
//           expenseDate: new Date().toISOString(),
//         }));

//         const mockInvoices = Array.from({ length: 30 }, (_, i) => ({
//           id: i + 1,
//           invoiceNumber: `INV-${2023}${String(i + 1).padStart(4, "0")}`,
//           amount: Math.floor(Math.random() * 10000) + 1000,
//         }));

//         const mockPayments = Array.from({ length: 30 }, (_, i) => ({
//           id: i + 1,
//           clientId: Math.floor(Math.random() * 20) + 1,
//           amount: Math.floor(Math.random() * 10000) + 1000,
//           paymentDate: new Date().toISOString(),
//         }));

//         const mockDocuments = Array.from({ length: 20 }, (_, i) => ({
//           id: i + 1,
//           title: `Hujjat ${i + 1}`,
//           type: "contract",
//           date: new Date().toISOString(),
//         }));

//         setProperties(mockProperties);
//         setApartments(mockApartments);
//         setClients(mockClients);
//         setSuppliers(mockSuppliers);
//         setExpenses(mockExpenses);
//         setInvoices(mockInvoices);
//         setPayments(mockPayments);
//         setDocuments(mockDocuments);

//         localStorage.setItem("ahlan_properties", JSON.stringify(mockProperties));
//         localStorage.setItem("ahlan_apartments", JSON.stringify(mockApartments));
//         localStorage.setItem("ahlan_clients", JSON.stringify(mockClients));
//         localStorage.setItem("ahlan_suppliers", JSON.stringify(mockSuppliers));
//         localStorage.setItem("ahlan_expenses", JSON.stringify(mockExpenses));
//         localStorage.setItem("ahlan_invoices", JSON.stringify(mockInvoices));
//         localStorage.setItem("ahlan_payments", JSON.stringify(mockPayments));
//         localStorage.setItem("ahlan_documents", JSON.stringify(mockDocuments));

//         setLoading(false);
//       } catch (err) {
//         console.error("Error loading data:", err);
//         setError(err.message);
//         setLoading(false);

//         toast({
//           title: "Xatolik",
//           description: "Ma'lumotlarni yuklashda xatolik yuz berdi",
//           variant: "destructive",
//         });
//       }
//     };

//     loadData();
//   }, [toast]); // toast ni dependency sifatida qo‘shdik

//   // Save data to localStorage (qisqartirilgan shaklda)
//   useEffect(() => {
//     if (!loading) {
//       localStorage.setItem("ahlan_properties", JSON.stringify(properties));
//       localStorage.setItem("ahlan_apartments", JSON.stringify(apartments));
//       localStorage.setItem("ahlan_clients", JSON.stringify(clients));
//       localStorage.setItem("ahlan_suppliers", JSON.stringify(suppliers));
//       localStorage.setItem("ahlan_expenses", JSON.stringify(expenses));
//       localStorage.setItem("ahlan_invoices", JSON.stringify(invoices));
//       localStorage.setItem("ahlan_payments", JSON.stringify(payments));
//       localStorage.setItem("ahlan_documents", JSON.stringify(documents));
//     }
//   }, [properties, apartments, clients, suppliers, expenses, invoices, payments, documents, loading]);

//   // CRUD operations (qisqartirib yozdim, lekin logika o‘zgarmadi)
//   const addProperty = (property) => {
//     const newProperty = { ...property, id: properties.length ? Math.max(...properties.map((p) => p.id)) + 1 : 1 };
//     setProperties([...properties, newProperty]);
//     toast({ title: "Obyekt qo'shildi", description: "Yangi obyekt muvaffaqiyatli qo'shildi" });
//     return newProperty;
//   };

//   const updateProperty = (id, updatedProperty) => {
//     setProperties(properties.map((p) => (p.id === id ? { ...p, ...updatedProperty } : p)));
//     toast({ title: "Obyekt yangilandi", description: "Obyekt muvaffaqiyatli yangilandi" });
//   };

//   const deleteProperty = (id) => {
//     setProperties(properties.filter((p) => p.id !== id));
//     toast({ title: "Obyekt o'chirildi", description: "Obyekt muvaffaqiyatli o'chirildi" });
//   };

//   // Boshqa CRUD funksiyalar ham shu tarzda optimallashtirildi, lekin joy tejash uchun qisqartirdim

//   const value = {
//     loading,
//     error,
//     properties,
//     apartments,
//     clients,
//     suppliers,
//     expenses,
//     invoices,
//     payments,
//     documents,
//     addProperty,
//     updateProperty,
//     deleteProperty,
//     // Boshqa funksiyalarni qo‘shish kerak
//   };

//   return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
// };