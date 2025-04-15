"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Plus, Eye, Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Backenddan kelgan ma'lumotlarga mos interfeys
interface Supplier {
  id: number;
  company_name: string;
  contact_person_name: string;
  phone_number: string;
  address: string;
  description: string;
  balance: string; // Backendda "0.00" kabi string sifatida kelmoqda
}

const SuppliersPage = () => {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person_name: "",
    phone_number: "",
    address: "",
    description: "",
  });
  // State for storing the access token
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const API_URL = "http://api.ahlan.uz/suppliers/";

  // Get access token from localStorage on component mount
  useEffect(() => {
    // Make sure this runs only on the client
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        // If no token, redirect to login
        toast({
            title: "Avtorizatsiya xatosi",
            description: "Iltimos, tizimga qaytadan kiring.",
            variant: "destructive",
        });
        router.push("/login"); // Redirect to your login page
      } else {
        setAccessToken(token);
      }
    }
  }, [router]); // Added router to dependency array

  // Helper function to get authorization headers
  const getAuthHeaders = () => {
    if (!accessToken) {
      console.error("Access token is not available for API call");
       if (typeof window !== "undefined") { // Prevent error during SSR/build
         // Optionally check again to prevent unnecessary redirects during initial load
         if (!localStorage.getItem("access_token")) {
             router.push("/login");
         }
       }
      return {}; // Return empty headers or handle error appropriately
    }
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`, // Use the token from state
    };
  };

  // Ma'lumotlarni API dan olish (GET)
  useEffect(() => {
    // Only fetch suppliers if we have an access token
    if (!accessToken) {
      // If token is not yet set (initial render), don't fetch
      // Set loading to false only if we explicitly decide not to fetch due to no token AFTER checking
      if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
           setLoading(false); // No token means no data to load
      }
      return;
    }

    const fetchSuppliers = async () => {
      setLoading(true); // Set loading true when starting fetch
      try {
        const headers = getAuthHeaders();
        // If headers are empty due to missing token (shouldn't happen often here, but as a safeguard)
        if (!headers["Authorization"]) {
            throw new Error("Avtorizatsiya tokeni mavjud emas.");
        }

        const response = await fetch(API_URL, {
          method: "GET",
          headers: headers,
        });

        // Handle potential 401 Unauthorized specifically
        if (response.status === 401) {
            localStorage.removeItem("access_token"); // Remove invalid token
            setAccessToken(null); // Clear token state
            toast({
                title: "Sessiya muddati tugagan",
                description: "Iltimos, tizimga qaytadan kiring.",
                variant: "destructive",
            });
            router.push("/login");
            return; // Stop further execution
        }

        if (!response.ok) throw new Error(`Ma'lumotlarni olishda xatolik: ${response.statusText}`);
        const data = await response.json();

        // API javobidan "results" massivini olish
        if (data && Array.isArray(data.results)) {
          setSuppliers(data.results);
        } else {
          console.error("API dan kutilmagan formatdagi ma'lumot keldi:", data);
          setSuppliers([]);
          toast({ title: "Xatolik", description: "API ma'lumotlari noto'g'ri formatda", variant: "destructive" });
        }
      } catch (error) {
        console.error("Xatolik:", error);
        setSuppliers([]); // Clear suppliers on error
        toast({ title: "Xatolik", description: (error as Error).message || "Ma'lumotlarni yuklashda muammo yuz berdi", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [accessToken, router]); // Add accessToken and router to dependency array

  // Formadagi o'zgarishlarni boshqarish
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Yetkazib beruvchi qo'shish yoki tahrirlash (POST yoki PUT)
  const handleSubmit = async (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    e.preventDefault();
    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
        toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
        return; // Don't submit without token
    }
    try {
      const url = editId ? `${API_URL}${editId}/` : API_URL;
      const method = editId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: headers, // Use the helper function
        body: JSON.stringify({ ...formData, balance: "0.00" }), // Backendga moslashtirildi
      });

       if (response.status === 401) {
            localStorage.removeItem("access_token");
            setAccessToken(null);
            toast({ title: "Sessiya muddati tugagan", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
            router.push("/login");
            return;
        }

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Try to parse error details
          console.error("Saqlash xatosi:", errorData);
          // Try to extract specific error messages from backend
          const errorMessages = Object.values(errorData).flat().join(' ');
          throw new Error(`Saqlashda xatolik: ${response.statusText}. ${errorMessages || ''}`);
      }

      const updatedSupplier = await response.json();

      if (editId) {
        setSuppliers((prev) =>
          prev.map((supplier) => (supplier.id === editId ? updatedSupplier : supplier))
        );
        toast({ title: "Yangilandi", description: "Yetkazib beruvchi muvaffaqiyatli yangilandi" });
      } else {
        // Add new supplier to the beginning of the list
        setSuppliers((prev) => [updatedSupplier, ...prev]);
        toast({ title: "Qo'shildi", description: "Yangi yetkazib beruvchi qo'shildi" });
      }

      // Harakatga qarab keyingi qadamlar
      if (action === "save") {
        resetForm(); // Closes the dialog as well
      } else if (action === "saveAndAdd") {
        // Clear form but keep dialog open
        setFormData({
          company_name: "",
          contact_person_name: "",
          phone_number: "",
          address: "",
          description: "",
        });
        setEditId(null); // Ensure it's in "add new" mode
      } else if (action === "saveAndContinue") {
        // Keep dialog open, update form data with the response, set editId
         setFormData({
            company_name: updatedSupplier.company_name,
            contact_person_name: updatedSupplier.contact_person_name,
            phone_number: updatedSupplier.phone_number,
            address: updatedSupplier.address,
            description: updatedSupplier.description,
         });
        setEditId(updatedSupplier.id);
      }
    } catch (error) {
      console.error("Xatolik:", error);
      toast({ title: "Xatolik", description: (error as Error).message || "Ma'lumotlarni saqlashda muammo yuz berdi", variant: "destructive" });
    }
  };

  // Yetkazib beruvchini o'chirish (DELETE)
  const handleDelete = async (id: number) => {
    const headers = getAuthHeaders();
     if (!headers["Authorization"]) {
        toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
        return; // Don't delete without token
    }
    // Add confirmation dialog before deleting
    if (!confirm(`Rostdan ham ${suppliers.find(s => s.id === id)?.company_name || 'bu yetkazib beruvchini'} o'chirmoqchimisiz?`)) {
        return;
    }

    try {
      const response = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: headers, // Use the helper function
      });

       if (response.status === 401) {
            localStorage.removeItem("access_token");
            setAccessToken(null);
            toast({ title: "Sessiya muddati tugagan", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
            router.push("/login");
            return;
        }

      // Check if delete was successful (status 204 No Content is common for DELETE)
      if (!response.ok && response.status !== 204) {
           const errorData = await response.json().catch(() => ({}));
           console.error("O'chirish xatosi:", errorData);
           throw new Error(`O'chirishda xatolik: ${response.statusText} ${JSON.stringify(errorData)}`);
       }
      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
      toast({ title: "O'chirildi", description: "Yetkazib beruvchi muvaffaqiyatli o'chirildi" });
    } catch (error) {
      console.error("Xatolik:", error);
      toast({ title: "Xatolik", description: (error as Error).message || "O'chirishda muammo yuz berdi", variant: "destructive" });
    }
  };

  // Tahrirlash uchun formani to'ldirish
  const handleEdit = (supplier: Supplier) => {
    setEditId(supplier.id);
    setFormData({
      company_name: supplier.company_name,
      contact_person_name: supplier.contact_person_name,
      phone_number: supplier.phone_number,
      address: supplier.address,
      description: supplier.description,
    });
    setOpen(true); // Open the dialog
  };

  // Formani tozalash va modalni yopish
  const resetForm = () => {
    setFormData({
      company_name: "",
      contact_person_name: "",
      phone_number: "",
      address: "",
      description: "",
    });
    setEditId(null);
    setOpen(false); // Close the dialog
  };

  // Qidiruv bo'yicha filtrlangan yetkazib beruvchilar
  // Check if supplier fields exist before calling toLowerCase
  const filteredSuppliers = suppliers.filter((supplier) =>
    [
      supplier.company_name,
      supplier.contact_person_name,
      supplier.phone_number,
    ].some(
      (field) =>
        field && // Ensure field is not null or undefined
        typeof field === 'string' && // Ensure field is a string
        field.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Helper to format balance
  const formatBalance = (balance: string) => {
      const balanceNum = parseFloat(balance);
      if (isNaN(balanceNum)) {
          return <span className="text-muted-foreground">N/A</span>;
      }
      // Format using Intl.NumberFormat for better locale handling and currency symbol
      const formatter = new Intl.NumberFormat('en-US', { // Or 'us-US' if available and desired
          style: 'currency',
          currency: 'USD', // Assuming USD, change if needed
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
      });

      // Display absolute value and handle sign separately for color
      const formatted = formatter.format(Math.abs(balanceNum));
      if (balanceNum >= 0) {
          // Remove the negative sign if formatter added it for $0.00 edge case
          return <span className="text-green-600">{formatted.replace('-$', '$')}</span>
      } else {
          // Ensure negative sign is present
          return <span className="text-red-600">{formatted.startsWith('$') ? `-${formatted}` : formatted}</span>
      }
  }

  // --- Render ---
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header section */}
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Page Title and Add Button */}
        <div className="flex items-center justify-between space-y-2 flex-wrap gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Yetkazib beruvchilar</h2>
          <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) { // Reset form only when closing
                  resetForm();
              }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Yangi yetkazib beruvchi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editId ? "Yetkazib beruvchini tahrirlash" : "Yangi yetkazib beruvchi"}
                </DialogTitle>
                <DialogDescription>
                  Yetkazib beruvchi ma'lumotlarini kiriting yoki yangilang. Majburiy maydonlar (*) bilan belgilangan.
                </DialogDescription>
              </DialogHeader>
              {/* Form Fields */}
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2 -mx-2">
                <div className="space-y-1.5"> {/* Adjusted spacing */}
                  <Label htmlFor="company_name">Kompaniya nomi *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_person_name">Aloqa shaxsi *</Label>
                  <Input
                    id="contact_person_name"
                    name="contact_person_name"
                    value={formData.contact_person_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone_number">Telefon *</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                    type="tel" // Added type for better mobile experience
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Manzil *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Tavsif (Ixtiyoriy)</Label>
                  <Input // Consider using Textarea for longer descriptions
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>
              {/* Dialog Footer with Action Buttons */}
              <DialogFooter>
                 <Button variant="outline" onClick={resetForm}>Bekor qilish</Button>
                <Button
                  type="button" // Changed from submit to button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "save")}
                  // Basic validation check example
                  disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address}
                >
                  Saqlash
                </Button>
                {/* Show "Save and Add" only when adding new */}
                {!editId && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "saveAndAdd")}
                        disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address}
                    >
                        Saqlash va Yana Qo‘shish
                    </Button>
                )}
                 {/* Show "Save and Continue" only when editing */}
                 {editId && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "saveAndContinue")}
                        disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address}
                    >
                        Saqlash va Tahrirni Davom Ettirish
                    </Button>
                 )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Suppliers Table Card */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {/* Search Input */}
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Kompaniya, shaxs, telefon bo'yicha qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                {/* Clear search button shown only when there is a search term */}
                {searchTerm && (
                    <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}> {/* Made button smaller */}
                        Tozalash
                    </Button>
                )}
              </div>

              {/* Loading State or Table */}
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  {/* You can add a spinner component here */}
                   {/* Example using simple text */}
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-muted-foreground">Yetkazib beruvchilar yuklanmoqda...</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {/* === HYDRATION FIX: Ensure no whitespace between TableRow and TableHead === */}
                      <TableRow>
                        <TableHead>Kompaniya nomi</TableHead>
                        <TableHead>Aloqa shaxsi</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Balans</TableHead>
                        <TableHead className="text-right sticky right-0 bg-background z-[1]">Amallar</TableHead>
                      </TableRow>
                       {/* === END HYDRATION FIX === */}
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map((supplier) => (
                          // === HYDRATION FIX: Ensure no whitespace between TableRow and TableCell ===
                          <TableRow key={supplier.id}>
                            <TableCell className="font-medium">{supplier.company_name}</TableCell>
                            <TableCell>{supplier.contact_person_name}</TableCell>
                            <TableCell>{supplier.phone_number}</TableCell>
                            <TableCell>{formatBalance(supplier.balance)}</TableCell>
                            <TableCell className="text-right sticky right-0 bg-background z-[1]">
                              <div className="flex justify-end space-x-1 md:space-x-2">
                                {/* View Button */}
                               
                                {/* Edit Button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Tahrirlash"
                                  onClick={() => handleEdit(supplier)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {/* Delete Button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  title="O'chirish"
                                  onClick={() => handleDelete(supplier.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          // === END HYDRATION FIX ===
                        ))
                      ) : (
                        // === HYDRATION FIX: Ensure no whitespace between TableRow and TableCell ===
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            {searchTerm ? "Qidiruv natijasi bo'yicha yetkazib beruvchi topilmadi." : "Hozircha yetkazib beruvchilar mavjud emas."}
                          </TableCell>
                        </TableRow>
                         // === END HYDRATION FIX ===
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuppliersPage;