// =====================================================
// StudentGrow - admin.js (Tahap 5: kelola produk + kelola penjual)
// Dimuat SETELAH app.js, lalu menggantikan halaman Login & Dashboard.
// Keamanan sebenarnya dijaga oleh aturan RLS di Supabase.
// =====================================================
let adminProducts = [], adminSellers = [], adminCats = [];
let adminTab = "produk";

// ---------- API tambahan untuk penjual ----------
api.saveSeller = function (s) {
  const body = JSON.stringify({
    seller_code: s.seller_code, business_name: s.business_name, student_name: s.student_name,
    profile_image_url: s.profile_image_url, business_description: s.business_description, whatsapp: s.whatsapp
  });
  const opt = { headers: { Prefer: "return=minimal" }, body };
  return s.id ? sb(`sellers?id=eq.${s.id}`, { method: "PATCH", ...opt }) : sb("sellers", { method: "POST", ...opt });
};
api.deleteSeller = (id) => sb(`sellers?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

// Ubah nomor ke format 62xxxxxxxxxx (tanpa +, tanpa 0 di depan)
function normWa(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}

// ---------- Login & dashboard ----------
viewLogin = function () {
  if (getSession()) { location.hash = "#/admin"; return ""; }
  setTimeout(() => {
    const f = $("#lf");
    if (!f) return;
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#lbtn");
      btn.disabled = true; $("#lerr").textContent = "";
      try {
        await api.login($("#em").value.trim(), $("#pw").value);
        toast("Berhasil masuk");
        location.hash = "#/admin";
      } catch (err) {
        $("#lerr").textContent = "Email atau password salah.";
        btn.disabled = false;
      }
    });
  });
  return `<form class="login" id="lf"><h2>Login Admin</h2>
    <label for="em">Email</label><input id="em" type="email" autocomplete="username" required>
    <label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required>
    <div class="err" id="lerr"></div>
    <p style="margin-top:16px"><button class="btn" id="lbtn" style="width:100%">Masuk</button></p></form>`;
};

viewAdmin = function () {
  if (!getSession()) { location.hash = "#/login"; return ""; }
  setTimeout(loadAdmin);
  return `<div id="adm">${loading()}</div>`;
};

async function loadAdmin() {
  try {
    [adminProducts, adminSellers, adminCats] = await Promise.all([api.products(), api.sellers(), api.categories()]);
    drawAdmin();
  } catch (e) {
    console.error(e);
    const box = $("#adm");
    if (box) box.innerHTML = errorBox();
  }
}

const sName = (id) => (adminSellers.find((s) => s.id === id) || {}).business_name || "-";

function productsSection() {
  return `<div class="row" style="align-items:center;margin-bottom:12px"><h2 style="margin:0">Produk (${adminProducts.length})</h2>
      <button class="btn" id="addp" style="padding:9px 18px">+ Tambah</button></div>
    ${adminProducts.length ? adminProducts.map((p) => `
      <article class="card" style="flex-direction:row;align-items:center;gap:12px;padding:10px;margin-bottom:10px">
        <img src="${pImg(p)}" alt="" style="width:56px;height:56px;border-radius:12px;object-fit:cover;flex:none">
        <div style="flex:1;min-width:0"><b>${esc(p.name)}</b>
          <div class="muted" style="font-size:.85rem">${rp(p.price)} · stok ${p.stock} · ${esc(sName(p.seller_id))}</div></div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn line" data-edit="${p.id}" style="padding:6px 14px;font-size:.85rem">Edit</button>
          <button class="btn" data-del="${p.id}" style="padding:6px 14px;font-size:.85rem;background:var(--red)">Hapus</button></div>
      </article>`).join("") : empty("Belum ada produk. Ketuk + Tambah.")}`;
}

function sellersSection() {
  return `<div class="row" style="align-items:center;margin-bottom:12px"><h2 style="margin:0">Penjual (${adminSellers.length})</h2>
      <button class="btn" id="adds" style="padding:9px 18px">+ Tambah</button></div>
    ${adminSellers.length ? adminSellers.map((s) => {
      const n = adminProducts.filter((p) => p.seller_id === s.id).length;
      return `<article class="card" style="flex-direction:row;align-items:center;gap:12px;padding:10px;margin-bottom:10px">
        <img src="${sImg(s)}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex:none">
        <div style="flex:1;min-width:0"><b>${esc(s.business_name)}</b>
          <div class="muted" style="font-size:.85rem">${esc(s.student_name)} · +${esc(s.whatsapp)} · ${n} produk</div></div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn line" data-sedit="${s.id}" style="padding:6px 14px;font-size:.85rem">Edit</button>
          <button class="btn" data-sdel="${s.id}" style="padding:6px 14px;font-size:.85rem;background:var(--red)">Hapus</button></div>
      </article>`;
    }).join("") : empty("Belum ada penjual. Ketuk + Tambah.")}`;
}

function drawAdmin() {
  const box = $("#adm");
  if (!box) return;
  const tab = (key, label) => `<button class="chip" data-tab="${key}" style="${adminTab === key ? "background:var(--green);color:#fff;border-color:var(--green)" : ""}">${label}</button>`;
  box.innerHTML = `
    <div class="row"><div><h2 style="margin:0">Dashboard Admin</h2>
      <div class="muted" style="font-size:.85rem">${esc((getSession() || {}).email)}</div></div>
      <button class="btn line" id="lo" style="padding:8px 16px">Keluar</button></div>
    <div class="chips" style="margin:16px 0">${tab("produk", "Produk")}${tab("penjual", "Penjual")}
      <span class="chip muted">Kategori (segera)</span><span class="chip muted">Pesanan (segera)</span></div>
    ${adminTab === "produk" ? productsSection() : sellersSection()}`;
  $("#lo").onclick = () => { api.logout(); toast("Anda sudah keluar"); location.hash = "#/login"; };
  box.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { adminTab = b.dataset.tab; drawAdmin(); }));
  const on = (sel, fn) => box.querySelectorAll(sel).forEach((b) => (b.onclick = () => fn(b)));
  if ($("#addp")) $("#addp").onclick = () => productForm();
  if ($("#adds")) $("#adds").onclick = () => sellerForm();
  on("[data-edit]", (b) => productForm(adminProducts.find((x) => x.id == b.dataset.edit)));
  on("[data-del]", (b) => deleteProduct(adminProducts.find((x) => x.id == b.dataset.del)));
  on("[data-sedit]", (b) => sellerForm(adminSellers.find((x) => x.id == b.dataset.sedit)));
  on("[data-sdel]", (b) => deleteSeller(adminSellers.find((x) => x.id == b.dataset.sdel)));
}

