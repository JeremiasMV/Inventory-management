import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { supabase } from "../lib/supabase"

export default function Scanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)

  const startScanner = async () => {
    const scanner = new Html5Qrcode("reader")
    scannerRef.current = scanner

    setScanning(true)

    await scanner.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  async (decodedText) => {
    console.log("QR:", decodedText)

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("code", decodedText.trim())

    if (!data || data.length === 0) {
      alert("Producto no encontrado")
      return
    }

    const product = data[0]

    if (product.stock <= 0) {
      alert("Sin stock ❌")
      return
    }

    const newStock = product.stock - 1

    await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", product.id)

    await supabase.from("movements").insert([
      {
        product_id: product.id,
        type: "OUT",
        quantity: 1,
      },
    ])

    alert(`Venta: ${product.name}`)

    stopScanner()
  },
  (errorMessage) => {
    
    console.log("scan error:", errorMessage)
  }
)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop()
      setScanning(false)
    }
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">Escáner QR</h1>

      {!scanning && (
        <button
          onClick={startScanner}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Iniciar escáner
        </button>
      )}

      {scanning && (
        <button
          onClick={stopScanner}
          className="bg-red-500 text-white px-4 py-2 rounded mb-4"
        >
          Detener
        </button>
      )}

      <div id="reader" className="w-full max-w-md mt-4"></div>
    </div>
  )
}