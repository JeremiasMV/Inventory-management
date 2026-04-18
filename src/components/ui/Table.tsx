import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react"

interface BaseProps {
  children: ReactNode
  className?: string
}

export function TableContainer({ children, className = "" }: BaseProps) {
  return <div className={`overflow-x-auto ${className}`}>{children}</div>
}

export function Table({ children, className = "", ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={`w-full min-w-[560px] md:min-w-[680px] ${className}`} {...props}>
      {children}
    </table>
  )
}

export function TableHead({ children, className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-slate-50 ${className}`} {...props}>{children}</thead>
}

export function TableBody({ children, className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props}>{children}</tbody>
}

export function TableRow({ children, className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-b border-slate-100 ${className}`} {...props}>{children}</tr>
}

export function TableHeaderCell({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 ${className}`}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({
  children,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 text-sm text-slate-700 align-middle ${className}`} {...props}>
      {children}
    </td>
  )
}
