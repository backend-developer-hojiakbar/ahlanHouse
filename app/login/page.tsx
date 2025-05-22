"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
      const response = await fetch("http://api.ahlan.uz/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: formData.phone_number,
          password: formData.password,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || "Telefon raqami yoki parol noto‘g‘ri")
      }

      // Decode JWT token to get user type
      const tokenParts = data.access.split('.')
      const payload = JSON.parse(atob(tokenParts[1]))
      console.log('User Type:', payload.user_type)

      localStorage.setItem("access_token", data.access)
      localStorage.setItem("refresh_token", data.refresh)

      toast({
        title: "Muvaffaqiyatli kirish",
        description: "Tizimga muvaffaqiyatli kirdingiz",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Telefon raqami yoki parol noto‘g‘ri",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const setDemoCredentials = (role: string) => {
    if (role === "admin") {
      setFormData({
        phone_number: "+998901234567",
        password: "admin123",
      })
    } else if (role === "sales") {
      setFormData({
        phone_number: "+998901234568",
        password: "sales123",
      })
    } else if (role === "accountant") {
      setFormData({
        phone_number: "+998901234569",
        password: "account123",
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src="/placeholder.svg?height=60&width=200" alt="Ahlan House" className="h-12" />
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
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Parol</Label>
                  <Button variant="link" className="p-0 h-auto text-sm" type="button">
                    Parolni unutdingizmi?
                  </Button>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Kirish..." : "Kirish"}
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
                Buxgalter sifatida kirishn
              </Button>
            </TabsContent>
          </Tabs>
        </CardFooter>
      </Card>
    </div>
  )
}