import { useState, type ReactNode } from "react"
import { Menu, X } from "lucide-react"
import Sidebar, { navItems, type Page } from "./Sidebar"

interface LayoutProps {
  page: Page
  onNavigate: (page: Page) => void
  children: ReactNode
}

const pageTitles: Record<Page, { title: string; subtitle: string }> = {
  sales: { title: "Ventas", subtitle: "Procesa ventas y gestiona el carrito" },
  movements: { title: "Movimientos", subtitle: "Historial de entradas y salidas de stock" },
  products: { title: "Productos", subtitle: "Administra tu catálogo de productos" },
  returns: { title: "Devoluciones", subtitle: "Procesa devoluciones de productos" },
}

export default function Layout({ page, onNavigate, children }: LayoutProps) {
  const { title, subtitle } = pageTitles[page]
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <Sidebar
        currentPage={page}
        onNavigate={onNavigate}
        className="hidden md:flex"
      />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menu"
          />
          <Sidebar
            currentPage={page}
            onNavigate={onNavigate}
            onAfterNavigate={() => setMobileMenuOpen(false)}
            className="relative h-full"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 md:px-6 lg:px-8 md:py-4 bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 text-slate-700"
              aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-semibold text-slate-900 truncate">{title}</h1>
              <p className="hidden md:block text-sm text-slate-500 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-indigo-700">A</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 md:py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 inset-x-0 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur z-40 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {navItems.map((item) => {
            const isActive = page === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full py-2.5 px-1 flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                    isActive ? "text-indigo-700" : "text-slate-500"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
