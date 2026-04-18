import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Pencil, Plus, Trash2 } from "lucide-react"
import { supabase } from "../lib/supabase"
import { type Product } from "../types/products"
import Button from "../components/ui/Button"
import { QRScanner } from "../components/ui/QRScanner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card"
import Drawer from "../components/ui/Drawer"
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

type DrawerMode = "create" | "edit"

type ProductForm = {
  name: string
  code: string
  stock: string
  min_stock: string
  category: string
  description: string
}

const initialFormState: ProductForm = {
  name: "",
  code: "",
  stock: "",
  min_stock: "",
  category: "",
  description: "",
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<ProductForm>(initialFormState)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (data) setProducts(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const drawerTitle = useMemo(
    () => (drawerMode === "create" ? "Crear producto" : "Editar producto"),
    [drawerMode]
  )

  const openCreateDrawer = () => {
    setDrawerMode("create")
    setSelectedId(null)
    setFormValues(initialFormState)
    setFormError(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = (product: Product) => {
    setDrawerMode("edit")
    setSelectedId(product.id)
    setFormValues({
      name: product.name,
      code: product.code,
      stock: String(product.stock),
      min_stock: String(product.min_stock),
      category: product.category ?? "",
      description: product.description ?? "",
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    if (saving) return
    setDrawerOpen(false)
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Esta accion eliminara el producto. Deseas continuar?")
    if (!confirmed) return

    await supabase.from("products").delete().eq("id", id)
    fetchProducts()
  }

  const updateFormValue = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const updateNumericFormValue = (key: "stock" | "min_stock", value: string) => {
    const digitsOnly = value.replace(/\D/g, "")
    updateFormValue(key, digitsOnly)
  }

  const handleSubmit = async () => {
    if (
      !formValues.name.trim() ||
      !formValues.stock.trim() ||
      !formValues.min_stock.trim() ||
      !formValues.category.trim()
    ) {
      setFormError("Nombre, stock, stock minimo y categoria son obligatorios.")
      return
    }

    if (!formValues.code.trim()) {
      setFormError("El codigo es obligatorio.")
      return
    }

    if (!/^\d+$/.test(formValues.stock) || !/^\d+$/.test(formValues.min_stock)) {
      setFormError("Stock y stock minimo deben contener solo numeros enteros.")
      return
    }

    const stockValue = Number(formValues.stock)
    const minStockValue = Number(formValues.min_stock)

    if (stockValue < 0 || minStockValue < 0) {
      setFormError("Stock y stock minimo deben ser positivos.")
      return
    }

    setSaving(true)
    setFormError(null)

    if (drawerMode === "create") {
      const { data: createdProduct } = await supabase.from("products").insert([
        {
          name: formValues.name.trim(),
          code: formValues.code.trim(),
          stock: stockValue,
          min_stock: minStockValue,
          category: formValues.category.trim(),
          description: formValues.description.trim(),
        },
      ]).select("id").single()

      if (createdProduct) {
        await supabase.from("movements").insert([
          {
            product_id: createdProduct.id,
            type: "IN",
            quantity: stockValue,
          },
        ])
      }
    } else if (selectedId) {
      await supabase
        .from("products")
        .update({
          name: formValues.name.trim(),
          code: formValues.code.trim(),
          stock: stockValue,
          min_stock: minStockValue,
          category: formValues.category.trim(),
          description: formValues.description.trim(),
        })
        .eq("id", selectedId)
    }

    setSaving(false)
    setDrawerOpen(false)
    setFormValues(initialFormState)
    fetchProducts()
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Catalogo de productos</CardTitle>
            <CardDescription>
              Gestiona tus productos con un flujo rapido de creacion y edicion.
            </CardDescription>
          </div>
          <Button leftIcon={<Plus size={16} />} onClick={openCreateDrawer}>
            Nuevo producto
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="md:hidden p-4 space-y-3">
            {loading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div key={`mobile-product-skeleton-${index}`} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                </div>
              ))}

            {!loading && products.length === 0 && (
              <p className="text-sm text-center text-slate-500 py-6">No hay productos registrados.</p>
            )}

            {!loading &&
              products.map((product) => {
                const lowStock = product.stock <= product.min_stock

                return (
                  <div key={product.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">Codigo: {product.code?.trim() || "Sin codigo"}</p>
                    <p className="text-xs text-slate-500">Descripcion: {product.description?.trim() || "Sin descripcion"}</p>
                    <p className="text-xs text-slate-500">Categoria: {product.category || "Sin categoria"}</p>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        lowStock ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      Stock: {product.stock}
                    </span>
                    <div className="flex justify-end gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDrawer(product)}
                        aria-label={`Editar ${product.name}`}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(product.id)}
                        aria-label={`Eliminar ${product.name}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Nombre</TableHeaderCell>
                    <TableHeaderCell>Codigo</TableHeaderCell>
                    <TableHeaderCell>Stock</TableHeaderCell>
                    <TableHeaderCell>Categoria</TableHeaderCell>
                    <TableHeaderCell className="text-center">Acciones</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading &&
                    Array.from({ length: 6 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell>
                          <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="mx-auto h-8 w-20 rounded bg-slate-200 animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!loading && products.length === 0 && (
                    <TableRow>
                      <TableCell className="text-center text-slate-500" colSpan={5}>
                        No hay productos registrados.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    products.map((product) => {
                      const lowStock = product.stock <= product.min_stock

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{product.description?.trim() || "Sin descripcion"}</p>
                          </TableCell>
                          <TableCell>{product.code?.trim() || "Sin codigo"}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                lowStock
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {product.stock}
                            </span>
                          </TableCell>
                          <TableCell>{product.category || "Sin categoria"}</TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDrawer(product)}
                                aria-label={`Editar ${product.name}`}
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDelete(product.id)}
                                aria-label={`Eliminar ${product.name}`}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
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

      <QRScanner
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onResult={(result) => {
          updateFormValue("code", result)
          setQrScannerOpen(false)
        }}
      />

      <Drawer
        isOpen={drawerOpen}
        title={drawerTitle}
        description="Completa la informacion del producto para guardar cambios."
        onClose={closeDrawer}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={closeDrawer} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {formError}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Nombre del producto"
            value={formValues.name}
            onChange={(event) => updateFormValue("name", event.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Codigo</label>
            <div className="flex gap-2">
              <Input
                placeholder="SKU-001"
                value={formValues.code}
                onChange={(event) => updateFormValue("code", event.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setQrScannerOpen(true)}
                className="shrink-0"
              >
                Escanear
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Stock"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              pattern="[0-9]*"
              value={formValues.stock}
              onChange={(event) => updateNumericFormValue("stock", event.target.value)}
            />
            <Input
              label="Stock minimo"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              pattern="[0-9]*"
              value={formValues.min_stock}
              onChange={(event) => updateNumericFormValue("min_stock", event.target.value)}
            />
          </div>

          <Input
            label="Categoria"
            placeholder="Snacks"
            value={formValues.category}
            onChange={(event) => updateFormValue("category", event.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Descripcion</label>
            <textarea
              className="w-full min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Descripcion breve del producto"
              value={formValues.description}
              onChange={(event) => updateFormValue("description", event.target.value)}
            />
          </div>
        </div>
      </Drawer>
    </>
  )
}