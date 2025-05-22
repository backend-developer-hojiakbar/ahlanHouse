"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ModernCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ModernCard: React.FC<ModernCardProps> = ({ title, value, icon: Icon, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80 rounded-lg p-4"
  >
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className={`bg-gradient-to-br ${color} rounded-full p-2 shadow-xl`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
  </motion.div>
);

interface ModernButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline';
  className?: string;
}

const ModernButton: React.FC<ModernButtonProps> = ({ children, onClick, variant = "default", className }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      "px-4 py-2 rounded-lg font-semibold transition-all duration-300",
      variant === "default" ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl" : "bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10 text-slate-900 dark:text-white hover:bg-white/10 dark:hover:bg-sky-900/10",
      className
    )}
    onClick={onClick}
  >
    {children}
  </motion.button>
);

interface ModernTableProps {
  data: Array<Record<string, string | number>>;
  columns: Array<{ header: string; accessor: string }>;
}

const ModernTable: React.FC<ModernTableProps> = ({ data, columns }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-white/10 dark:border-sky-700/10">
          {columns.map((column, index) => (
            <th key={index} className="px-4 py-2 text-left text-slate-900 dark:text-white font-semibold">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <motion.tr
            key={rowIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: rowIndex * 0.1 }}
            className="border-b border-white/10 dark:border-sky-700/10 hover:bg-white/5 dark:hover:bg-sky-900/5"
          >
            {columns.map((column, colIndex) => (
              <td key={colIndex} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                {row[column.accessor]}
              </td>
            ))}
          </motion.tr>
        ))}
      </tbody>
    </table>
  </div>
);

