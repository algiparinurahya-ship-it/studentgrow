// =====================================================
// StudentGrow - app.js (Tahap 1: tampilan + data contoh)
// Semua pengambilan data lewat objek "api" di bawah.
// Di Tahap 3, hanya isi "api" yang diganti ke Supabase.
// =====================================================
const $ = (s) => document.querySelector(s);
const app = $("#app");
const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const wa = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text || "Halo, saya tertarik dengan produk Anda di StudentGrow.")}`;

// Gambar placeholder (ganti dengan image_url dari Supabase Storage nanti)
const ph = (emoji) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='#E3F4EE'/><text x='200' y='235' font-size='140' text-anchor='middle'>${emoji}</text></svg>`);
const pImg = (p) => p.image_url || ph("🍽️");
const sImg = (s) => s.profile_image_url || ph("🧑‍🎓");

// ---------- LAPISAN DATA (GANTI DI TAHAP 3) ----------
const apiSample = {
  async categories() { return SAMPLE_CATEGORIES; },          // TODO Supabase: from('categories')
  async sellers() { return SAMPLE_SELLERS; },                // TODO Supabase: from('sellers')
  async products() { return SAMPLE_PRODUCTS; },              // TODO Supabase: from('products')
  async createOrder(o) {                                      // TODO Supabase: insert ke 'orders'
    const order = { id: SAMPLE_ORDERS.length + 1, order_code: "ORD-" + String(SAMPLE_ORDERS.length + 1).padStart(3, "0"), status: "Diproses", created_at: new Date().toISOString(), ...o };
    SAMPLE_ORDERS.push(order);
    return order;
  }
};

// ---------- KOMPONEN KECIL ----------
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.id); toast.id = setTimeout(() => (t.hidden = true), 2800);
}
const loading = () => `<div class="grid"><div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>`;
const errorBox = () => `<div class="state">Data gagal dimuat. Periksa koneksi lalu <a href="javascript:location.reload()"><b>muat ulang</b></a>.</div>`;
const empty = (m) => `<div class="empty">${m}</div>`;

function productCard(p, sellers) {
  const s = sellers.find((x) => x.id === p.seller_id);
  const out = p.stock <= 0;
  return `<article class="card">
    <a href="#/produk/${p.id}"><img class="img" src="${pImg(p)}" alt="${esc(p.name)}" loading="lazy"></a>
    <div class="body">
      <h3>${esc(p.name)}</h3>
      <span class="price">${rp(p.price)}</span>
      <span class="muted" style="font-size:.8rem">${esc(s?.business_name)}</span>
      <span class="tag ${out ? "out" : ""}">${out ? "Stok habis" : "Stok " + p.stock}</span>
      <a class="btn line" href="#/produk/${p.id}">Lihat detail</a>
    </div></article>`;
}

function sellerCard(s) {
  return `<article class="card seller">
    <img class="av" src="${sImg(s)}" alt="${esc(s.business_name)}">
    <div><h3>${esc(s.business_name)}</h3>
      <div class="muted" style="font-size:.85rem">${esc(s.student_name)}</div>
      <div style="font-size:.9rem">${esc(s.business_description)}</div>
      <div class="acts"><a class="btn line" href="#/penjual/${s.id}">Lihat usaha</a>
      <a class="btn wa" href="${wa(s.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a></div></div></article>`;
}

// ---------- HALAMAN ----------
async function viewHome() {
  const [products, sellers, cats] = await Promise.all([api.products(), api.sellers(), api.categories()]);
  const featured = [...products].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4); // produk terbaru
  return `
  <section class="hero">
    <h1>StudentGrow</h1>
    <p>Platform digital yang membantu mahasiswa wirausaha memasarkan produk mereka secara mudah dan menjangkau lebih banyak pembeli.</p>
    <a class="btn light" href="#/produk">Lihat katalog produk</a>
  </section>
  <!-- BANNER: nanti ambil dari Supabase Storage -->
  <div class="promo">Dukung usaha mahasiswa<small>Pesan langsung, tanpa bayar online. Hubungi penjual lewat WhatsApp.</small></div>
  <section class="sec"><div class="row"><h2>Produk unggulan</h2><a href="#/produk">Semua</a></div>
    ${featured.length ? `<div class="grid">${featured.map((p) => productCard(p, sellers)).join("")}</div>` : empty("Belum ada produk.")}</section>
  <section class="sec"><h2>Kategori</h2><div class="chips">${cats.map((c) => `<a class="chip" href="#/produk?kategori=${c.id}">${esc(c.name)}</a>`).join("")}</div></section>
  <section class="sec"><div class="row"><h2>Penjual</h2><a href="#/penjual">Semua</a></div>
    <div class="grid sel">${sellers.map(sellerCard).join("")}</div></section>`;
}