// ---------- Produk ----------
async function deleteProduct(p) {
  if (!p || !confirm(`Hapus "${p.name}"? Pesanan untuk produk ini juga ikut terhapus.`)) return;
  try {
    await api.deleteProduct(p.id);
    toast("Produk dihapus");
    loadAdmin();
  } catch (err) { alert("Gagal menghapus: " + err.message); }
}

function productForm(p) {
  const isNew = !p;
  p = p || { name: "", category_id: (adminCats[0] || {}).id, price: "", stock: "", seller_id: (adminSellers[0] || {}).id, description: "", image_url: "" };
  const m = $("#modal");
  m.hidden = false;
  const opts = (list, val, label) => list.map((x) => `<option value="${x.id}" ${x.id == val ? "selected" : ""}>${esc(x[label])}</option>`).join("");
  m.innerHTML = `<form class="sheet" id="pf" novalidate><h2>${isNew ? "Tambah produk" : "Edit produk"}</h2>
    <label for="pn">Nama produk</label><input id="pn" maxlength="80" value="${esc(p.name)}"><div class="err" id="x1"></div>
    <label for="pc">Kategori</label><select id="pc">${opts(adminCats, p.category_id, "name")}</select>
    <label for="pp">Harga (Rp)</label><input id="pp" type="number" min="0" inputmode="numeric" value="${esc(p.price)}"><div class="err" id="x2"></div>
    <label for="ps">Stok</label><input id="ps" type="number" min="0" inputmode="numeric" value="${esc(p.stock)}"><div class="err" id="x3"></div>
    <label for="pl">Penjual</label><select id="pl">${opts(adminSellers, p.seller_id, "business_name")}</select>
    <label for="pd">Deskripsi</label><textarea id="pd" rows="3" style="font:inherit;padding:11px 14px;border:1px solid var(--line);border-radius:12px;width:100%">${esc(p.description)}</textarea>
    <label for="pi">Link foto (opsional)</label><input id="pi" type="url" placeholder="https://..." value="${esc(p.image_url)}">
    <div class="acts"><button type="button" class="btn line" id="pcx">Batal</button><button class="btn" id="psv">Simpan</button></div></form>`;
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  $("#pcx").onclick = close;
  $("#pf").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#pn").value.trim(), price = parseInt($("#pp").value, 10), stock = parseInt($("#ps").value, 10);
    $("#x1").textContent = name.length < 2 ? "Isi nama produk." : "";
    $("#x2").textContent = isNaN(price) || price < 0 ? "Isi harga dengan angka." : "";
    $("#x3").textContent = isNaN(stock) || stock < 0 ? "Isi stok dengan angka." : "";
    if ($("#x1").textContent || $("#x2").textContent || $("#x3").textContent) return;
    const code = isNew
      ? String(Math.max(0, ...adminProducts.map((x) => parseInt(x.product_code, 10) || 0)) + 1).padStart(3, "0")
      : p.product_code;
    const data = {
      id: isNew ? null : p.id, product_code: code, name, price, stock,
      category_id: +$("#pc").value || null, seller_id: +$("#pl").value,
      description: $("#pd").value.trim(), image_url: $("#pi").value.trim() || null
    };
    const btn = $("#psv"); btn.disabled = true;
    try {
      await api.saveProduct(data);
      close(); toast("Produk disimpan"); loadAdmin();
    } catch (err) {
      btn.disabled = false;
      alert("Gagal menyimpan: " + err.message);
    }
  };
  $("#pn").focus();
}

