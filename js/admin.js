// =====================================================
// StudentGrow - admin.js (inti dashboard + produk + penjual + upload foto)
// Tab tambahan (kategori, pesanan) ada di file js/admin-*.js
// dan dimuat otomatis di bagian bawah file ini.
// Keamanan sebenarnya dijaga oleh aturan RLS di Supabase.
// =====================================================
let adminProducts = [], adminSellers = [], adminCats = [];
let adminTab = "produk", adminReady = false;
const adminTabs = {};
const ADMIN_PLAN = [["produk", "Produk"], ["penjual", "Penjual"], ["kategori", "Kategori"], ["pesanan", "Pesanan"]];

function registerAdminTab(key, tab) {
  adminTabs[key] = tab;
  if (adminReady && $("#adm")) drawAdmin();
}
const adminOn = (box, sel, fn) => box.querySelectorAll(sel).forEach((b) => (b.onclick = () => fn(b)));

// Foto yang gagal dimuat diganti gambar piring (di seluruh website)
document.addEventListener("error", (e) => {
  const t = e.target;
  if (t && t.tagName === "IMG" && !t.dataset.fb) { t.dataset.fb = "1"; t.src = ph("🍽️"); }
}, true);

// ---------- Upload foto ke Supabase Storage ----------
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object`;
const PUBLIC_BASE = `${STORAGE_BASE}/public/images/`;

function compressImage(file, max = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses foto"))), "image/jpeg", quality);
    };
    img.onerror = () => reject(new Error("File itu bukan foto yang bisa dibuka"));
    img.src = url;
  });
}

async function uploadImage(file, folder) {
  const s = getSession();
  if (!s) throw new Error("Sesi berakhir. Silakan login lagi.");
  try { await authCall("refresh_token", { refresh_token: s.refresh_token }); }
  catch { throw new Error("Sesi berakhir. Silakan login lagi."); }
  const blob = await compressImage(file);
  const path = `${folder}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.jpg`;
  const res = await fetch(`${STORAGE_BASE}/images/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${getSession().access_token}`, "Content-Type": "image/jpeg" },
    body: blob
  });
  if (!res.ok) throw new Error("Upload gagal (" + res.status + "): " + (await res.text()));
  return PUBLIC_BASE + path;
}

// Hapus file lama dari Storage (kalau gagal, diabaikan)
async function deleteStored(url) {
  if (!url || !String(url).startsWith(PUBLIC_BASE)) return;
  const s = getSession();
  if (!s) return;
  try {
    await fetch(`${STORAGE_BASE}/images/${url.slice(PUBLIC_BASE.length)}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}` }
    });
  } catch {}
}

// Bagian form untuk pilih foto dari galeri
function photoHtml(id, url, placeholder, round) {
  return `<label for="${id}f">Foto (dari galeri)</label>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:4px">
      <img id="${id}pre" src="${url || placeholder}" alt="" style="width:72px;height:72px;object-fit:cover;flex:none;background:#E3F4EE;border-radius:${round ? "50%" : "14px"}">
      <div style="flex:1;min-width:0"><input id="${id}f" type="file" accept="image/*">
        ${url ? `<button type="button" class="btn line" id="${id}rm" style="padding:5px 12px;font-size:.8rem;margin-top:6px">Hapus foto</button>` : ""}</div></div>`;
}
function wirePhoto(id, state, placeholder) {
  $("#" + id + "f").onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    state.file = f; state.remove = false;
    $("#" + id + "pre").src = URL.createObjectURL(f);
  };
  const rm = $("#" + id + "rm");
  if (rm) rm.onclick = () => {
    state.file = null; state.remove = true;
    $("#" + id + "pre").src = placeholder;
    $("#" + id + "f").value = "";
  };
}

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
  adminReady = false;
  setTimeout(loadAdmin);
  return `<div id="adm">${loading()}</div>`;
};

async function loadAdmin() {
  try {
    [adminProducts, adminSellers, adminCats] = await Promise.all([api.products(), api.sellers(), api.categories()]);
    adminReady = true;
    drawAdmin();
  } catch (e) {
    console.error(e);
    const box = $("#adm");
    if (box) box.innerHTML = errorBox();
  }
}

function drawAdmin() {
  const box = $("#adm");
  if (!box) return;
  const chips = ADMIN_PLAN.map(([key, label]) => adminTabs[key]
    ? `<button class="chip" data-tab="${key}" style="${adminTab === key ? "background:var(--green);color:#fff;border-color:var(--green)" : ""}">${label}</button>`
    : `<span class="chip muted">${label} (segera)</span>`).join("");
  const current = adminTabs[adminTab] || adminTabs.produk;
  box.innerHTML = `
    <div class="row"><div><h2 style="margin:0">Dashboard Admin</h2>
      <div class="muted" style="font-size:.85rem">${esc((getSession() || {}).email)}</div></div>
      <button class="btn line" id="lo" style="padding:8px 16px">Keluar</button></div>
    <div class="chips" style="margin:16px 0">${chips}</div>
    <div id="adm-body">${current.render()}</div>`;
  $("#lo").onclick = () => { api.logout(); toast("Anda sudah keluar"); location.hash = "#/login"; };
  adminOn(box, "[data-tab]", (b) => { adminTab = b.dataset.tab; drawAdmin(); });
  if (current.bind) current.bind($("#adm-body"));
}

