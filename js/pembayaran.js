// =====================================================
// StudentGrow - pembayaran.js
// Pembayaran manual: transfer bank, DANA, GoPay, QRIS, atau bayar di tempat (COD).
// Dimuat setelah admin.js. Mengganti form pesan pembeli dan form penjual.
// =====================================================

// ---------- Util ----------
function phoneLocal(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("62")) d = "0" + d.slice(2);
  else if (d.startsWith("8")) d = "0" + d;
  return d;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast("Disalin: " + t); }
  catch (e) { window.prompt("Salin teks ini:", t); }
}

// Cara bayar yang tersedia untuk seorang penjual
function payMethods(s) {
  const list = [];
  if (s && s.bank_name && s.bank_account) list.push({ key: "Transfer Bank", label: "Transfer " + s.bank_name });
  if (s && s.dana_number) list.push({ key: "DANA", label: "DANA" });
  if (s && s.gopay_number) list.push({ key: "GoPay", label: "GoPay" });
  if (s && s.qris_image_url) list.push({ key: "QRIS", label: "QRIS" });
  list.push({ key: "COD", label: "Bayar di tempat (COD)" });
  return list;
}

function payDetailHtml(key, s) {
  const row = (label, val, copy) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px">
      <div style="min-width:0"><div class="muted" style="font-size:.8rem">${esc(label)}</div><b style="font-size:1.1rem;word-break:break-all">${esc(val)}</b></div>
      ${copy ? `<button type="button" class="btn line" data-copy="${esc(copy)}" style="padding:6px 14px;font-size:.85rem;flex:none">Salin</button>` : ""}</div>`;
  if (key === "Transfer Bank") return row("Bank", s.bank_name) + row("Nomor rekening", s.bank_account, s.bank_account) + row("Atas nama", s.bank_holder || "-");
  if (key === "DANA") return row("Kirim ke DANA", s.dana_number, s.dana_number);
  if (key === "GoPay") return row("Kirim ke GoPay", s.gopay_number, s.gopay_number);
  if (key === "QRIS") return `<img src="${esc(s.qris_image_url)}" alt="QRIS" style="width:100%;max-width:300px;margin:10px auto 0;border-radius:16px;border:1px solid var(--line)">
      <p class="muted" style="text-align:center;font-size:.85rem;margin-top:6px">Scan dengan aplikasi bank atau e-wallet apa saja.</p>`;
  return `<p style="margin-top:8px">Bayar tunai saat barang diterima. Penjual akan menghubungi Anda lewat WhatsApp.</p>`;
}

// Kode pesanan dibuat di sini; total harga dihitung oleh database
api.createOrder = async function (o) {
  const order_code = "ORD-" + Date.now().toString(36).toUpperCase().slice(-6);
  await sb("orders", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      order_code, buyer_name: o.buyer_name, product_id: o.product_id,
      quantity: o.quantity, payment_method: o.payment_method || null
    })
  });
  return { order_code };
};

// ---------- Form pesan pembeli ----------
async function openOrder(p) {
  const m = $("#modal");
  m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ""; m.onclick = null; };
  m.innerHTML = `<div class="sheet"><p class="muted">Memuat...</p></div>`;
  m.onclick = (e) => { if (e.target === m) close(); };
  let s = null;
  try { s = (await api.sellers()).find((x) => x.id === p.seller_id) || null; } catch (e) {}
  const methods = payMethods(s);
  m.innerHTML = `<form class="sheet" id="of" novalidate><h2>Pesan ${esc(p.name)}</h2>
    <p class="muted">${rp(p.price)} · stok ${p.stock}</p>
    <label for="bn">Nama pembeli</label><input id="bn" maxlength="60" autocomplete="name"><div class="err" id="e1"></div>
    <label for="qt">Jumlah</label><input id="qt" type="number" min="1" max="${p.stock}" value="1" inputmode="numeric"><div class="err" id="e2"></div>
    <label for="pm">Cara bayar</label><select id="pm">${methods.map((x) => `<option value="${esc(x.key)}">${esc(x.label)}</option>`).join("")}</select>
    <p style="margin-top:12px">Total: <b id="tot">${rp(p.price)}</b></p>
    <div class="acts"><button type="button" class="btn line" id="cx">Batal</button><button class="btn" id="osv">Konfirmasi pesanan</button></div></form>`;
  $("#cx").onclick = close;
  $("#qt").oninput = () => ($("#tot").textContent = rp(p.price * (+$("#qt").value || 0)));
  $("#of").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#bn").value.trim(), qty = parseInt($("#qt").value, 10), key = $("#pm").value;
    $("#e1").textContent = name.length < 3 ? "Isi nama minimal 3 huruf." : "";
    $("#e2").textContent = !qty || qty < 1 || qty > p.stock ? `Jumlah harus 1 sampai ${p.stock}.` : "";
    if ($("#e1").textContent || $("#e2").textContent) return;
    const btn = $("#osv"); btn.disabled = true; btn.textContent = "Mengirim...";
    try {
      const o = await api.createOrder({ buyer_name: name, product_id: p.id, quantity: qty, payment_method: key });
      showPaySheet(m, close, { order: o, p, s, key, qty, name, label: (methods.find((x) => x.key === key) || {}).label || key });
    } catch (err) {
      console.error(err);
      btn.disabled = false; btn.textContent = "Konfirmasi pesanan";
      if (/Stok tidak cukup/i.test(err.message)) $("#e2").textContent = "Stok tidak cukup. Kurangi jumlah atau muat ulang halaman.";
      else alert("Pesanan gagal: " + err.message);
    }
  };
  $("#bn").focus();
}

// Layar setelah pesanan terkirim: cara bayar + tombol kirim bukti via WhatsApp
function showPaySheet(m, close, d) {
  const total = d.p.price * d.qty;
  const cod = d.key === "COD";
  const msg = cod
    ? `Halo ${d.s ? d.s.business_name : ""}, saya ${d.name} memesan ${d.qty} × ${d.p.name} (kode ${d.order.order_code}), total ${rp(total)}. Pembayaran di tempat. Mohon konfirmasi ya.`
    : `Halo ${d.s ? d.s.business_name : ""}, saya ${d.name} sudah memesan ${d.qty} × ${d.p.name} (kode ${d.order.order_code}), total ${rp(total)}. Pembayaran lewat ${d.label}. Berikut bukti pembayarannya:`;
  m.innerHTML = `<div class="sheet"><h2>Pesanan terkirim</h2>
    <p>Kode pesanan <b>${esc(d.order.order_code)}</b></p>
    <div class="card" style="padding:14px;margin:10px 0;box-shadow:none">
      <div class="muted" style="font-size:.85rem">${cod ? "Total yang dibayar saat serah terima" : "Total yang harus dibayar"}</div>
      <div class="price" style="font-size:1.7rem">${rp(total)}</div>
      ${d.s ? payDetailHtml(d.key, d.s) : ""}
    </div>
    <p class="muted" style="font-size:.88rem">${cod ? "Penjual akan menghubungi Anda untuk mengatur serah terima." : "Setelah membayar, kirim foto bukti pembayaran ke penjual lewat WhatsApp. Pesanan diproses setelah pembayaran dicek."}</p>
    <div class="acts"><button type="button" class="btn line" id="pdone">Tutup</button>${d.s ? `<a class="btn wa" target="_blank" rel="noopener" href="${esc(wa(d.s.whatsapp, msg))}">${cod ? "Hubungi penjual" : "Kirim bukti via WhatsApp"}</a>` : ""}</div></div>`;
  const done = () => { close(); route(); };
  m.onclick = (e) => { if (e.target === m) done(); };
  $("#pdone").onclick = done;
  m.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => copyText(b.dataset.copy)));
}

// ---------- Admin: data penjual + info pembayaran ----------
api.saveSeller = function (s) {
  const body = JSON.stringify({
    seller_code: s.seller_code, business_name: s.business_name, student_name: s.student_name,
    profile_image_url: s.profile_image_url, business_description: s.business_description, whatsapp: s.whatsapp,
    bank_name: s.bank_name, bank_account: s.bank_account, bank_holder: s.bank_holder,
    dana_number: s.dana_number, gopay_number: s.gopay_number, qris_image_url: s.qris_image_url
  });
  const opt = { headers: { Prefer: "return=minimal" }, body };
  return s.id ? sb(`sellers?id=eq.${s.id}`, { method: "PATCH", ...opt }) : sb("sellers", { method: "POST", ...opt });
};

sellerForm = function (s) {
  const isNew = !s;
  s = s || { business_name: "", student_name: "", whatsapp: "", business_description: "", profile_image_url: null,
    bank_name: "", bank_account: "", bank_holder: "", dana_number: "", gopay_number: "", qris_image_url: null };
  const m = $("#modal");
  m.hidden = false;
  const phP = sImg({}), phQ = ph("🔳");
  const ta = "font:inherit;padding:11px 14px;border:1px solid var(--line);border-radius:12px;width:100%";
  m.innerHTML = `<form class="sheet" id="sf" novalidate><h2>${isNew ? "Tambah penjual" : "Edit penjual"}</h2>
    <label for="sn">Nama usaha</label><input id="sn" maxlength="80" value="${esc(s.business_name)}"><div class="err" id="y1"></div>
    <label for="sm">Nama mahasiswa</label><input id="sm" maxlength="80" value="${esc(s.student_name)}"><div class="err" id="y2"></div>
    <label for="sw">Nomor WhatsApp</label><input id="sw" type="tel" inputmode="tel" placeholder="Contoh: 081234567890" value="${esc(s.whatsapp)}"><div class="err" id="y3"></div>
    <label for="sd">Deskripsi usaha</label><textarea id="sd" rows="3" style="${ta}">${esc(s.business_description)}</textarea>
    <div style="font-weight:800;margin-top:18px">Foto profil</div>${photoHtml("sph", s.profile_image_url, phP, true)}
    <div style="font-weight:800;margin-top:22px;font-size:1.05rem">Pembayaran (opsional)</div>
    <p class="muted" style="font-size:.85rem">Dilihat pembeli setelah memesan. Isi hanya yang ingin dipakai.</p>
    <label for="bk">Nama bank</label><input id="bk" maxlength="30" placeholder="Contoh: BCA, BRI, Mandiri" value="${esc(s.bank_name)}">
    <label for="ba">Nomor rekening</label><input id="ba" inputmode="numeric" maxlength="24" value="${esc(s.bank_account)}">
    <label for="bh">Atas nama rekening</label><input id="bh" maxlength="60" value="${esc(s.bank_holder)}"><div class="err" id="y4"></div>
    <label for="dn">Nomor DANA</label><input id="dn" type="tel" inputmode="tel" placeholder="081234567890" value="${esc(s.dana_number)}"><div class="err" id="y5"></div>
    <label for="gp">Nomor GoPay</label><input id="gp" type="tel" inputmode="tel" placeholder="081234567890" value="${esc(s.gopay_number)}"><div class="err" id="y6"></div>
    <div style="font-weight:800;margin-top:14px">Foto QRIS</div>${photoHtml("qph", s.qris_image_url, phQ, false)}
    <div class="acts"><button type="button" class="btn line" id="scx">Batal</button><button class="btn" id="ssv">Simpan</button></div></form>`;
  const st1 = { file: null, remove: false }, st2 = { file: null, remove: false };
  wirePhoto("sph", st1, phP);
  wirePhoto("qph", st2, phQ);
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  $("#scx").onclick = close;
  $("#sf").onsubmit = async (e) => {
    e.preventDefault();
    const bn = $("#sn").value.trim(), sm = $("#sm").value.trim(), wa = normWa($("#sw").value);
    const bank = $("#bk").value.trim(), acc = $("#ba").value.replace(/\D/g, ""), holder = $("#bh").value.trim();
    const dana = phoneLocal($("#dn").value), gopay = phoneLocal($("#gp").value);
    const okPhone = (raw, v) => !raw.trim() || /^08\d{8,12}$/.test(v);
    $("#y1").textContent = bn.length < 2 ? "Isi nama usaha." : "";
    $("#y2").textContent = sm.length < 2 ? "Isi nama mahasiswa." : "";
    $("#y3").textContent = /^62\d{8,13}$/.test(wa) ? "" : "Nomor tidak valid. Contoh: 081234567890";
    $("#y4").textContent = (bank || acc || holder) && !(bank && acc.length >= 5 && holder) ? "Isi nama bank, nomor rekening (minimal 5 angka), dan atas nama." : "";
    $("#y5").textContent = okPhone($("#dn").value, dana) ? "" : "Nomor DANA tidak valid. Contoh: 081234567890";
    $("#y6").textContent = okPhone($("#gp").value, gopay) ? "" : "Nomor GoPay tidak valid. Contoh: 081234567890";
    if (["#y1", "#y2", "#y3", "#y4", "#y5", "#y6"].some((id) => $(id).textContent)) return;
    const code = isNew
      ? "S" + String(Math.max(0, ...adminSellers.map((x) => parseInt(String(x.seller_code).replace(/\D/g, ""), 10) || 0)) + 1).padStart(3, "0")
      : s.seller_code;
    const btn = $("#ssv"); btn.disabled = true; btn.textContent = "Menyimpan...";
    let up1 = null, up2 = null;
    try {
      let profile = s.profile_image_url || null, qris = s.qris_image_url || null;
      if (st1.file) { up1 = await uploadImage(st1.file, "sellers"); profile = up1; } else if (st1.remove) profile = null;
      if (st2.file) { up2 = await uploadImage(st2.file, "qris"); qris = up2; } else if (st2.remove) qris = null;
      await api.saveSeller({
        id: isNew ? null : s.id, seller_code: code, business_name: bn, student_name: sm, whatsapp: wa,
        business_description: $("#sd").value.trim(), profile_image_url: profile,
        bank_name: bank || null, bank_account: acc || null, bank_holder: holder || null,
        dana_number: dana || null, gopay_number: gopay || null, qris_image_url: qris
      });
      if (s.profile_image_url && s.profile_image_url !== profile) deleteStored(s.profile_image_url);
      if (s.qris_image_url && s.qris_image_url !== qris) deleteStored(s.qris_image_url);
      close(); toast("Penjual disimpan"); loadAdmin();
    } catch (err) {
      if (up1) deleteStored(up1);
      if (up2) deleteStored(up2);
      btn.disabled = false; btn.textContent = "Simpan";
      alert("Gagal menyimpan: " + err.message);
    }
  };
  $("#sn").focus();
};
