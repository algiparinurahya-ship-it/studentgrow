// =====================================================
// DATA CONTOH (SAMPLE) - HANYA SEMENTARA
// Nama kolom sengaja sama dengan tabel Supabase.
// Di Tahap 3, file ini DIGANTI dengan data dari Supabase.
// =====================================================
const SAMPLE_CATEGORIES = [
  { id: 1, name: "Makanan" }
];

const SAMPLE_SELLERS = [
  { id: 1, seller_code: "S001", business_name: "Cut Maida", student_name: "Cut Maida Arwati",
    profile_image_url: null, business_description: "Usaha makanan homemade mahasiswa",
    whatsapp: "6281234567890" }, // GANTI nomor asli (format 62..., tanpa + dan 0 di depan)
  { id: 2, seller_code: "S002", business_name: "Bunga Snack", student_name: "Bunga Rahayu HSB",
    profile_image_url: null, business_description: "Menjual camilan manis dengan berbagai topping",
    whatsapp: "6281234567891" }
];

const SAMPLE_PRODUCTS = [
  { id: 1, product_code: "001", name: "Risol Mayo", image_url: null, category_id: 1, price: 8000,
    description: "Risol mayo homemade dengan isian creamy", stock: 20, seller_id: 1, created_at: "2026-10-01" },
  { id: 2, product_code: "002", name: "Pisang Crispy", image_url: null, category_id: 1, price: 10000,
    description: "Pisang crispy dengan berbagai topping", stock: 20, seller_id: 2, created_at: "2026-10-03" },
  // Contoh stok habis (hapus nanti)
  { id: 3, product_code: "003", name: "Donat Kentang", image_url: null, category_id: 1, price: 6000,
    description: "Donat kentang empuk, contoh produk stok habis", stock: 0, seller_id: 1, created_at: "2026-10-05" }
];

// Pesanan contoh disimpan di memori saja (hilang saat halaman di-refresh).
const SAMPLE_ORDERS = [];
