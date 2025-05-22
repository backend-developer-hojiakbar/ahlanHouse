"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { User, Phone, Mail, MapPin, Building } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Backenddan kelgan ma'lumotlarga mos interfeys
interface Supplier {
  id: number;
  company_name: string;
  contact_person_name: string;
  phone_number: string;
  email: string;
  address: string;
  description: string;
  balance: string;
}

const SupplierDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = `http://api.ahlan.uz/suppliers/${params.id}/`;

  // API dan yetkazib beruvchi ma'lumotlarini olish
  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(API_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Agar API token talab qilsa: "Authorization": "Bearer YOUR_API_TOKEN",
          },
        });
        if (!response.ok) throw new Error("Ma'lumotlarni olishda xatolik");
        const data = await response.json();
        setSupplier(data);
      } catch (error) {
        console.error("Xatolik:", error);
        toast({ title: "Xatolik", description: "Ma'lumotlarni yuklashda muammo yuz berdi" });
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-center h-[80vh]">
            <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-center h-[80vh]">
            <p className="text-muted-foreground">Yetkazib beruvchi topilmadi</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{supplier.company_name}</h2>
            <p className="text-muted-foreground">Yetkazib beruvchi ma'lumotlari</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push("/suppliers")}>
              <Building className="mr-2 h-4 w-4" />
              Barcha yetkazib beruvchilar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Yetkazib beruvchi ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{supplier.contact_person_name}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{supplier.phone_number}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{supplier.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{supplier.description}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Umumiy ma'lumotlar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Balans</p>
                    {parseFloat(supplier.balance) >= 0 ? (
                      <p className="text-2xl font-bold text-green-600">
                        ${parseFloat(supplier.balance).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-red-600">
                        -${Math.abs(parseFloat(supplier.balance)).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailPage;