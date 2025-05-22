import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function PropertyList({ objects }) {
  const router = useRouter()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {objects.length === 0 ? (
        <p className="text-center text-gray-500 col-span-full">Hozircha obyektlar mavjud emas</p>
      ) : (
        objects.map((object) => (
          <Card key={object.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{object.name}</CardTitle>
              <CardDescription>{object.address}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {object.image ? (
                <img src={object.image} alt={object.name} className="w-full h-40 object-cover rounded-md mb-4" />
              ) : (
                <div className="w-full h-40 bg-gray-200 flex items-center justify-center rounded-md mb-4">
                  <p className="text-gray-500">Rasm mavjud emas</p>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-2">{object.description}</p>
              <p className="text-sm">Jami xonadonlar: {object.total_apartments}</p>
              <p className="text-sm">Qavatlar soni: {object.floors}</p>
            </CardContent>
            <div className="p-4 pt-0">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push(`/properties/${object.id}`)}
              >
                Batafsil
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}