async function viewProducts(query) {
  const [products, sellers, cats] = await Promise.all([api.products(), api.sellers(), api.categories()]);
  const params = new URLSearchParams(query || "");
  const html = `<h2>Produk</h2>
    <div class="filters">
      <input id="q" type="search" placeholder="Cari produk..." aria-label="Cari produk">
      <select id="cat" aria-label="Kategori"><option value="">Semua kategori</option>${cats.map((c) => `<option value="${c.id}" ${params.get("kategori") == c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
      <select id="sort" aria-label="Urutkan"><option value="new">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option></select>
    </div><div id="list"></div>`;
  setTimeout(() => {
    const draw = () => {
      const q = $("#q").value.toLowerCase().trim(), c = $("#cat").value, so = $("#sort").value;
      let r = products.filter((p) => p.name.toLowerCase().includes(q) && (!c || p.category_id == c));
      if (so === "low") r.sort((a, b) => a.price - b.price);
      else if (so === "high") r.sort((a, b) => b.price - a.price);
      else r.sort((a, b) => b.created_at.localeCompare(a.created_at));
      $("#list").innerHTML = r.length ? `<div class="grid">${r.map((p) => productCard(p, sellers)).join("")}</div>` : empty("Produk tidak ditemukan. Coba kata kunci atau kategori lain.");
    };
    ["q", "cat", "sort"].forEach((id) => $("#" + id).addEventListener("input", draw));
    draw();
  });
  return html;
}

async function viewProduct(id) {
  const [products, sellers, cats] = await Promise.all([api.products(), api.sellers(), api.categories()]);
  const p = products.find((x) => x.id == id);
  if (!p) return empty("Produk tidak ditemukan.") + `<p style="text-align:center;margin-top:12px"><a class="btn" href="#/produk">Ke katalog</a></p>`;
  const s = sellers.find((x) => x.id === p.seller_id), c = cats.find((x) => x.id === p.category_id);
  const out = p.stock <= 0;
  setTimeout(() => $("#orderBtn")?.addEventListener("click", () => openOrder(p)));
  return `<a class="back" href="javascript:history.back()">← Kembali</a>
  <div class="detail"><img class="big" src="${pImg(p)}" alt="${esc(p.name)}">
    <div><span class="tag">${esc(c?.name)}</span>
      <h1 style="font-size:1.7rem;margin-top:8px">${esc(p.name)}</h1>
      <div class="price" style="font-size:1.5rem">${rp(p.price)}</div>
      <p style="margin:12px 0">${esc(p.description)}</p>
      <span class="tag ${out ? "out" : ""}">${out ? "Stok habis" : "Stok " + p.stock}</span>
      <p style="margin-top:12px" class="muted">Penjual: <a href="#/penjual/${s?.id}"><b>${esc(s?.business_name)}</b></a> (${esc(s?.student_name)})</p>
      <div class="acts"><button class="btn" id="orderBtn" ${out ? "disabled" : ""}>Pesan</button>
      <a class="btn wa" target="_blank" rel="noopener" href="${wa(s?.whatsapp, "Halo, saya tertarik dengan " + p.name)}">Hubungi Penjual</a></div></div></div>`;
}

async function viewSellers() {
  const sellers = await api.sellers();
  return `<h2>Penjual</h2>${sellers.length ? `<div class="grid sel">${sellers.map(sellerCard).join("")}</div>` : empty("Belum ada penjual.")}`;
}

async function viewSeller(id) {
  const [products, sellers] = await Promise.all([api.products(), api.sellers()]);
  const s = sellers.find((x) => x.id == id);
  if (!s) return empty("Penjual tidak ditemukan.");
  const list = products.filter((p) => p.seller_id === s.id);
  return `<a class="back" href="javascript:history.back()">← Kembali</a>
  <div class="card seller" style="flex-direction:column;text-align:center;padding:24px">
    <img class="av" style="width:96px;height:96px" src="${sImg(s)}" alt="${esc(s.business_name)}">
    <h1 style="font-size:1.6rem">${esc(s.business_name)}</h1><div class="muted">${esc(s.student_name)}</div>
    <p>${esc(s.business_description)}</p><div class="muted">WhatsApp: +${esc(s.whatsapp)}</div>
    <a class="btn wa" target="_blank" rel="noopener" href="${wa(s.whatsapp)}">Chat via WhatsApp</a></div>
  <section class="sec"><h2>Produk ${esc(s.business_name)}</h2>
  ${list.length ? `<div class="grid">${list.map((p) => productCard(p, sellers)).join("")}</div>` : empty("Penjual ini belum punya produk.")}</section>`;
}

async function viewCategories() {
  const [cats, products] = await Promise.all([api.categories(), api.products()]);
  return `<h2>Kategori</h2><div class="grid sel">${cats.map((c) => `<a class="card" href="#/produk?kategori=${c.id}" style="padding:18px"><h3>${esc(c.name)}</h3><span class="muted">${products.filter((p) => p.category_id === c.id).length} produk</span></a>`).join("")}</div>`;
}

// Halaman Pemesanan: pesanan dibuat dari tombol "Pesan" di Detail Produk
function viewOrderInfo() {
  return `<h2>Pemesanan</h2><div class="state"><p>Untuk memesan, buka produk lalu tekan <b>Pesan</b>.</p><p style="margin-top:12px"><a class="btn" href="#/produk">Pilih produk</a></p></div>`;
}

// Tahap 8 akan mengisi Login & Dashboard dengan Supabase Auth
function viewLogin() {
  setTimeout(() => $("#lf")?.addEventListener("submit", (e) => { e.preventDefault(); toast("Login aktif di Tahap 8"); }));
  return `<form class="login" id="lf"><h2>Login Admin</h2>
    <label for="em">Email</label><input id="em" type="email" required>
    <label for="pw">Password</label><input id="pw" type="password" required>
    <p style="margin-top:16px"><button class="btn" style="width:100%">Masuk</button></p>
    <p class="muted" style="font-size:.8rem;margin-top:10px">Contoh tampilan. Login sungguhan dibuat di Tahap 8.</p></form>`;
}
function viewAdmin() {
  return `<h2>Dashboard Admin</h2><div class="state">Dashboard dibuat di Tahap 8. Halaman ini nanti hanya bisa dibuka setelah login.</div>`;
}

// ---------- FORM PESAN ----------
function openOrder(p) {
  const m = $("#modal");
  m.hidden = false;
  m.innerHTML = `<form class="sheet" id="of" novalidate><h2>Pesan ${esc(p.name)}</h2>
    <p class="muted">${rp(p.price)} · stok ${p.stock}</p>
    <label for="bn">Nama pembeli</label><input id="bn" maxlength="60" autocomplete="name"><div class="err" id="e1"></div>
    <label for="qt">Jumlah</label><input id="qt" type="number" min="1" max="${p.stock}" value="1"><div class="err" id="e2"></div>
    <p style="margin-top:12px">Total: <b id="tot">${rp(p.price)}</b></p>
    <div class="acts"><button type="button" class="btn line" id="cx">Batal</button><button class="btn">Konfirmasi pesanan</button></div></form>`;
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  $("#cx").onclick = close;
  m.onclick = (e) => { if (e.target === m) close(); };
  $("#qt").oninput = () => ($("#tot").textContent = rp(p.price * (+$("#qt").value || 0)));
  $("#of").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#bn").value.trim(), qty = parseInt($("#qt").value, 10);
    $("#e1").textContent = name.length < 3 ? "Isi nama minimal 3 huruf." : "";
    $("#e2").textContent = !qty || qty < 1 || qty > p.stock ? `Jumlah harus 1 sampai ${p.stock}.` : "";
    if ($("#e1").textContent || $("#e2").textContent) return;
    try {
      const o = await api.createOrder({ buyer_name: name, product_id: p.id, quantity: qty });
      close(); toast(`Pesanan ${o.order_code} berhasil dikirim`);
    } catch { toast("Pesanan gagal. Coba lagi."); }
  };
  $("#bn").focus();
}

// ---------- ROUTER ----------
const NAV = [["#/", "Beranda", "🏠"], ["#/produk", "Produk", "🛍️"], ["#/penjual", "Penjual", "🎓"], ["#/kategori", "Kategori", "🏷️"]];
async function route() {
  const [path, query] = (location.hash.slice(1) || "/").split("?");
  const seg = path.split("/").filter(Boolean);
  const active = "#/" + (seg[0] || "");
  const nav = (cls) => NAV.map(([h, t, i]) => `<a href="${h}" class="${h === active ? "on" : ""}">${cls ? `<b>${i}</b>` : ""}${t}</a>`).join("");
  $("#deskNav").innerHTML = nav(false); $("#tabNav").innerHTML = nav(true);
  app.innerHTML = loading();
  window.scrollTo(0, 0);
  try {
    const [a, b] = seg;
    app.innerHTML =
      !a ? await viewHome() :
      a === "produk" ? (b ? await viewProduct(b) : await viewProducts(query)) :
      a === "penjual" ? (b ? await viewSeller(b) : await viewSellers()) :
      a === "kategori" ? await viewCategories() :
      a === "pesan" ? viewOrderInfo() :
      a === "login" ? viewLogin() :
      a === "admin" ? viewAdmin() : empty("Halaman tidak ditemukan.");
  } catch (e) { console.error(e); app.innerHTML = errorBox(); }
}
window.addEventListener("hashchange", route);
route();