// ---------- Penjual ----------
async function deleteSeller(s) {
  if (!s) return;
  const n = adminProducts.filter((p) => p.seller_id === s.id).length;
  if (!confirm(`Hapus penjual "${s.business_name}"? ${n} produk milik penjual ini beserta pesanannya juga ikut terhapus.`)) return;
  try {
    await api.deleteSeller(s.id);
    toast("Penjual dihapus");
    loadAdmin();
  } catch (err) { alert("Gagal menghapus: " + err.message); }
}

function sellerForm(s) {
  const isNew = !s;
  s = s || { business_name: "", student_name: "", whatsapp: "", business_description: "", profile_image_url: "" };
  const m = $("#modal");
  m.hidden = false;
  m.innerHTML = `<form class="sheet" id="sf" novalidate><h2>${isNew ? "Tambah penjual" : "Edit penjual"}</h2>
    <label for="sn">Nama usaha</label><input id="sn" maxlength="80" value="${esc(s.business_name)}"><div class="err" id="y1"></div>
    <label for="sm">Nama mahasiswa</label><input id="sm" maxlength="80" value="${esc(s.student_name)}"><div class="err" id="y2"></div>
    <label for="sw">Nomor WhatsApp</label><input id="sw" type="tel" inputmode="tel" placeholder="Contoh: 081234567890" value="${esc(s.whatsapp)}"><div class="err" id="y3"></div>
    <label for="sd">Deskripsi usaha</label><textarea id="sd" rows="3" style="font:inherit;padding:11px 14px;border:1px solid var(--line);border-radius:12px;width:100%">${esc(s.business_description)}</textarea>
    <label for="si">Link foto profil (opsional)</label><input id="si" type="url" placeholder="https://..." value="${esc(s.profile_image_url)}">
    <div class="acts"><button type="button" class="btn line" id="scx">Batal</button><button class="btn" id="ssv">Simpan</button></div></form>`;
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  $("#scx").onclick = close;
  $("#sf").onsubmit = async (e) => {
    e.preventDefault();
    const bn = $("#sn").value.trim(), sm = $("#sm").value.trim(), wa = normWa($("#sw").value);
    $("#y1").textContent = bn.length < 2 ? "Isi nama usaha." : "";
    $("#y2").textContent = sm.length < 2 ? "Isi nama mahasiswa." : "";
    $("#y3").textContent = /^62\d{8,13}$/.test(wa) ? "" : "Nomor tidak valid. Contoh: 081234567890";
    if ($("#y1").textContent || $("#y2").textContent || $("#y3").textContent) return;
    const code = isNew
      ? "S" + String(Math.max(0, ...adminSellers.map((x) => parseInt(String(x.seller_code).replace(/\D/g, ""), 10) || 0)) + 1).padStart(3, "0")
      : s.seller_code;
    const data = {
      id: isNew ? null : s.id, seller_code: code, business_name: bn, student_name: sm, whatsapp: wa,
      business_description: $("#sd").value.trim(), profile_image_url: $("#si").value.trim() || null
    };
    const btn = $("#ssv"); btn.disabled = true;
    try {
      await api.saveSeller(data);
      close(); toast("Penjual disimpan"); loadAdmin();
    } catch (err) {
      btn.disabled = false;
      alert("Gagal menyimpan: " + err.message);
    }
  };
  $("#sn").focus();
}

route();
