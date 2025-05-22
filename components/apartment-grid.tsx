"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Home, DollarSign, User, Calendar } from "lucide-react"

interface ApartmentGridProps {
  propertyId: number
}

export function ApartmentGrid({ propertyId }: ApartmentGridProps) {
  const router = useRouter()
  const [apartments, setApartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Generate mock apartments data
      const mockApartments = Array.from({ length: 20 }, (_, i) => {
        const status = Math.random() < 0.5 ? "available" : Math.random() < 0.7 ? "sold" : "reserved"

        const floor = Math.floor(Math.random() * 16) + 1
        const rooms = Math.floor(Math.random() * 3) + 1
        const area = 50 + Math.floor(Math.random() * 50)
        const price = area * 1000 + Math.floor(Math.random() * 10000)

        return {
          id: i + 1,
          propertyId,
          number: `${floor}${String((i % 4) + 1).padStart(2, "0")}`,
          floor,
          rooms,
          area,
          price,
          status,
          client:
            status !== "available"
              ? {
                  name: "Mijoz F.I.O.",
                  phone: "+998 90 123 45 67",
                }
              : null,
          reservationDate: status === "reserved" ? new Date().toISOString() : null,
          soldDate: status === "sold" ? new Date().toISOString() : null,
        }
      })

      setApartments(mockApartments)
      setLoading(false)
    }, 1000)
  }, [propertyId])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-blue-500">Bo'sh</Badge>
      case "reserved":
        return <Badge className="bg-yellow-500">Band</Badge>
      case "sold":
        return <Badge className="bg-green-500">Sotilgan</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Xonadonlar ma'lumotlari yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {apartments.map((apartment) => (
        <Card
          key={apartment.id}
          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/apartments/${apartment.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold">№ {apartment.number}</h3>
                <p className="text-sm text-muted-foreground">
                  {apartment.rooms} xona, {apartment.area} m²
                </p>
              </div>
              {getStatusBadge(apartment.status)}
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{apartment.floor}-qavat</span>
              </div>
              <div className="flex items-center text-sm">
                <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>${apartment.price.toLocaleString()}</span>
              </div>

              {apartment.status !== "available" && (
                <div className="flex items-center text-sm">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{apartment.client.name}</span>
                </div>
              )}

              {apartment.status === "reserved" && (
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Band: {new Date(apartment.reservationDate).toLocaleDateString()}</span>
                </div>
              )}

              {apartment.status === "sold" && (
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Sotilgan: {new Date(apartment.soldDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/apartments/${apartment.id}`)
                }}
              >
                Batafsil
              </Button>

              {apartment.status === "available" && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/apartments/${apartment.id}/reserve`)
                  }}
                >
                  Band qilish
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