const FloatingIcons = () => {
  const icons = [
    { Icon: Building2, size: 48 },
    { Icon: Home, size: 42 },
    { Icon: Hammer, size: 46 },
    { Icon: Wrench, size: 40 },
    { Icon: HardHat, size: 48 },
    { Icon: Truck, size: 52 },
    { Icon: Building, size: 56 },
    { Icon: Factory, size: 48 },
    { Icon: Warehouse, size: 46 },
    { Icon: Construction, size: 42 },

 
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {icons.map(({ Icon, size }, index) => {
        const duration = 12 + Math.random() * 10;
        const delay = Math.random() * 5;
        const xStart = Math.random() * window.innerWidth * 0.8;
        const yStart = Math.random() * window.innerHeight * 0.8;
        return (
          <motion.div
            key={index}
            className={`absolute drop-shadow-xl`}
            initial={{
              x: xStart,
              y: yStart,
              scale: 0.8 + Math.random() * 0.6,
              rotate: Math.random() * 360,
              opacity: 0.7 + Math.random() * 0.3,
            }}
            animate={{
              x: [xStart, xStart + 80 * Math.sin(index), xStart + 160 * Math.sin(index * 2), xStart],
              y: [yStart, yStart + 60 * Math.cos(index), yStart - 60 * Math.cos(index * 2), yStart],
              scale: [1, 1.2, 0.9, 1],
              rotate: [0, 360],
              opacity: [0.8, 1, 0.8],
              filter: [
                'blur(0.5px) brightness(1)',
                'blur(1.5px) brightness(1.2)',
                'blur(0.5px) brightness(1)',
              ],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.33, 0.66, 1],
            }}
            style={{
              zIndex: 0,
            }}
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
  if (typeof window === 'undefined') return null;
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_type: 'naqd' as 'naqd' | 'muddatli' | 'ipoteka',
    description: ''
  });

  const [formData, setFormData] = useState({
    fio: "",
    phone_number: "",
    address: "",
    balance: "0",
    user_type: "mijoz",
  });

  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        setAccessToken(token);
      } else {
        toast.error("Iltimos tizimga kiring");
        router.push('/login');
      }
    }
  }, [router]);

  const getAuthHeaders = () => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  });

  const handleAddPayment = async (isNegative: boolean = false) => {
    try {
      if (!accessToken || !selectedUser) {
        toast.error("Iltimos tizimga kiring");
        router.push('/login');
        return;
      }

      const amount = isNegative ? (-Math.abs(Number(paymentData.amount))).toString() : paymentData.amount.toString();

      const response = await fetch(`${API_BASE_URL}/user-payments/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...paymentData,
          user: selectedUser.id,
          amount: amount
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      toast.success("To'lov muvaffaqiyatli qo'shildi");

      setShowPaymentDialog(false);
      setPaymentData({
        amount: '',
        payment_type: 'naqd',
        description: ''
      });
      fetchUsers();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("To'lov qo'shishda xatolik yuz berdi");
    }
  };

  useEffect(() => {
    const initializeUserAndFetchData = async () => {
      if (typeof window === 'undefined') return;

      try {
        if (typeof window === 'undefined') return;
        
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const tokenParts = token.split('.');
        const payload = JSON.parse(typeof window !== 'undefined' ? window.atob(tokenParts[1]) : Buffer.from(tokenParts[1], 'base64').toString());
        const userType = payload.user_type;

        if (userType !== 'admin') {
          router.push('/');
          return;
        }

        await fetchUsers();
      } catch (error) {
        console.error('Error initializing:', error);
        router.push('/login');
      }
    };

    initializeUserAndFetchData();
  }, [router]);

  const fetchAllUsers = async (page = 1, allUsers: User[] = []): Promise<User[]> => {
    if (typeof window === 'undefined') return [];
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return [];
      }

      const response = await fetch(`${API_BASE_URL}/users/?limit=100&page=${page}&user_type=mijoz`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
          }
          router.push('/login');
          return [];
        }
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const combinedUsers = [...allUsers, ...data.results];

      if (data.next) {
        return fetchAllUsers(page + 1, combinedUsers);
      }

      return combinedUsers;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };

  const fetchUsers = async () => {
    try {
      const allUsers = await fetchAllUsers();
      const debtorUsers = allUsers.filter((user: User) => 
        user.fio && user.fio.includes('(Qarzdor)')
      );
      setUsers(debtorUsers);
      // Dastlabki umumiy summani hisoblash
      const initialTotal = debtorUsers.reduce((sum, user) => {
        const balance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
        return sum + (isNaN(balance) ? 0 : balance);
      }, 0);
      setTotalAmount(initialTotal);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      if (!accessToken) {
        toast.error("Iltimos tizimga kiring");
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
          }
          router.push('/login');
          return;
        }
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
    try {
      if (!accessToken) {
        toast.error("Iltimos tizimga kiring");
        router.push('/login');
        return;
      }

      const updatedFormData: UserCreate = {
        fio: `${formData.fio} (Qarzdor)`,
        phone_number: formData.phone_number,
        address: formData.address,
        balance: formData.balance,
        user_type: 'mijoz',
        password: formData.phone_number
      };

      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedFormData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
          }
          router.push('/login');
          return;
        }
        throw new Error('Network response was not ok');
      }

      await fetchUsers();
      setOpen(false);
      setFormData({
        fio: "",
        phone_number: "",
        address: "",
        balance: "0",
        user_type: "mijoz",
      });

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

  // Filtrlangan foydalanuvchilarning umumiy balansini hisoblash
  useEffect(() => {
    const total = filteredUsers.reduce((sum, user) => {
      const balance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
    setTotalAmount(total);
  }, [filteredUsers]);

  return (
    <div className="flex min-h-screen flex-col relative">
      {/* Background gradient with blur */}
      <div className="fixed inset-0 bg-gradient-to-tr from-[#90EE90]/75 via-[#87CEEB]/75 to-[#D3D3D3]/75 dark:from-[#90EE90]/75 dark:via-[#87CEEB]/75 dark:to-[#D3D3D3]/75 opacity-40 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-[#90EE90]/75 via-transparent to-transparent dark:from-[#90EE90]/75 opacity-35 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-[#87CEEB]/75 via-transparent to-transparent dark:from-[#87CEEB]/75 opacity-35 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#D3D3D3]/75 via-transparent to-transparent dark:from-[#D3D3D3]/75 opacity-35 -z-10" />
      
      {/* Blur effects */}
      <div className="fixed top-0 left-0 w-[1000px] h-[1000px] bg-[#90EE90]/75 dark:bg-[#90EE90]/75 rounded-full blur-[100px] opacity-35 -z-10" />
      <div className="fixed bottom-0 right-0 w-[1000px] h-[1000px] bg-[#87CEEB]/75 dark:bg-[#87CEEB]/75 rounded-full blur-[100px] opacity-35 -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#D3D3D3]/75 dark:bg-[#D3D3D3]/75 rounded-full blur-[100px] opacity-35 -z-10" />

      {/* Orqa fon va suzuvchi iconlar */}
      <FloatingIcons />

      {/* Header */}
      <div className="border-b border-white/10 dark:border-sky-700/10">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="text-lg font-semibold mx-4 text-slate-900 dark:text-white">
            Umumiy qarzdorlik: {new Intl.NumberFormat('uz-UZ').format(totalAmount)} $
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl">
              <Plus className="mr-2 h-4 w-4" /> Qarzdor qo'shish
            </Button>
            <UserNav />
          </div>
        </div>
      </div>

      {/* Asosiy kontent */}
      <div className="flex-1 space-y-4 p-8 pt-6 relative">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Qarzdorlar</h2>
        </div>
        <div className="space-y-4">
          <Card className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Qarzdor nomi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10 text-lg font-semibold placeholder:text-lg placeholder:font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10">
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 dark:border-sky-700/10">
                    <TableHead className="text-slate-900 dark:text-white text-lg font-bold">F.I.O</TableHead>
                    <TableHead className="text-slate-900 dark:text-white text-lg font-bold">Telefon</TableHead>
                    <TableHead className="text-slate-900 dark:text-white text-lg font-bold">Manzil</TableHead>
                    <TableHead className="text-slate-900 dark:text-white text-lg font-bold">Qarzi</TableHead>
                    <TableHead className="text-slate-900 dark:text-white text-lg font-bold">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-white/10 dark:border-sky-700/10 hover:bg-white/5 dark:hover:bg-sky-900/5">
                      <TableCell className="text-slate-700 dark:text-slate-300">{user.fio}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{user.phone_number}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{user.address}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{user.balance.toLocaleString()} $</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPaymentDialog(true);
                            }}
                            className="hover:bg-white/10 dark:hover:bg-sky-900/10"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            className="hover:bg-white/10 dark:hover:bg-sky-900/10"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi qarzdor qo'shish</DialogTitle>
            <DialogDescription>
              Qarzdor ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fio" className="text-right">
                  F.I.O
                </Label>
                <Input
                  id="fio"
                  value={formData.fio}
                  onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Telefon
                </Label>
                <Input
                  id="phone"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Manzil
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="balance" className="text-right">
                  Qarzi
                </Label>
                <Input
                  id="balance"
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                Qo'shish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Balans qo'shish</DialogTitle>
            <DialogDescription>
              {selectedUser?.fio} uchun to'lov qo'shish
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Summa
              </Label>
              <Input
                id="amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_type" className="text-right">
                To'lov turi
              </Label>
              <Select 
                value={paymentData.payment_type}
                onValueChange={(value: 'naqd' | 'muddatli' | 'ipoteka') => setPaymentData({ ...paymentData, payment_type: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="naqd">Naqd pul</SelectItem>
                  <SelectItem value="muddatli">Muddatli to'lov</SelectItem>
                  <SelectItem value="ipoteka">Ipoteka</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Izoh
              </Label>
              <Textarea
                id="description"
                value={paymentData.description}
                onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Bekor qilish
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => handleAddPayment(true)}
                variant="destructive"
              >
                <Minus className="mr-2 h-4 w-4" />
                Ayirish
              </Button>
              <Button
                type="button"
                onClick={() => handleAddPayment(false)}
                variant="default"
              >
                <Plus className="mr-2 h-4 w-4" />
                Qo'shish
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
};

const QarzdorlarPage = dynamic(() => Promise.resolve(QarzdorlarPageComponent), { ssr: false });

export default QarzdorlarPage;
