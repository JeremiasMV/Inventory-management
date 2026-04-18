import { useEffect, useState } from "react"
import { ArrowDownToLine, ArrowUpFromLine, Filter } from "lucide-react"
import { supabase } from "../lib/supabase"
import { type Movement } from "../types/movements"
import { type Product } from "../types/products"
import Button from "../components/ui/Button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card"
import Input from "../components/ui/Input"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../components/ui/Table"

type MovementWithProduct = Movement & {
  productName: string
  productCreatedAt: string | null
}

const CREATION_WINDOW_MS = 90_000
const CHILE_TIMEZONE = "America/Santiago"

const getChileDateKey = (value: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const parts = formatter.formatToParts(new Date(value))
  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"
  return `${year}-${month}-${day}`
}

const formatChileDateTime = (value: string) =>
  new Date(value).toLocaleString("es-CL", {
    timeZone: CHILE_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  })

const getMovementDisplay = (movement: MovementWithProduct) => {
  if (movement.type === "OUT") {
    return {
      label: "Venta",
      icon: <ArrowUpFromLine size={13} />,
      className: "bg-rose-50 text-rose-700",
    }
  }

  const movementTime = new Date(movement.created_at).getTime()
  const productCreatedTime = movement.productCreatedAt
    ? new Date(movement.productCreatedAt).getTime()
    : NaN

  const isCreation =
    Number.isFinite(productCreatedTime) &&
    Math.abs(movementTime - productCreatedTime) <= CREATION_WINDOW_MS

  if (isCreation) {
    return {
      label: "Creacion",
      icon: <ArrowDownToLine size={13} />,
      className: "bg-indigo-50 text-indigo-700",
    }
  }

  return {
    label: "Devolucion",
    icon: <ArrowDownToLine size={13} />,
    className: "bg-emerald-50 text-emerald-700",
  }
}

export default function Movements() {
  const [movements, setMovements] = useState<MovementWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const fetchMovements = async () => {
    setLoading(true)

    const [{ data: movementRows }, { data: productRows }] = await Promise.all([
      supabase
        .from("movements")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, created_at"),
    ])

    const productsById = (productRows as (Pick<Product, "id" | "name"> & { created_at: string | null })[] | null)?.reduce(
      (acc, product) => {
        acc[product.id] = {
          name: product.name,
          createdAt: product.created_at,
        }
        return acc
      },
      {} as Record<string, { name: string; createdAt: string | null }>
    )

    if (movementRows) {
      const enrichedMovements = movementRows.map((movement) => ({
        ...movement,
        productName: productsById?.[movement.product_id]?.name ?? "Producto eliminado",
        productCreatedAt: productsById?.[movement.product_id]?.createdAt ?? null,
      }))

      setMovements(enrichedMovements)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchMovements()
  }, [])

  const filteredMovements = movements.filter((movement) => {
    if (typeFilter !== "ALL" && movement.type !== typeFilter) return false

    const movementDateKey = getChileDateKey(movement.created_at)

    if (fromDate && movementDateKey < fromDate) return false

    if (toDate && movementDateKey > toDate) return false

    return true
  })

  const clearFilters = () => {
    setTypeFilter("ALL")
    setFromDate("")
    setToDate("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de movimientos</CardTitle>
        <CardDescription>
          Consulta entradas y salidas de inventario con filtros por tipo y fecha.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[170px_1fr_1fr_auto] gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Tipo</label>
            <select
              className="h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "ALL" | "IN" | "OUT")
              }
            >
              <option value="ALL">Todos</option>
              <option value="IN">Entradas (Creacion/Devolucion)</option>
              <option value="OUT">Salidas (Venta)</option>
            </select>
          </div>

          <Input
            label="Desde"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />

          <Input
            label="Hasta"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />

          <div className="flex items-end">
            <Button variant="outline" leftIcon={<Filter size={16} />} onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </div>

        <div className="md:hidden space-y-3">
          {loading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`mobile-movement-skeleton-${index}`} className="rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}

          {!loading && filteredMovements.length === 0 && (
            <p className="text-sm text-center text-slate-500 py-6">
              No se encontraron movimientos con los filtros actuales.
            </p>
          )}

          {!loading &&
            filteredMovements.map((movement) => {
              const movementDisplay = getMovementDisplay(movement)

              return (
                <div key={movement.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <p className="font-medium text-slate-900">{movement.productName}</p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${movementDisplay.className}`}
                  >
                    {movementDisplay.icon}
                    {movementDisplay.label}
                  </span>
                  <p className="text-sm text-slate-600">Cantidad: {movement.quantity}</p>
                  <p className="text-xs text-slate-500">{formatChileDateTime(movement.created_at)}</p>
                </div>
              )
            })}
        </div>

        <div className="hidden md:block">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Producto</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Cantidad</TableHeaderCell>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading &&
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={`skeleton-movements-${index}`}>
                      <TableCell>
                        <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-6 w-20 rounded bg-slate-200 animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-12 rounded bg-slate-200 animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading && filteredMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500">
                      No se encontraron movimientos con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  filteredMovements.map((movement) => {
                    const movementDisplay = getMovementDisplay(movement)

                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="font-medium text-slate-900">
                          {movement.productName}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${movementDisplay.className}`}
                          >
                            {movementDisplay.icon}
                            {movementDisplay.label}
                          </span>
                        </TableCell>
                        <TableCell>{movement.quantity}</TableCell>
                        <TableCell>
                          {formatChileDateTime(movement.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </CardContent>
    </Card>
  )
}