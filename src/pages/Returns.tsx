import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react"
import { supabase } from "../lib/supabase"
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

type ReturnItem = {
  product: Product
  quantity: number
}

export default function Returns() {
  const [code, setCode] = useState("")
  const [items, setItems] = useState<ReturnItem[]>([])
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [processingReturn, setProcessingReturn] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  const totals = useMemo(() => {
    const lines = items.length
    const units = items.reduce((acc, item) => acc + item.quantity, 0)
    return { lines, units }
  }, [items])

  const focusCodeInput = () => {
    codeInputRef.current?.focus()
  }

  useEffect(() => {
    focusCodeInput()
  }, [])

  useEffect(() => {
    if (!successMessage) return

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null)
    }, 2500)

    return () => window.clearTimeout(timeout)
  }, [successMessage])

  const handleSearch = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!code.trim()) return

    setSearchingProduct(true)

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("code", code.trim())
      .single()

    setSearchingProduct(false)

    if (error || !data) {
      setErrorMessage("No encontramos un producto con ese codigo.")
      setCode("")
      focusCodeInput()
      return
    }

    const existing = items.find((i) => i.product.id === data.id)

    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === data.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      )
    } else {
      setItems((prev) => [...prev, { product: data, quantity: 1 }])
    }

    setCode("")
    setSuccessMessage(`Producto cargado para devolucion: ${data.name}`)
    focusCodeInput()
  }

  const increaseQty = (id: string) => {
    setErrorMessage(null)
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    )
    focusCodeInput()
  }

  const decreaseQty = (id: string) => {
    setErrorMessage(null)
    setItems((prev) =>
      prev
        .map((i) =>
          i.product.id === id
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter((i) => i.quantity > 0)
    )
    focusCodeInput()
  }

  const removeItem = (id: string) => {
    setErrorMessage(null)
    setItems((prev) => prev.filter((i) => i.product.id !== id))
    focusCodeInput()
  }

  const updateQuantity = (id: string, value: string) => {
    setErrorMessage(null)

    if (value === "") {
      setItems((prev) =>
        prev.map((item) =>
          item.product.id === id ? { ...item, quantity: 0 } : item
        )
      )
      return
    }

    const parsed = Number(value)
    if (isNaN(parsed)) return

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === id ? { ...item, quantity: Math.max(0, parsed) } : item
      )
    )
  }

  const handleReturnAll = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (items.length === 0) {
      setErrorMessage("Agrega al menos un producto antes de procesar.")
      return
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        setErrorMessage(`Cantidad invalida en ${item.product.name}.`)
        return
      }
    }

    setProcessingReturn(true)

    for (const item of items) {
      const newStock = item.product.stock + item.quantity

      await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product.id)

      await supabase.from("movements").insert([
        {
          product_id: item.product.id,
          type: "IN",
          quantity: item.quantity,
        },
      ])
    }

    setItems([])
    setProcessingReturn(false)
    setSuccessMessage("Devolucion procesada correctamente.")
    focusCodeInput()
  }

  return (
    <div className="max-w-7xl mx-auto">
      <section className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-6">
          <Card className="border-sky-100">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Centro de devoluciones
                </p>
                <CardTitle>Escanear producto para devolucion</CardTitle>
                <CardDescription>
                  Carga productos devueltos y ajusta sus cantidades antes de confirmar.
                </CardDescription>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <RotateCcw size={18} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  ref={codeInputRef}
                  className="h-12 text-base"
                  placeholder="Ejemplo: 770012300221"
                  leftIcon={<ScanLine size={16} />}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch()
                  }}
                />
                <Button
                  className="h-12 min-w-40"
                  variant="outline"
                  onClick={handleSearch}
                  disabled={searchingProduct || processingReturn}
                  leftIcon={
                    searchingProduct ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <ScanLine size={16} />
                    )
                  }
                >
                  {searchingProduct ? "Buscando" : "Agregar"}
                </Button>
              </div>

              {(errorMessage || successMessage) && (
                <div className="space-y-2">
                  {errorMessage && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                  {successMessage && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de devolucion</CardTitle>
              <CardDescription>Edita cantidades antes de aplicar el movimiento.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="md:hidden p-4 space-y-3">
                {items.length === 0 && (
                  <p className="text-sm text-center text-slate-500 py-6">No hay productos en la devolucion.</p>
                )}

                {items.map((item) => (
                  <div key={item.product.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <p className="font-medium text-slate-900">{item.product.name}</p>
                    <p className="text-xs text-slate-500">Codigo: {item.product.code}</p>
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                      Stock actual: {item.product.stock}
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-11 w-11"
                        onClick={() => decreaseQty(item.product.id)}
                      >
                        <Minus size={16} />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        className="w-20 text-center"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(event) => updateQuantity(item.product.id, event.target.value)}
                        onBlur={() => {
                          setItems((prev) =>
                            prev.map((row) =>
                              row.product.id === item.product.id && row.quantity <= 0
                                ? { ...row, quantity: 1 }
                                : row
                            )
                          )
                        }}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-11 w-11"
                        onClick={() => increaseQty(item.product.id)}
                      >
                        <Plus size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 ml-auto text-rose-600 hover:bg-rose-50"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Producto</TableHeaderCell>
                        <TableHeaderCell>Stock actual</TableHeaderCell>
                        <TableHeaderCell>Cantidad a devolver</TableHeaderCell>
                        <TableHeaderCell className="text-center">Accion</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500">
                            No hay productos en la devolucion.
                          </TableCell>
                        </TableRow>
                      )}

                      {items.map((item) => (
                        <TableRow key={item.product.id}>
                          <TableCell>
                            <p className="font-medium text-slate-900">{item.product.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Codigo: {item.product.code}</p>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                              {item.product.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => decreaseQty(item.product.id)}
                              >
                                <Minus size={14} />
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                className="w-20 text-center"
                                value={item.quantity === 0 ? "" : item.quantity}
                                onChange={(event) =>
                                  updateQuantity(item.product.id, event.target.value)
                                }
                                onBlur={() => {
                                  setItems((prev) =>
                                    prev.map((row) =>
                                      row.product.id === item.product.id && row.quantity <= 0
                                        ? { ...row, quantity: 1 }
                                        : row
                                    )
                                  )
                                }}
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => increaseQty(item.product.id)}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-rose-600 hover:bg-rose-50"
                                onClick={() => removeItem(item.product.id)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="hidden xl:block space-y-4 xl:sticky xl:top-24 h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de devolucion</CardTitle>
              <CardDescription>Verifica la carga antes de procesar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Lineas</span>
                <span className="font-semibold text-slate-900">{totals.lines}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Unidades</span>
                <span className="font-semibold text-slate-900">{totals.units}</span>
              </div>

              <Button
                variant="primary"
                className="w-full mt-2"
                size="lg"
                onClick={handleReturnAll}
                disabled={processingReturn || items.length === 0}
                leftIcon={
                  processingReturn ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <RotateCcw size={16} />
                  )
                }
              >
                {processingReturn ? "Procesando" : "Procesar devolucion"}
              </Button>
            </CardContent>
          </Card>
        </aside>
            </section>

      <div className="fixed xl:hidden left-4 right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4 z-30">
        <Card className="shadow-lg">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-900 leading-tight">{totals.lines} lineas</p>
              <p>{totals.units} unidades</p>
            </div>
            <Button
              className="ml-auto"
              onClick={handleReturnAll}
              disabled={processingReturn || items.length === 0}
              leftIcon={
                processingReturn ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )
              }
            >
              {processingReturn ? "Procesando" : "Procesar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
