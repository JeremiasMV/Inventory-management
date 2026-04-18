import {
  ShoppingCart,
  ArrowLeftRight,
  Package,
  RotateCcw,
  LogOut,
  BarChart3,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

export type Page = "sales" | "movements" | "products" | "returns"

export interface NavItem {
  id: Page
  label: string
  icon: React.ReactNode
}

export const navItems: NavItem[] = [
  {
    id: "sales",
    label: "Ventas",
    icon: <ShoppingCart size={18} />,
  },
  {
    id: "movements",
    label: "Movimientos",
    icon: <ArrowLeftRight size={18} />,
  },
  {
    id: "products",
    label: "Productos",
    icon: <Package size={18} />,
  },
  {
    id: "returns",
    label: "Devoluciones",
    icon: <RotateCcw size={18} />,
  },
]

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  className?: string
  onAfterNavigate?: () => void
}

export default function Sidebar({
  currentPage,
  onNavigate,
  className = "",
  onAfterNavigate,
}: SidebarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <aside className={`flex flex-col w-60 min-h-full bg-slate-900 text-slate-300 shrink-0 ${className}`}>
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg">
          <BarChart3 size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">Inventario</p>
          <p className="text-slate-500 text-xs">Sistema de gestión</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-2 mb-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
          Módulos
        </p>
        {navItems.map((item) => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id)
                onAfterNavigate?.()
              }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className={isActive ? "text-white" : "text-slate-500"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-150"
        >
          <LogOut size={18} className="text-slate-500" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
