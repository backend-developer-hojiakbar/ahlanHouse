"use client"

import type React from "react" // type importi yaxshi amaliyot
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
// toast importini o'zgartirdim, agar sizning "@/hooks/use-toast" custom hook bo'lsa,
// u holda shunday qoldirishingiz mumkin. Agar react-hot-toast bo'lsa,
// import toast from 'react-hot-toast'; kabi bo'ladi.
// Hozircha sizning kodingizdagi kabi qoldiraman.
import { toast as showToast } from "@/hooks/use-toast" // "toast" nomini "showToast" ga o'zgartirdim, chunki global toast bilan chalkashishi mumkin
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// JWT decode qilish uchun kutubxona (agar hali o'rnatmagan bo'lsangiz, o'rnating: npm install jwt-decode)
import { jwtDecode } from "jwt-decode";

// Decoded token uchun interfeys (payload tuzilishiga mos kelishi kerak)
interface DecodedToken {
  token_type: string;
  exp: number;
  iat: number;
  jti: string;
  user_id: number;
  user_type: string; // Sizning CustomTokenObtainPairSerializer'ingizdagi maydon
  fio: string;       // Sizning CustomTokenObtainPairSerializer'ingizdagi maydon
  // Boshqa maydonlar bo'lsa, shu yerga qo'shing
}


