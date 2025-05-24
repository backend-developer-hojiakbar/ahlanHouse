"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash, Minus, Users, DollarSign, BarChart3, TrendingUp, Building2, Home, Hammer, Wrench, HardHat, Truck, Building, Factory, Warehouse, Construction } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const API_BASE_URL = "http://api.ahlan.uz";

interface UserCreate {
  fio: string;
  phone_number: string;
  address: string;
  balance: string;
  user_type: string;
  password: string;
}

interface User {
  id: number;
  fio: string;
  phone_number: string;
  address: string;
  balance: number;
  kafil_fio: string | null;
  kafil_address: string | null;
  kafil_phone_number: string | null;
  user_type: string;
}

interface CurrentUser {
  fio: string;
  user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}

const FloatingIcons = () => {
  const icons = [
    { Icon: Building2, size: 48 }, { Icon: Home, size: 42 }, { Icon: Hammer, size: 46 },
    { Icon: Wrench, size: 40 }, { Icon: HardHat, size: 48 }, { Icon: Truck, size: 52 },
    { Icon: Building, size: 56 }, { Icon: Factory, size: 48 }, { Icon: Warehouse, size: 46 },
    { Icon: Construction, size: 42 },
  ];

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {icons.map(({ Icon, size }, index) => {
        const duration = 12 + Math.random() * 10;
        const delay = Math.random() * 5;
        const xStart = typeof window !== 'undefined' ? Math.random() * window.innerWidth * 0.8 : 0;
        const yStart = typeof window !== 'undefined' ? Math.random() * window.innerHeight * 0.8 : 0;
        return (
          <motion.div
            key={index}
            className={`absolute drop-shadow-xl`}
            initial={{ x: xStart, y: yStart, scale: 0.8 + Math.random() * 0.6, rotate: Math.random() * 360, opacity: 0.7 + Math.random() * 0.3 }}
            animate={{ x: [xStart, xStart + 80 * Math.sin(index), xStart + 160 * Math.sin(index * 2), xStart], y: [yStart, yStart + 60 * Math.cos(index), yStart - 60 * Math.cos(index * 2), yStart], scale: [1, 1.2, 0.9, 1], rotate: [0, 360], opacity: [0.8, 1, 0.8], filter: ['blur(0.5px) brightness(1)', 'blur(1.5px) brightness(1.2)', 'blur(0.5px) brightness(1)'] }}
            transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut', times: [0, 0.33, 0.66, 1] }}
            style={{ zIndex: 0 }}
          >
            <div className="rounded-full p-3">
              <Icon size={size} className="text-sky-500/30 drop-shadow-lg" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const QarzdorlarPageComponent = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [open, setOpen] = useState(false);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_type: 'naqd' as 'naqd' | 'muddatli' | 'ipoteka',
    description: ''
  });

  const [formData, setFormData] = useState<Omit<UserCreate, 'password'>>({
    fio: "",
    phone_number: "",
    address: "",
    balance: "0",
    user_type: "mijoz",
  });

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [hasPageAccess, setHasPageAccess] = useState<boolean | null>(null);


  const canUserPerformActions = useCallback((user: CurrentUser | null): boolean => {
    if (!user) return false;
    if (user.user_type?.toLowerCase() === 'admin') return true; // Admin har doim huquqqa ega
    
    const userTypeLower = user.user_type?.toLowerCase();
    const fioLower = user.fio?.toLowerCase();

    const isRestrictedRole = userTypeLower === 'sotuvchi' || userTypeLower === 'buxgalter';
    const hasSardorInFio = fioLower?.includes('sardor');
    
    // Agar cheklangan rol YOKI FIOda "sardor" bo'lsa, ruxsat YO'Q (false)
    if (isRestrictedRole || hasSardorInFio) {
        return false;
    }
    // Boshqa barcha holatlarda (masalan, 'mijoz' yoki boshqa noma'lum rol, lekin admin emas)
    // Bu sahifa uchun faqat admin ko'rishi kerak, shuning uchun boshqalarga false qaytaramiz
    return false; 
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        setAccessToken(token);
        const userTypeFromStorage = localStorage.getItem("user_type");
        const userFioFromStorage = localStorage.getItem("user_fio");

        if (userTypeFromStorage && userFioFromStorage) {
          const user = {
            user_type: userTypeFromStorage as CurrentUser['user_type'],
            fio: userFioFromStorage,
          };
          setCurrentUser(user);
          // Sahifani ko'rish uchun ruxsat (faqat admin uchun)
          if (user.user_type?.toLowerCase() === 'admin') {
            setHasPageAccess(true);
          } else {
            setHasPageAccess(false);
            setLoading(false);
            setUsers([]);
            toast.error("Sizda bu sahifani ko'rish uchun ruxsat yo'q.");
          }
        } else {
          setHasPageAccess(false);
          setLoading(false);
          toast.error("Foydalanuvchi ma'lumotlari topilmadi.");
          router.push('/login');
        }
      } else {
        setHasPageAccess(false);
        setLoading(false);
        toast.error("Iltimos tizimga kiring");
        router.push('/login');
      }
    }
  }, [router]);


  const getAuthHeaders = useCallback(() => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  }), [accessToken]);

  const handleAddPayment = async (isNegative: boolean = false) => {
    if (!canUserPerformActions(currentUser)) {
      toast.error("Bu amalni bajarish uchun ruxsatingiz yo'q.");
      return;
    }
    try {
      if (!accessToken || !selectedUser) { toast.error("Iltimos tizimga kiring"); router.push('/login'); return; }
      const amount = isNegative ? (-Math.abs(Number(paymentData.amount))).toString() : paymentData.amount.toString();
      const response = await fetch(`${API_BASE_URL}/user-payments/`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...paymentData, user: selectedUser.id, amount: amount }) });
      if (!response.ok) throw new Error('Network response was not ok');
      toast.success("To'lov muvaffaqiyatli qo'shildi");
      setShowPaymentDialog(false);
      setPaymentData({ amount: '', payment_type: 'naqd', description: '' });
      fetchUsers();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("To'lov qo'shishda xatolik yuz berdi");
    }
  };

  const fetchAllUsers = useCallback(async (page = 1, allUsers: User[] = []): Promise<User[]> => {
    if (!hasPageAccess || typeof window === 'undefined') return []; // Sahifaga kirish huquqi tekshiruvi
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { router.push('/login'); return []; }
      const response = await fetch(`${API_BASE_URL}/users/?limit=100&page=${page}&user_type=mijoz`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!response.ok) {
        if (response.status === 401) { if (typeof window !== 'undefined') localStorage.removeItem('access_token'); router.push('/login'); return []; }
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      const combinedUsers = [...allUsers, ...data.results];
      if (data.next) return fetchAllUsers(page + 1, combinedUsers);
      return combinedUsers;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }, [router, hasPageAccess]);

  const fetchUsers = useCallback(async () => {
    if (!hasPageAccess) { setLoading(false); return; }
    setLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      const debtorUsers = allUsers.filter((user: User) => user.fio && user.fio.includes('(Qarzdor)'));
      setUsers(debtorUsers);
      const initialTotal = debtorUsers.reduce((sum, user) => { const balance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance; return sum + (isNaN(balance) ? 0 : balance); }, 0);
      setTotalAmount(initialTotal);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [fetchAllUsers, hasPageAccess]);

  useEffect(() => {
    if (accessToken && hasPageAccess === true) {
      fetchUsers();
    } else if (hasPageAccess === false) {
      setUsers([]);
      setTotalAmount(0);
      setLoading(false);
    }
  }, [accessToken, hasPageAccess, fetchUsers]);


  const handleDelete = async (userId: number) => {
    if (!canUserPerformActions(currentUser)) {
        toast.error("Bu amalni bajarish uchun ruxsatingiz yo'q.");
        return;
    }
    try {
      if (!accessToken) { toast.error("Iltimos tizimga kiring"); router.push('/login'); return; }
      const response = await fetch(`${API_BASE_URL}/users/${userId}/`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) {
        if (response.status === 401) { if (typeof window !== 'undefined') localStorage.removeItem('access_token'); router.push('/login'); return; }
        throw new Error('Network response was not ok');
      }
      await fetchUsers();
      toast.success("Foydalanuvchi o'chirildi");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Foydalanuvchini o'chirishda xatolik yuz berdi");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUserPerformActions(currentUser)) {
        toast.error("Bu amalni bajarish uchun ruxsatingiz yo'q.");
        return;
    }
    try {
      if (!accessToken) { toast.error("Iltimos tizimga kiring"); router.push('/login'); return; }
      const updatedFormData: UserCreate = {
        fio: `${formData.fio} (Qarzdor)`,
        phone_number: formData.phone_number,
        address: formData.address,
        balance: formData.balance,
        user_type: 'mijoz',
        password: formData.phone_number
      };
      const response = await fetch(`${API_BASE_URL}/users/`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(updatedFormData) });
      if (!response.ok) {
        if (response.status === 401) { if (typeof window !== 'undefined') localStorage.removeItem('access_token'); router.push('/login'); return; }
        throw new Error('Network response was not ok');
      }
      await fetchUsers();
      setOpen(false);
      setFormData({ fio: "", phone_number: "", address: "", balance: "0", user_type: "mijoz" });
      toast.success("Foydalanuvchi muvaffaqiyatli qo'shildi");
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Foydalanuvchini qo'shishda xatolik yuz berdi");
    }
  };

  const filteredUsers = users.filter(user =>
    (user.fio && user.fio.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.phone_number && user.phone_number.includes(searchTerm))
  );

  useEffect(() => {
    const total = filteredUsers.reduce((sum, user) => { const balance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance; return sum + (isNaN(balance) ? 0 : balance); }, 0);
    setTotalAmount(total);
  }, [filteredUsers]);

  if (hasPageAccess === null) {
    return ( <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div></div> );
  }

  if (hasPageAccess === false) {
    return (
      <div className="flex min-h-screen flex-col relative">
        <div className="fixed inset-0 bg-gradient-to-tr from-[#90EE90]/75 via-[#87CEEB]/75 to-[#D3D3D3]/75 dark:from-[#90EE90]/75 dark:via-[#87CEEB]/75 dark:to-[#D3D3D3]/75 opacity-40 -z-10" />
        <FloatingIcons />
        <header className="border-b border-white/10 dark:border-sky-700/10 sticky top-0 z-20 bg-white/5 dark:bg-sky-950/5 backdrop-blur-lg">
          <div className="flex h-16 items-center px-4 container mx-auto">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4"><UserNav /></div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-8 container mx-auto">
          <Card className="bg-white/10 dark:bg-sky-900/10 backdrop-blur-md border border-white/20 dark:border-sky-700/20 p-8 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Ruxsat Yo'q</h2>
            <p className="text-slate-700 dark:text-slate-300">Sizda bu sahifani ko'rish uchun yetarli ruxsat yo'q.</p>
          </Card>
        </main>
        <Toaster />
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col relative">
      <div className="fixed inset-0 bg-gradient-to-tr from-[#90EE90]/75 via-[#87CEEB]/75 to-[#D3D3D3]/75 dark:from-[#90EE90]/75 dark:via-[#87CEEB]/75 dark:to-[#D3D3D3]/75 opacity-40 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-[#90EE90]/75 via-transparent to-transparent dark:from-[#90EE90]/75 opacity-35 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-[#87CEEB]/75 via-transparent to-transparent dark:from-[#87CEEB]/75 opacity-35 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#D3D3D3]/75 via-transparent to-transparent dark:from-[#D3D3D3]/75 opacity-35 -z-10" />
      <div className="fixed top-0 left-0 w-[1000px] h-[1000px] bg-[#90EE90]/75 dark:bg-[#90EE90]/75 rounded-full blur-[100px] opacity-35 -z-10" />
      <div className="fixed bottom-0 right-0 w-[1000px] h-[1000px] bg-[#87CEEB]/75 dark:bg-[#87CEEB]/75 rounded-full blur-[100px] opacity-35 -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#D3D3D3]/75 dark:bg-[#D3D3D3]/75 rounded-full blur-[100px] opacity-35 -z-10" />
      <FloatingIcons />
      <header className="border-b border-white/10 dark:border-sky-700/10 sticky top-0 z-20 bg-white/5 dark:bg-sky-950/5 backdrop-blur-lg">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="text-lg font-semibold mx-4 text-slate-900 dark:text-white">
            Umumiy qarzdorlik: {new Intl.NumberFormat('uz-UZ').format(totalAmount)} $
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {canUserPerformActions(currentUser) && ( // Faqat admin qo'sha oladi
                 <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl">
                    <Plus className="mr-2 h-4 w-4" /> Qarzdor qo'shish
                </Button>
            )}
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-4 p-8 pt-6 relative container mx-auto">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Qarzdorlar</h2>
        </div>
        <div className="space-y-4">
          <Card className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Qarzdor nomi yoki telefon raqami..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10 text-lg font-semibold placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </CardContent>
          </Card>

          {loading ? (
             <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
             </div>
          ) : filteredUsers.length === 0 ? (
            <Card className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10">
                <CardContent className="pt-10 pb-10 text-center">
                    <p className="text-slate-700 dark:text-slate-300">
                        {searchTerm ? "Qidiruvga mos qarzdorlar topilmadi." : "Hozircha qarzdorlar mavjud emas."}
                    </p>
                </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10">
              <CardContent className="pt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 dark:border-sky-700/10">
                      <TableHead className="text-slate-900 dark:text-white text-lg font-bold">F.I.O</TableHead>
                      <TableHead className="text-slate-900 dark:text-white text-lg font-bold">Telefon</TableHead>
                      <TableHead className="text-slate-900 dark:text-white text-lg font-bold">Manzil</TableHead>
                      <TableHead className="text-slate-900 dark:text-white text-lg font-bold">Qarzi</TableHead>
                      {/* Amallar ustuni faqat admin uchun ko'rinadi */}
                      {canUserPerformActions(currentUser) && <TableHead className="text-slate-900 dark:text-white text-lg font-bold text-right">Amallar</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-white/10 dark:border-sky-700/10 hover:bg-white/10 dark:hover:bg-sky-900/10 transition-colors">
                        <TableCell className="text-slate-700 dark:text-slate-300 font-medium">{user.fio}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300">{user.phone_number}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 max-w-xs truncate" title={user.address}>{user.address}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 font-semibold">{user.balance.toLocaleString()} $</TableCell>
                        {/* Amallar tugmalari faqat admin uchun ko'rinadi */}
                        {canUserPerformActions(currentUser) && (
                            <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setShowPaymentDialog(true); }} className="text-sky-500 hover:text-sky-400 hover:bg-sky-500/10" title="Balans operatsiyasi"><Plus className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" title="O'chirish"><Trash className="h-4 w-4" /></Button>
                            </div>
                            </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
           )}
        </div>
      </main>

      {/* Dialoglar ham faqat admin uchun ko'rinadi */}
      {canUserPerformActions(currentUser) && (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md bg-white/10 dark:bg-sky-950/10 backdrop-blur-xl border border-white/20 dark:border-sky-700/20">
            <DialogHeader><DialogTitle className="text-slate-900 dark:text-white">Yangi qarzdor qo'shish</DialogTitle><DialogDescription className="text-slate-700 dark:text-slate-400">Qarzdor ma'lumotlarini kiriting</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                <div className="space-y-1.5"><Label htmlFor="fio-new" className="text-slate-800 dark:text-slate-200">F.I.O</Label><Input id="fio-new" value={formData.fio} onChange={(e) => setFormData({ ...formData, fio: e.target.value })} className="bg-white/20 dark:bg-sky-900/20 border-white/30 dark:border-sky-700/30" required/></div>
                <div className="space-y-1.5"><Label htmlFor="phone-new" className="text-slate-800 dark:text-slate-200">Telefon</Label><Input id="phone-new" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} className="bg-white/20 dark:bg-sky-900/20 border-white/30 dark:border-sky-700/30" required/></div>
                <div className="space-y-1.5"><Label htmlFor="address-new" className="text-slate-800 dark:text-slate-200">Manzil</Label><Input id="address-new" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="bg-white/20 dark:bg-sky-900/20 border-white/30 dark:border-sky-700/30"/></div>
                <div className="space-y-1.5"><Label htmlFor="balance-new" className="text-slate-800 dark:text-slate-200">Qarzi ($)</Label><Input id="balance-new" type="number" value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: e.target.value })} className="bg-white/20 dark:bg-sky-900/20 border-white/30 dark:border-sky-700/30" required/></div>
                </div>
                <DialogFooter className="pt-4 border-t border-white/10 dark:border-sky-700/10">
                    <Button type="button" variant="outline" onClick={()=>setOpen(false)} className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-white/10 dark:border-sky-700/10 text-slate-900 dark:text-white hover:bg-white/10 dark:hover:bg-sky-900/10">Bekor qilish</Button>
                    <Button type="submit" className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl"><Plus className="mr-2 h-4 w-4" />Qo'shish</Button>
                </DialogFooter>
            </form>
            </DialogContent>
        </Dialog>

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="sm:max-w-md bg-white/10 dark:bg-sky-950/10 backdrop-blur-xl border border-white/20 dark:border-sky-700/20">
            <DialogHeader><DialogTitle className="text-slate-900 dark:text-white">Balans operatsiyasi</DialogTitle><DialogDescription className="text-slate-700 dark:text-slate-400">{selectedUser?.fio} uchun to'lov/ayirmani kiriting</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-1.5"><Label htmlFor="amount-payment" className="text-slate-800 dark:text-slate-200">Summa ($)</Label><Input id="amount-payment" type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} className="bg-white/20 dark:bg-sky-900/20 border-white/30 dark:border-sky-700/30" required/></div>
                <div className="space-y-1.5"><Label htmlFor="payment_type-payment" className="text-slate-800 dark:text-slate-200">To'lov turi</Label>
                <Select value={paymentData.payment_type} onValueChange={(value: 'naqd' | 'muddatli' | 'ipoteka') => setPaymentData({ ...paymentData, payment_type: value })}>
                    <SelectTrigger className="bg-white/20 dark:bg-sky-900/20 border-white/30 dark:border-sky-700/30"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white/80 dark:bg-sky-950/80 backdrop-blur-lg border-white/20 dark:border-sky-700/20">
                        <SelectItem value="naqd" className="hover:!bg-sky-500/20 dark:hover:!bg-sky-500/20">Naqd pul</SelectItem>
                        <SelectItem value="muddatli" className="hover:!bg-sky-500/20 dark:hover:!bg-sky-500/20">Muddatli to'lov</SelectItem>
                        <SelectItem value="ipoteka" className="hover:!bg-sky-500/20 dark:hover:!bg-sky-500/20">Ipoteka</SelectItem>
                    </SelectContent>
                </Select>
                </div>
                <div className="space-y-1.5"><Label htmlFor="description-payment" className="text-slate-800 dark:text-slate-200">Izoh</Label><Textarea id="description-payment" value={paymentData.description} onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })} className="bg-white/20 dark:bg-sky-900/20 border-white/30 dark:border-sky-700/30"/></div>
            </div>
            <DialogFooter className="pt-4 border-t border-white/10 dark:border-sky-700/10 flex flex-col sm:flex-row sm:justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-white/10 dark:border-sky-700/10 text-slate-900 dark:text-white hover:bg-white/10 dark:hover:bg-sky-900/10">Bekor qilish</Button>
                <div className="flex gap-2">
                <Button type="button" onClick={() => handleAddPayment(true)} className="bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-xl"><Minus className="mr-2 h-4 w-4" />Ayirish</Button>
                <Button type="button" onClick={() => handleAddPayment(false)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl"><Plus className="mr-2 h-4 w-4" />Qo'shish</Button>
                </div>
            </DialogFooter>
            </DialogContent>
        </Dialog>
      </>
      )}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </div>
  );
};

const QarzdorlarPage = dynamic(() => Promise.resolve(QarzdorlarPageComponent), { ssr: false });

export default QarzdorlarPage;