// =====================================================
// StudentGrow - admin-kategori.js (Tahap 6: kelola kategori)
// Dimuat otomatis oleh js/admin.js
// =====================================================
api.saveCategory = function (c) {
  const opt = { headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name: c.name }) };
  return c.id ? sb(`categories?id=eq.${c.id}`, { method: "PATCH", ...opt }) : sb("categories", { method: "POST", ...opt });
};
api.deleteCategory = (id) => sb(`categories?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

registerAdminTab("kategori", {
  render() {
    return `<div class="row" style="align-items:center;margin-bottom:12px"><h2 style="margin:0">Kategori (${adminCats.length})</h2>
      <button class="btn" id="addc" style="padding:9px 18px">+ Tambah</button></div>
    ${adminCats.length ? adminCats.map((c) => {
      const n = adminProducts.filter((p) => p.category_id === c.id).length;
      return `<article class="card" style="flex-direction:row;align-items:center;gap:12px;padding:12px;margin-bottom:10px">
        <div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="muted" style="font-size:.85rem">${n} produk</div></div>
        <div style="display:flex;gap:6px">
          <button class="btn line" data-cedit="${c.id}" style="padding:6px 14px;font-size:.85rem">Edit</button>
          <button class="btn" data-cdel="${c.id}" style="padding:6px 14px;font-size:.85rem;background:var(--red)">Hapus</button></div>
      </article>`;
    }).join("") : empty("Belum ada kategori. Ketuk + Tambah.")}`;
  },
  bind(box) {
    box.querySelector("#addc").onclick = () => categoryForm();
    adminOn(box, "[data-cedit]", (b) => categoryForm(adminCats.find((x) => x.id == b.dataset.cedit)));
    adminOn(box, "[data-cdel]", (b) => deleteCategory(adminCats.find((x) => x.id == b.dataset.cdel)));
  }
});

async function deleteCategory(c) {
  if (!c) return;
  const n = adminProducts.filter((p) => p.category_id === c.id).length;
  const msg = n
    ? `Hapus kategori "${c.name}"? ${n} produk di kategori ini TIDAK dihapus, tapi jadi tanpa kategori.`
    : `Hapus kategori "${c.name}"?`;
  if (!confirm(msg)) return;
  try {
    await api.deleteCategory(c.id);
    toast("Kategori dihapus");
    loadAdmin();
  } catch (err) { alert("Gagal menghapus: " + err.message); }
}

function categoryForm(c) {
  const isNew = !c;
  c = c || { name: "" };
  const m = $("#modal");
  m.hidden = false;
  m.innerHTML = `<form class="sheet" id="cf" novalidate><h2>${isNew ? "Tambah kategori" : "Edit kategori"}</h2>
    <label for="cn">Nama kategori</label><input id="cn" maxlength="40" placeholder="Contoh: Minuman" value="${esc(c.name)}"><div class="err" id="z1"></div>
    <div class="acts"><button type="button" class="btn line" id="ccx">Batal</button><button class="btn" id="csv">Simpan</button></div></form>`;
  const close = () => { m.hidden = true; m.innerHTML = ""; };
  $("#ccx").onclick = close;
  $("#cf").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#cn").value.trim();
    const dup = adminCats.some((x) => x.id !== c.id && x.name.toLowerCase() === name.toLowerCase());
    $("#z1").textContent = name.length < 2 ? "Isi nama kategori." : dup ? "Nama kategori sudah ada." : "";
    if ($("#z1").textContent) return;
    const btn = $("#csv"); btn.disabled = true;
    try {
      await api.saveCategory({ id: isNew ? null : c.id, name });
      close(); toast("Kategori disimpan"); loadAdmin();
    } catch (err) {
      btn.disabled = false;
      alert("Gagal menyimpan: " + err.message);
    }
  };
  $("#cn").focus();
}
