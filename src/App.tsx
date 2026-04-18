import { useState, useEffect } from "react"
import { type Session } from "@supabase/supabase-js"
import { supabase } from "./lib/supabase"
import Login from "./pages/Login"
import Layout from "./components/layout/Layout"
import { type Page } from "./components/layout/Sidebar"
import Sales from "./pages/Sales.tsx"
import Movements from "./pages/Movements"
import Products from "./pages/Products"
import Returns from "./pages/Returns"

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState<Page>("sales")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <Layout page={page} onNavigate={setPage}>
      {page === "sales" && <Sales />}
      {page === "movements" && <Movements />}
      {page === "products" && <Products />}
      {page === "returns" && <Returns />}
    </Layout>
  )
}

export default App