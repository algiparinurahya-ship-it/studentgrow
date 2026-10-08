// =====================================================
// Lapisan data Supabase (Tahap 3)
// Hanya boleh berisi URL dan kunci anon/publishable.
// JANGAN pernah menaruh kunci secret/service_role di sini.
// =====================================================
const SUPABASE_URL = "https://wcztzrhhfhtfrrtbuavf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qpYH7R1_ixp61RCPd8XR3g_KgXXxJzR";

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error("Supabase error " + res.status + ": " + (await res.text()));
  return res.status === 204 ? null : res.json();
}

const api = {
  categories: () => sb("categories?select=*&order=name.asc"),
  sellers: () => sb("sellers?select=*&order=business_name.asc"),
  products: () => sb("products?select=*&order=created_at.desc"),
  async createOrder(o) {
    // Kode pesanan dibuat di sini karena pengunjung tidak boleh membaca tabel pesanan
    const order_code = "ORD-" + Date.now().toString(36).toUpperCase().slice(-6);
    await sb("orders", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ order_code, buyer_name: o.buyer_name, product_id: o.product_id, quantity: o.quantity })
    });
    return { order_code };
  }
};