const sName = (id) => (adminSellers.find((s) => s.id === id) || {}).business_name || "-";

// ---------- Tab Produk ----------
registerAdminTab("produk", {
  render() {
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
  },
  bind(box) {
    box.querySelector("#addp").onclick = () => productForm();
    adminOn(box, "[data-edit]", (b) => productForm(adminProducts.find((x) => x.id == b.dataset.edit)));
    adminOn(box, "[data-del]", (b) => deleteProduct(adminProducts.find((x) => x.id == b.dataset.del)));
  }
});

async function deleteProduct(p) {
  if (!p || !confirm(`Hapus "${p.name}"? Pesanan untuk produk ini juga ikut terhapus.`)) return;
  try {
    await api.deleteProduct(p.id);
    deleteStored(p.image_url);
    toast("Produk dihapus");
    loadAdmin();
  } catch (err) { alert("Gagal menghapus: " + err.message); }
}

function productForm(p) {
  const isNew = !p;
  p = p || { name: "", category_id: (adminCats[0] || {}).id, price: "", stock: "", seller_id: (adminSellers[0] || {}).id, description: "", image_url: null };
  const m = $("#modal");
  m.hidden = false;
  const opts = (list, val, label) => list.map((x) => `<option value="${x.id}" ${x.id == val ? "selected" : ""}>${esc(x[label])}</option>`).join("");
  const ph0 = pImg({});
  m.innerHTML = `<form class="sheet" id="pf" novalidate><h2>${isNew ? "Tambah produk" : "Edit produk"}</h2>
    <label for="pn">Nama produk</label><input id="pn" maxlength="80" value="${esc(p.name)}"><div class="err" id="x1"></div>
    <label for="pc">Kategori</label><select id="pc"><option value="">Tanpa kategori</option>${opts(adminCats, p.category_id, "name")}</select>
    <label for="pp">Harga (Rp)</label><input id="pp" type="number" min="0" inputmode="numeric" value="${esc(p.price)}"><div class="err" id="x2"></div>
    <label for="ps">Stok</label><input id="ps" type="number" min="0" inputmode="numeric" value="${esc(p.stock)}"><div class="err" id="x3"></div>
    <label for="pl">Penjual</label><select id="pl">${opts(adminSellers, p.seller_id, "business_name")}</select>
    <label for="pd">Deskripsi</label><textarea id="pd" rows="3" style="font:inherit;padding:11px 14px;border:1px solid var(--line);border-radius:12px;width:100%">${esc(p.description)}</textarea>
    ${photoHtml("pph", p.image_url, ph0, false)}
    <div class="acts"><button type="button" class="btn line" id="pcx">Batal</button><button class="btn" id="psv">Simpan</button></div></form>`;
  const st = { file: null, remove: false };
  wirePhoto("pph", st, ph0);
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
    const btn = $("#psv"); btn.disabled = true; btn.textContent = "Menyimpan...";
    let uploaded = null;
    try {
      let image_url = p.image_url || null;
      if (st.file) { uploaded = await uploadImage(st.file, "products"); image_url = uploaded; }
      else if (st.remove) image_url = null;
      await api.saveProduct({
        id: isNew ? null : p.id, product_code: code, name, price, stock,
        category_id: +$("#pc").value || null, seller_id: +$("#pl").value,
        description: $("#pd").value.trim(), image_url
      });
      if (p.image_url && p.image_url !== image_url) deleteStored(p.image_url);
      close(); toast("Produk disimpan"); loadAdmin();
    } catch (err) {
      if (uploaded) deleteStored(uploaded);
      btn.disabled = false; btn.textContent = "Simpan";
      alert("Gagal menyimpan: " + err.message);
    }
  };
  $("#pn").focus();
}

