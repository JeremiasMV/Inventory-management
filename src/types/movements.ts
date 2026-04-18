export interface Movement {
  id: string
  product_id: string
  type: "IN" | "OUT"
  quantity: number
  created_at: string
}