export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    phone_number: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("http://api.ahlan.uz/login/", { // Sizning API URLingiz
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: formData.phone_number,
          password: formData.password,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        // Agar `data.detail` mavjud bo'lmasa, serverdan boshqa xatolik kelgan bo'lishi mumkin.
        // Masalan, `data.phone_number` yoki `data.password` kabi.
        // Ularni ham ko'rsatish logikasini qo'shish mumkin.
        let errorMessage = "Telefon raqami yoki parol noto‘g‘ri";
        if (data && data.detail) {
            errorMessage = data.detail;
        } else if (data && typeof data === 'object') {
            // Agar 'detail' yo'q bo'lsa, boshqa xatoliklarni izlaymiz
            const errorKeys = Object.keys(data);
            if (errorKeys.length > 0) {
                errorMessage = errorKeys.map(key => `${key}: ${Array.isArray(data[key]) ? data[key].join(', ') : data[key]}`).join('; ');
            }
        }
        throw new Error(errorMessage);
      }

      if (data.access) {
        localStorage.setItem("access_token", data.access);
        if (data.refresh) { // refresh_token mavjud bo'lsa saqlaymiz
            localStorage.setItem("refresh_token", data.refresh);
        }

        // JWT tokenini decode qilamiz
        try {
          const decodedToken = jwtDecode<DecodedToken>(data.access); // Tipni ko'rsatamiz
          
          console.log('Decoded Token Payload:', decodedToken); // To'liq payloadni ko'rish uchun

          if (decodedToken.user_type && decodedToken.fio) {
            localStorage.setItem("user_type", decodedToken.user_type);
            localStorage.setItem("user_fio", decodedToken.fio);
            // Agar user_id ham kerak bo'lsa, uni ham saqlash mumkin
            // localStorage.setItem("user_id", decodedToken.user_id.toString());

            console.log('Saqlangan ma\'lumotlar:');
            console.log('User Type:', decodedToken.user_type);
            console.log('FIO:', decodedToken.fio);
            // console.log('User ID:', decodedToken.user_id);
          } else {
            console.error("Token tarkibida user_type yoki fio topilmadi.");
            // Bu yerda xatolik toast'ini ko'rsatish mumkin, chunki foydalanuvchi ma'lumotlari to'liq emas
            showToast({
              title: "Ma'lumotlar to'liq emas",
              description: "Foydalanuvchi turi yoki ismi token tarkibida topilmadi. Administrator bilan bog'laning.",
              variant: "destructive",
            });
            // Foydalanuvchini tizimdan chiqarib yuborish ham mumkin, chunki cheklovlar ishlamaydi
            // localStorage.clear(); 
            // setLoading(false);
            // return;
          }
        } catch (error) {
          console.error("Tokenni decode qilishda xatolik:", error);
          showToast({
            title: "Token xatoligi",
            description: "Tizimga kirish tokenini o'qishda muammo yuz berdi.",
            variant: "destructive",
          });
          setLoading(false);
          return; // Xatolik bo'lsa, keyingi qadamlarga o'tmaymiz
        }

        showToast({
          title: "Muvaffaqiyatli kirish",
          description: "Tizimga muvaffaqiyatli kirdingiz",
        });
        router.push("/"); // Yoki xarajatlar sahifasiga: router.push("/expenses");
      } else {
        throw new Error("Serverdan token qaytmadi.");
      }

    } catch (error: any) {
      showToast({
        title: "Xatolik",
        description: error.message || "Kirishda noma'lum xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setLoading(false)
    }
  }

  const setDemoCredentials = (role: string) => {
    if (role === "admin") {
      setFormData({
        phone_number: "+998901234567", // O'zingizning test admin telefon raqamingiz
        password: "admin123",          // O'zingizning test admin parolingiz
      })
    } else if (role === "sales") {
      setFormData({
        phone_number: "+998901234568", // O'zingizning test sotuvchi telefon raqamingiz
        password: "sales123",          // O'zingizning test sotuvchi parolingiz
      })
    } else if (role === "accountant") {
      setFormData({
        phone_number: "+998901234569", // O'zingizning test buxgalter telefon raqamingiz
        password: "account123",          // O'zingizning test buxgalter parolingiz
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            {/* Agar rasmingiz `public` papkasida bo'lsa, yo'li to'g'ri.
                Aks holda, import qilib ishlatishingiz kerak bo'ladi. */}
            <img src="/logo.png" alt="Ahlan House" className="h-12" /> 
            {/* placeholder.svg o'rniga haqiqiy logotip yo'lini ko'rsating, masalan /logo.png */}
          </div>
          <CardTitle className="text-2xl text-center">Tizimga kirish</CardTitle>
          <CardDescription className="text-center">
            Ahlan House boshqaruv tizimiga kirish uchun ma'lumotlaringizni kiriting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Telefon raqami</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  placeholder="+998901234567"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  autoComplete="username" // Brauzerga yordam berish uchun
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Parol</Label>
                  {/* <Button variant="link" className="p-0 h-auto text-sm" type="button">
                    Parolni unutdingizmi? 
                  </Button> */} 
                  {/* Hozircha bu funksionallik yo'q bo'lsa, kommentga olib turish mumkin */}
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password" // Brauzerga yordam berish uchun
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Kirilmoqda..." : "Kirish"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-muted-foreground mb-4">
            Demo kirish uchun quyidagi ma'lumotlardan foydalaning:
          </div>
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="sales">Sotuv</TabsTrigger>
              <TabsTrigger value="accountant">Buxgalter</TabsTrigger>
            </TabsList>
            <TabsContent value="admin" className="space-y-2 mt-2">
              <div className="text-sm">
                <div>
                  <strong>Telefon:</strong> +998901234567
                </div>
                <div>
                  <strong>Parol:</strong> admin123
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setDemoCredentials("admin")}>
                Admin sifatida kirish
              </Button>
            </TabsContent>
            <TabsContent value="sales" className="space-y-2 mt-2">
              <div className="text-sm">
                <div>
                  <strong>Telefon:</strong> +998901234568
                </div>
                <div>
                  <strong>Parol:</strong> sales123
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setDemoCredentials("sales")}>
                Sotuv bo'limi sifatida kirish
              </Button>
            </TabsContent>
            <TabsContent value="accountant" className="space-y-2 mt-2">
              <div className="text-sm">
                <div>
                  <strong>Telefon:</strong> +998901234569
                </div>
                <div>
                  <strong>Parol:</strong> account123
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setDemoCredentials("accountant")}>
                Buxgalter sifatida kirish
              </Button>
            </TabsContent>
          </Tabs>
        </CardFooter>
      </Card>
    </div>
  )
}