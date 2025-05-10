"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { Search } from "@/components/search"
import { UserNav } from "@/components/user-nav"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useParams, useRouter } from "next/navigation"
import { Building, Home, Plus, FileText, CreditCard, BarChart3 } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [property, setProperty] = useState(null)
  const [apartments, setApartments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [documents, setDocuments] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)

  const getAuthHeaders = () => ({
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token")
      setAccessToken(token)
    }
  }, [])

  useEffect(() => {
    if (accessToken === null) return

    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Tizimga kirish talab qilinadi",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    const fetchPropertyData = async () => {
      setLoading(true)
      try {
        // Obyekt ma'lumotlari
        const propertyResponse = await fetch(`http://api.ahlan.uz/objects/${params.id}/`, {
          method: "GET",
          headers: getAuthHeaders(),
        })
        if (!propertyResponse.ok) throw new Error("Obyekt ma'lumotlarini olishda xatolik")
        const propertyData = await propertyResponse.json()

        // Xonadonlar ro'yxati
        const apartmentsResponse = await fetch(`http://api.ahlan.uz/apartments/?object=${params.id}`, {
          method: "GET",
          headers: getAuthHeaders(),
        })
        if (!apartmentsResponse.ok) throw new Error("Xonadonlarni olishda xatolik")
        const apartmentsData = await apartmentsResponse.json()

        // Xarajatlar
        const expensesResponse = await fetch(`http://api.ahlan.uz/expenses/?object=${params.id}`, {
          method: "GET",
          headers: getAuthHeaders(),
        })
        if (!expensesResponse.ok) throw new Error("Xarajatlarni olishda xatolik")
        const expensesData = await expensesResponse.json()

        // Hujjatlar (Payment orqali)
        const paymentsResponse = await fetch(`http://api.ahlan.uz/payments/?apartment__object=${params.id}`, {
          method: "GET",
          headers: getAuthHeaders(),
        })
        if (!paymentsResponse.ok) throw new Error("To‘lovlarni olishda xatolik")
        const paymentsData = await paymentsResponse.json()
        const allDocuments = paymentsData.results.flatMap(payment => payment.documents)

        // Analitika
        const analyticsResponse = await fetch("http://api.ahlan.uz/payments/statistics/", {
          method: "GET",
          headers: getAuthHeaders(),
        })
        if (!analyticsResponse.ok) throw new Error("Analitikani olishda xatolik")
        const analyticsData = await analyticsResponse.json()

        // Xonadonlar statistikasi
        const soldApartments = apartmentsData.results.filter(a => a.status === "sotilgan").length
        const reservedApartments = apartmentsData.results.filter(a => a.status === "band").length
        const availableApartments = apartmentsData.results.filter(a => a.status === "bosh").length

        setProperty({
          id: propertyData.id,
          name: propertyData.name,
          address: propertyData.address,
          description: propertyData.description,
          totalFloors: propertyData.floors,
          totalApartments: propertyData.total_apartments,
          soldApartments,
          reservedApartments,
          availableApartments,
          image: propertyData.image || "/placeholder.svg?height=300&width=600",
          startDate: "2022-03-15", // API’da yo‘q, qo‘lda qo‘shildi
          endDate: "2023-12-30",   // API’da yo‘q, qo‘lda qo‘shildi
        })
        setApartments(apartmentsData.results)
        setExpenses(expensesData.results)
        setDocuments(allDocuments)
        setAnalytics(analyticsData)
        setLoading(false)
      } catch (error) {
        toast({
          title: "Xatolik",
          description: error.message || "Ma'lumotlarni olishda xatolik yuz berdi",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchPropertyData()
  }, [accessToken, params.id, router])

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
    )
  }

  if (!property) {
    return <p>Obyekt topilmadi</p>
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
            <h2 className="text-3xl font-bold tracking-tight">{property.name}</h2>
            <p className="text-muted-foreground">{property.address}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push("/properties")}>
              <Building className="mr-2 h-4 w-4" />
              Barcha obyektlar
            </Button>
            <Link href={`/apartments/add?propertyId=${property.id}`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yangi xonadon qo'shish
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jami xonadonlar</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{property.totalApartments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sotilgan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{property.soldApartments}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((property.soldApartments / property.totalApartments) * 100)}% sotilgan
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Band qilingan</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{property.reservedApartments}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((property.reservedApartments / property.totalApartments) * 100)}% band
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bo'sh</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{property.availableApartments}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((property.availableApartments / property.totalApartments) * 100)}% bo'sh
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="relative h-[200px] md:h-[300px] overflow-hidden rounded-xl">
          <img src={property.image} alt={property.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="p-6 text-white max-w-3xl">
              <p className="text-lg">{property.description}</p>
              <div className="flex space-x-4 mt-2 text-sm">
                <span>Qavatlar: {property.totalFloors}</span>
                <span>Qurilish boshlangan: {new Date(property.startDate).toLocaleDateString()}</span>
                <span>Tugash sanasi: {new Date(property.endDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="apartments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="apartments">Xonadonlar</TabsTrigger>
            <TabsTrigger value="expenses">Xarajatlar</TabsTrigger>
            <TabsTrigger value="documents">Hujjatlar</TabsTrigger>
            <TabsTrigger value="analytics">Analitika</TabsTrigger>
          </TabsList>

          {/* Xonadonlar ro'yxati */}
          <TabsContent value="apartments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Xonadonlar ro'yxati</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {apartments.map((apt) => (
                <Card key={apt.id}>
                  <CardHeader>
                    <CardTitle>{apt.room_number}-xonadon</CardTitle>
                    <CardDescription>{apt.rooms} xonali</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Qavat: {apt.floor}</p>
                    <p>Maydon: {apt.area} m²</p>
                    <p>Narx: {apt.price} $</p>
                    <p>Holati: {apt.status}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Xarajatlar */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Xarajatlar</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yangi xarajat qo'shish
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {expenses.map((exp) => (
                <Card key={exp.id}>
                  <CardHeader>
                    <CardTitle>{exp.supplier_name}</CardTitle>
                    <CardDescription>{exp.expense_type_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Miqdor: {exp.amount} $</p>
                    <p>Sana: {new Date(exp.date).toLocaleDateString()}</p>
                    <p>Holati: {exp.status}</p>
                    <p>Izoh: {exp.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Hujjatlar */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hujjatlar</CardTitle>
                <CardDescription>Obyekt bilan bog'liq barcha hujjatlar</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li key={doc.id}>
                        <a
                          href={`http://api.ahlan.uz${doc.pdf_file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Shartnoma №{doc.payment} - {new Date(doc.created_at).toLocaleString()}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Hujjatlar mavjud emas</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analitika */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analitika</CardTitle>
                <CardDescription>Obyekt bo'yicha batafsil analitika</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p>Jami sotuvlar: {analytics.total_sales} $</p>
                      <p>Sotilgan xonadonlar: {analytics.sold_apartments}</p>
                      <p>Bo‘sh xonadonlar: {analytics.free_apartments}</p>
                      <p>Band qilingan xonadonlar: {analytics.reserved_apartments}</p>
                      <p>O‘rtacha narx: {analytics.average_price} $</p>
                    </div>
                    <div>
                      <p>Jami to‘lovlar: {analytics.total_payments} $</p>
                      <p>To‘langan to‘lovlar: {analytics.paid_payments} $</p>
                      <p>Kutilayotgan to‘lovlar: {analytics.pending_payments} $</p>
                      <p>Muddati o‘tgan to‘lovlar: {analytics.overdue_payments} $</p>
                      <p>Bugun to‘lovlar: {analytics.payments_due_today} $</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Analitika ma'lumotlari mavjud emas</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}