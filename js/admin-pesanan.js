// =====================================================
// StudentGrow - admin-pesanan.js (kelola pesanan + status pembayaran)
// Dimuat otomatis oleh js/admin.js
// =====================================================
let adminOrders = null, orderFilter = "Semua";

api.orders = () => sb("orders?select=*&order=created_at.desc");
api.setOrderStatus = (id, status) =>
  sb(`orders?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) });
api.setPaymentStatus = (id, payment_status) =>
  sb(`orders?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ payment_status }) });
api.deleteOrder = (id) => sb(`orders?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

const orderMatch = (o, f) =>
  f === "Semua" ? true : f === "Belum bayar" ? o.payment_status !== "Sudah dibayar" : o.status === f;

async function loadOrders() {
  try { adminOrders = await api.orders(); }
  catch (e) { adminOrders = []; alert("Gagal memuat pesanan: " + e.message); }
  if (adminTab === "pesanan") drawAdmin();
}

registerAdminTab("pesanan", {
  render() {
    if (adminOrders === null) return loading();
    const filters = ["Semua", "Belum bayar", "Diproses", "Selesai"].map((k) => [k, adminOrders.filter((o) => orderMatch(o, k)).length]);
    const list = adminOrders.filter((o) => orderMatch(o, orderFilter));
    return `<div class="row" style="align-items:center;margin-bottom:12px"><h2 style="margin:0">Pesanan</h2>
      <button class="btn line" id="reo" style="padding:8px 16px">Muat ulang</button></div>
    <div class="chips" style="margin-bottom:14px">${filters.map(([k, n]) =>
      `<button class="chip" data-of="${k}" style="${orderFilter === k ? "background:var(--green);color:#fff;border-color:var(--green)" : ""}">${k} (${n})</button>`).join("")}</div>
    ${list.length ? list.map((o) => {
      const p = adminProducts.find((x) => x.id === o.product_id) || {};
      const done = o.status === "Selesai", paid = o.payment_status === "Sudah dibayar";
      const when = new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      return `<article class="card" style="padding:14px;margin-bottom:10px;gap:6px">
        <div class="row" style="align-items:center"><b>${esc(o.order_code)}</b>
          <span class="tag" style="${done ? "" : "background:#FFF3CD;color:#8A6100"}">${esc(o.status)}</span></div>
        <div><b>${esc(o.buyer_name)}</b> memesan ${o.quantity} × ${esc(p.name || "(produk dihapus)")}</div>
        <div class="muted" style="font-size:.85rem">Penjual: ${esc(sName(p.seller_id))} · ${esc(when)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <b>${o.total_price != null ? rp(o.total_price) : "-"}</b>
          <span class="muted" style="font-size:.85rem">${esc(o.payment_method || "Cara bayar tidak dipilih")}</span>
          <span class="tag ${paid ? "" : "out"}">${paid ? "Sudah dibayar" : "Belum bayar"}</span></div>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          <button class="btn ${paid ? "line" : ""}" data-opay="${o.id}" style="flex:1;min-width:140px;padding:8px 12px;font-size:.88rem">${paid ? "Batalkan status bayar" : "Tandai sudah dibayar"}</button>
          <button class="btn ${done ? "line" : ""}" data-ost="${o.id}" style="flex:1;min-width:140px;padding:8px 12px;font-size:.88rem">${done ? "Kembalikan ke Diproses" : "Tandai Selesai"}</button>
          <button class="btn" data-odel="${o.id}" style="padding:8px 14px;font-size:.88rem;background:var(--red)">Hapus</button></div>
      </article>`;
    }).join("") : empty(adminOrders.length ? "Tidak ada pesanan untuk filter ini." : "Belum ada pesanan masuk.")}`;
  },
  bind(box) {
    if (adminOrders === null) { loadOrders(); return; }
    const find = (b, attr) => adminOrders.find((x) => x.id == b.dataset[attr]);
    box.querySelector("#reo").onclick = () => { adminOrders = null; drawAdmin(); };
    adminOn(box, "[data-of]", (b) => { orderFilter = b.dataset.of; drawAdmin(); });
    const change = async (b, fn, okMsg) => {
      b.disabled = true;
      try { await fn(); toast(okMsg); adminOrders = null; drawAdmin(); }
      catch (err) { b.disabled = false; alert("Gagal: " + err.message); }
    };
    adminOn(box, "[data-opay]", (b) => {
      const o = find(b, "opay");
      if (o) change(b, () => api.setPaymentStatus(o.id, o.payment_status === "Sudah dibayar" ? "Belum bayar" : "Sudah dibayar"), "Status bayar diperbarui");
    });
    adminOn(box, "[data-ost]", (b) => {
      const o = find(b, "ost");
      if (o) change(b, () => api.setOrderStatus(o.id, o.status === "Selesai" ? "Diproses" : "Selesai"), "Status diperbarui");
    });
    adminOn(box, "[data-odel]", (b) => {
      const o = find(b, "odel");
      if (o && confirm(`Hapus pesanan ${o.order_code} dari ${o.buyer_name}?`)) change(b, () => api.deleteOrder(o.id), "Pesanan dihapus");
    });
  }
});
