import type { ReactNode } from "react"
import { X } from "lucide-react"
import Button from "./Button"

interface DrawerProps {
  isOpen: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export default function Drawer({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
}: DrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Cerrar panel"
      />

      <div className="relative w-full max-w-md min-h-dvh bg-white border-l border-slate-200 shadow-2xl animate-[slideIn_0.2s_ease-out] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 md:px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5">{children}</div>

        {footer && <div className="px-5 md:px-6 py-4 border-t border-slate-200 pb-[calc(env(safe-area-inset-bottom)+1rem)]">{footer}</div>}
      </div>
    </div>
  )
}