// ---------- Tab Penjual ----------
registerAdminTab("penjual", {
  render() {
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
  },
  bind(box) {
    box.querySelector("#adds").onclick = () => sellerForm();
    adminOn(box, "[data-sedit]", (b) => sellerForm(adminSellers.find((x) => x.id == b.dataset.sedit)));
    adminOn(box, "[data-sdel]", (b) => deleteSeller(adminSellers.find((x) => x.id == b.dataset.sdel)));
  }
});

async function deleteSeller(s) {
  if (!s) return;
  const prods = adminProducts.filter((p) => p.seller_id === s.id);
  if (!confirm(`Hapus penjual "${s.business_name}"? ${prods.length} produk milik penjual ini beserta pesanannya juga ikut terhapus.`)) return;
  try {
    await api.deleteSeller(s.id);
    deleteStored(s.profile_image_url);
    prods.forEach((p) => deleteStored(p.image_url));
    toast("Penjual dihapus");
    loadAdmin();
  } catch (err) { alert("Gagal menghapus: " + err.message); }
}

function sellerForm(s) {
  const isNew = !s;
  s = s || { business_name: "", student_name: "", whatsapp: "", business_description: "", profile_image_url: null };
  const m = $("#modal");
  m.hidden = false;
  const ph0 = sImg({});
  m.innerHTML = `<form class="sheet" id="sf" novalidate><h2>${isNew ? "Tambah penjual" : "Edit penjual"}</h2>
    <label for="sn">Nama usaha</label><input id="sn" maxlength="80" value="${esc(s.business_name)}"><div class="err" id="y1"></div>
    <label for="sm">Nama mahasiswa</label><input id="sm" maxlength="80" value="${esc(s.student_name)}"><div class="err" id="y2"></div>
    <label for="sw">Nomor WhatsApp</label><input id="sw" type="tel" inputmode="tel" placeholder="Contoh: 081234567890" value="${esc(s.whatsapp)}"><div class="err" id="y3"></div>
    <label for="sd">Deskripsi usaha</label><textarea id="sd" rows="3" style="font:inherit;padding:11px 14px;border:1px solid var(--line);border-radius:12px;width:100%">${esc(s.business_description)}</textarea>
    ${photoHtml("sph", s.profile_image_url, ph0, true)}
    <div class="acts"><button type="button" class="btn line" id="scx">Batal</button><button class="btn" id="ssv">Simpan</button></div></form>`;
  const st = { file: null, remove: false };
  wirePhoto("sph", st, ph0);
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
    const btn = $("#ssv"); btn.disabled = true; btn.textContent = "Menyimpan...";
    let uploaded = null;
    try {
      let profile_image_url = s.profile_image_url || null;
      if (st.file) { uploaded = await uploadImage(st.file, "sellers"); profile_image_url = uploaded; }
      else if (st.remove) profile_image_url = null;
      await api.saveSeller({
        id: isNew ? null : s.id, seller_code: code, business_name: bn, student_name: sm, whatsapp: wa,
        business_description: $("#sd").value.trim(), profile_image_url
      });
      if (s.profile_image_url && s.profile_image_url !== profile_image_url) deleteStored(s.profile_image_url);
      close(); toast("Penjual disimpan"); loadAdmin();
    } catch (err) {
      if (uploaded) deleteStored(uploaded);
      btn.disabled = false; btn.textContent = "Simpan";
      alert("Gagal menyimpan: " + err.message);
    }
  };
  $("#sn").focus();
}

// ---------- Muat tab tambahan (kalau filenya ada) ----------
["js/admin-kategori.js", "js/admin-pesanan.js"].forEach((src) => {
  const el = document.createElement("script");
  el.src = src;
  document.body.appendChild(el);
});

route();
