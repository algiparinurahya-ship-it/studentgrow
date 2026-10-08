// =====================================================
// StudentGrow - admin-pesanan.js (Tahap 7: kelola pesanan)
// Dimuat otomatis oleh js/admin.js
// =====================================================
let adminOrders = null, orderFilter = "Semua";

api.orders = () => sb("orders?select=*&order=created_at.desc");
api.setOrderStatus = (id, status) =>
  sb(`orders?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) });
api.deleteOrder = (id) => sb(`orders?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

async function loadOrders() {
  try { adminOrders = await api.orders(); }
  catch (e) { adminOrders = []; alert("Gagal memuat pesanan: " + e.message); }
  if (adminTab === "pesanan") drawAdmin();
}

registerAdminTab("pesanan", {
  render() {
    if (adminOrders === null) return loading();
    const count = (s) => adminOrders.filter((o) => o.status === s).length;
    const filters = [["Semua", adminOrders.length], ["Diproses", count("Diproses")], ["Selesai", count("Selesai")]];
    const list = adminOrders.filter((o) => orderFilter === "Semua" || o.status === orderFilter);
    return `<div class="row" style="align-items:center;margin-bottom:12px"><h2 style="margin:0">Pesanan</h2>
      <button class="btn line" id="reo" style="padding:8px 16px">Muat ulang</button></div>
    <div class="chips" style="margin-bottom:14px">${filters.map(([k, n]) =>
      `<button class="chip" data-of="${k}" style="${orderFilter === k ? "background:var(--green);color:#fff;border-color:var(--green)" : ""}">${k} (${n})</button>`).join("")}</div>
    ${list.length ? list.map((o) => {
      const p = adminProducts.find((x) => x.id === o.product_id) || {};
      const done = o.status === "Selesai";
      const when = new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      return `<article class="card" style="padding:14px;margin-bottom:10px;gap:6px">
        <div class="row" style="align-items:center"><b>${esc(o.order_code)}</b>
          <span class="tag" style="${done ? "" : "background:#FFF3CD;color:#8A6100"}">${esc(o.status)}</span></div>
        <div><b>${esc(o.buyer_name)}</b> memesan ${o.quantity} × ${esc(p.name || "(produk dihapus)")}</div>
        <div class="muted" style="font-size:.85rem">Penjual: ${esc(sName(p.seller_id))} · ${esc(when)}</div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="btn ${done ? "line" : ""}" data-ost="${o.id}" style="flex:1;padding:8px 12px;font-size:.88rem">${done ? "Kembalikan ke Diproses" : "Tandai Selesai"}</button>
          <button class="btn" data-odel="${o.id}" style="padding:8px 14px;font-size:.88rem;background:var(--red)">Hapus</button></div>
      </article>`;
    }).join("") : empty(adminOrders.length ? "Tidak ada pesanan dengan status ini." : "Belum ada pesanan masuk.")}`;
  },
  bind(box) {
    if (adminOrders === null) { loadOrders(); return; }
    box.querySelector("#reo").onclick = () => { adminOrders = null; drawAdmin(); };
    adminOn(box, "[data-of]", (b) => { orderFilter = b.dataset.of; drawAdmin(); });
    adminOn(box, "[data-ost]", async (b) => {
      const o = adminOrders.find((x) => x.id == b.dataset.ost);
      if (!o) return;
      b.disabled = true;
      try {
        await api.setOrderStatus(o.id, o.status === "Selesai" ? "Diproses" : "Selesai");
        toast("Status diperbarui");
        adminOrders = null; drawAdmin();
      } catch (err) { b.disabled = false; alert("Gagal mengubah status: " + err.message); }
    });
    adminOn(box, "[data-odel]", async (b) => {
      const o = adminOrders.find((x) => x.id == b.dataset.odel);
      if (!o || !confirm(`Hapus pesanan ${o.order_code} dari ${o.buyer_name}?`)) return;
      try {
        await api.deleteOrder(o.id);
        toast("Pesanan dihapus");
        adminOrders = null; drawAdmin();
      } catch (err) { alert("Gagal menghapus: " + err.message); }
    });
  }
});
