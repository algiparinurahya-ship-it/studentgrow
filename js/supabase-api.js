// =====================================================
// Lapisan data Supabase (Tahap 4: + login admin & kelola produk)
// Hanya boleh berisi URL dan kunci anon/publishable.
// JANGAN pernah menaruh kunci secret/service_role di sini.
// =====================================================
const SUPABASE_URL = "https://wcztzrhhfhtfrrtbuavf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qpYH7R1_ixp61RCPd8XR3g_KgXXxJzR";
const SESSION_KEY = "sg_session";

// ---------- Sesi login admin (disimpan di browser) ----------
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setSession(s) {
  try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch {}
}
async function authCall(grant, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || "Gagal masuk");
  setSession({ access_token: data.access_token, refresh_token: data.refresh_token, email: data.user && data.user.email });
  return data;
}

// ---------- Panggilan ke database ----------
async function sb(path, options = {}, retried = false) {
  const s = getSession();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...(s ? { Authorization: `Bearer ${s.access_token}` } : {}),
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (res.status === 401 && s && !retried) {
    // Sesi kedaluwarsa: coba perbarui, kalau gagal lanjut sebagai pengunjung
    try { await authCall("refresh_token", { refresh_token: s.refresh_token }); } catch { setSession(null); }
    return sb(path, options, true);
  }
  const text = await res.text();
  if (!res.ok) throw new Error("Supabase error " + res.status + ": " + text);
  return text ? JSON.parse(text) : null;
}

const api = {
  // Umum (pengunjung)
  categories: () => sb("categories?select=*&order=name.asc"),
  sellers: () => sb("sellers?select=*&order=business_name.asc"),
  products: () => sb("products?select=*&order=created_at.desc"),
  async createOrder(o) {
    const order_code = "ORD-" + Date.now().toString(36).toUpperCase().slice(-6);
    await sb("orders", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ order_code, buyer_name: o.buyer_name, product_id: o.product_id, quantity: o.quantity })
    });
    return { order_code };
  },

  // Admin
  login: (email, password) => authCall("password", { email, password }),
  logout: () => setSession(null),
  saveProduct(p) {
    const body = JSON.stringify({
      product_code: p.product_code, name: p.name, category_id: p.category_id, price: p.price,
      description: p.description, stock: p.stock, seller_id: p.seller_id, image_url: p.image_url
    });
    const opt = { headers: { Prefer: "return=minimal" }, body };
    return p.id ? sb(`products?id=eq.${p.id}`, { method: "PATCH", ...opt }) : sb("products", { method: "POST", ...opt });
  },
  deleteProduct: (id) => sb(`products?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
};
