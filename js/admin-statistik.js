// =====================================================
// StudentGrow - admin-statistik.js (Tahap 8: statistik dashboard)
// Menambahkan kartu angka di atas dashboard admin.
// =====================================================
(function () {
  const baseDraw = drawAdmin;
  let cachedOrders = null;
  if (!api.orders) api.orders = () => sb("orders?select=*&order=created_at.desc");

  function statsHtml(orders) {
    const total = orders ? orders.length : "…";
    const proc = orders ? orders.filter((o) => o.status === "Diproses").length : "…";
    const card = (label, val, hl) =>
      `<div class="card" style="padding:12px;${hl ? "background:#FFF3CD;border-color:#F2D98A" : ""}">
        <div class="muted" style="font-size:.78rem">${label}</div>
        <b style="font-size:1.6rem;line-height:1.2">${val}</b></div>`;
    return card("Produk", adminProducts.length) + card("Penjual", adminSellers.length) +
      card("Kategori", adminCats.length) + card("Pesanan", total) +
      card("Sedang diproses", proc, orders && proc > 0);
  }

  function paint(orders) {
    const el = document.getElementById("stats");
    if (el) el.innerHTML = statsHtml(orders);
  }

  drawAdmin = function () {
    baseDraw();
    const chips = document.querySelector("#adm .chips");
    if (!chips) return;
    const div = document.createElement("div");
    div.id = "stats";
    div.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:16px";
    chips.parentNode.insertBefore(div, chips);
    paint(cachedOrders);
    api.orders().then((o) => { cachedOrders = o; paint(o); }).catch(() => {});
  };
})();
