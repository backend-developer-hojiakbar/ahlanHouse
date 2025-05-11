"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { Search } from "@/components/search"
import { UserNav } from "@/components/user-nav"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { UserManagement } from "@/components/user-management"
import { RoleManagement } from "@/components/role-management"

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [profileData, setProfileData] = useState({
    fio: "",
    phone_number: "",
    address: "",
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token')
        const userId = localStorage.getItem('userId') // User ID ni local storage dan olish
        if (!token || !userId) return

        setUserId(userId)
        const response = await fetch(`http://api.ahlan.uz/api/users/${userId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) throw new Error('Foydalanuvchi ma\'lumotlarini olishda xatolik')

        const data = await response.json()
        setProfileData({
          fio: data.fio || '',
          phone_number: data.phone_number || '',
          address: data.address || '',
        })
      } catch (error) {
        toast({
          title: 'Xatolik',
          description: error instanceof Error ? error.message : 'Ma\'lumotlarni yuklashda xatolik',
          variant: 'destructive',
        })
      }
    }

    fetchUserData()
  }, [])

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    paymentReminders: true,
    systemUpdates: false,
    marketingEmails: false,
  })

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSecurityData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNotificationChange = (name: string, checked: boolean) => {
    setNotificationSettings((prev) => ({ ...prev, [name]: checked }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token || !userId) throw new Error('Avtorizatsiyadan o\'tilmagan')

      const response = await fetch(`http://api.ahlan.uz/api/users/${userId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fio: profileData.fio,
          phone_number: profileData.phone_number,
          address: profileData.address
        })
      })

      if (!response.ok) {
        throw new Error('Profil yangilashda xatolik yuz berdi')
      }

      const data = await response.json()
      toast({
        title: 'Profil yangilandi',
        description: "Profil ma'lumotlari muvaffaqiyatli yangilandi",
      })
    } catch (error) {
      toast({
        title: 'Xatolik',
        description: error instanceof Error ? error.message : 'Profil yangilashda xatolik yuz berdi',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (securityData.newPassword !== securityData.confirmPassword) {
      toast({
        title: 'Xatolik',
        description: 'Yangi parol va tasdiqlash paroli mos kelmaydi',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token || !userId) throw new Error('Avtorizatsiyadan o\'tilmagan')

      const response = await fetch(`http://api.ahlan.uz/api/users/${userId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: securityData.newPassword,
          current_password: securityData.currentPassword
        })
      })

      if (!response.ok) {
        throw new Error('Parol yangilashda xatolik yuz berdi')
      }

      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      toast({
        title: 'Parol yangilandi',
        description: 'Parol muvaffaqiyatli yangilandi',
      })
    } catch (error) {
      toast({
        title: 'Xatolik',
        description: error instanceof Error ? error.message : 'Parol yangilashda xatolik yuz berdi',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      toast({
        title: "Sozlamalar yangilandi",
        description: "Bildirishnoma sozlamalari muvaffaqiyatli yangilandi",
      })
    }, 1000)
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
          <h2 className="text-3xl font-bold tracking-tight">Sozlamalar</h2>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="security">Xavfsizlik</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <form onSubmit={handleProfileSubmit}>
                <CardHeader>
                  <CardTitle>Profil</CardTitle>
                  <CardDescription>Shaxsiy ma'lumotlarni tahrirlash</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fio">F.I.O</Label>
                    <Input
                      id="fio"
                      name="fio"
                      value={profileData.fio}
                      onChange={handleProfileChange}
                      placeholder="To'liq ismingizni kiriting"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Telefon raqam</Label>
                      <Input
                        id="phone_number"
                        name="phone_number"
                        value={profileData.phone_number}
                        onChange={handleProfileChange}
                        placeholder="+998 90 123 45 67"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Manzil</Label>
                      <Input 
                        id="address" 
                        name="address" 
                        value={profileData.address} 
                        onChange={handleProfileChange}
                        placeholder="Manzilingizni kiriting"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <form onSubmit={handleSecuritySubmit}>
                <CardHeader>
                  <CardTitle>Xavfsizlik</CardTitle>
                  <CardDescription>Parolni o'zgartirish</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Joriy parol</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={securityData.currentPassword}
                      onChange={handleSecurityChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Yangi parol</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={securityData.newPassword}
                        onChange={handleSecurityChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Yangi parolni tasdiqlash</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={securityData.confirmPassword}
                        onChange={handleSecurityChange}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saqlanmoqda..." : "Parolni yangilash"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <form onSubmit={handleNotificationSubmit}>
                <CardHeader>
                  <CardTitle>Bildirishnomalar</CardTitle>
                  <CardDescription>Bildirishnoma sozlamalarini boshqarish</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email bildirishnomalari</Label>
                      <p className="text-sm text-muted-foreground">
                        Tizim yangilanishlari va muhim xabarlar haqida email orqali xabardor bo'ling
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="smsNotifications">SMS bildirishnomalari</Label>
                      <p className="text-sm text-muted-foreground">Muhim xabarlar haqida SMS orqali xabardor bo'ling</p>
                    </div>
                    <Switch
                      id="smsNotifications"
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => handleNotificationChange("smsNotifications", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="paymentReminders">To'lov eslatmalari</Label>
                      <p className="text-sm text-muted-foreground">To'lovlar muddati yaqinlashganda eslatmalar olish</p>
                    </div>
                    <Switch
                      id="paymentReminders"
                      checked={notificationSettings.paymentReminders}
                      onCheckedChange={(checked) => handleNotificationChange("paymentReminders", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="systemUpdates">Tizim yangilanishlari</Label>
                      <p className="text-sm text-muted-foreground">
                        Tizim yangilanishlari va texnik xizmat ko'rsatish haqida xabardor bo'ling
                      </p>
                    </div>
                    <Switch
                      id="systemUpdates"
                      checked={notificationSettings.systemUpdates}
                      onCheckedChange={(checked) => handleNotificationChange("systemUpdates", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketingEmails">Marketing xabarlari</Label>
                      <p className="text-sm text-muted-foreground">
                        Yangi xizmatlar va takliflar haqida xabardor bo'ling
                      </p>
                    </div>
                    <Switch
                      id="marketingEmails"
                      checked={notificationSettings.marketingEmails}
                      onCheckedChange={(checked) => handleNotificationChange("marketingEmails", checked)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>
        </Tabs>
      </div>
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
              Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>
    </div>
  )
}