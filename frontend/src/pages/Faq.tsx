import { useMemo, useState } from "react";
import { ChevronDown, HelpCircle, Search } from "lucide-react";
import { DocLayout } from "@/components/DocLayout";
import { useDocumentTitle } from "@/hooks/useReveal";

interface QA {
  q: string;
  a: string;
  group: string;
}

const FAQS: QA[] = [
  {
    group: "Umum",
    q: "Apa itu _self.manage?",
    a: "Pelacak keuangan pribadi yang menyimpan data Anda di browser (mode lokal) atau di Google Spreadsheet milik Anda sendiri (mode connect). Aplikasi tidak menyimpan data keuangan Anda di server pihak ketiga.",
  },
  {
    group: "Umum",
    q: "Apa artinya aplikasi masih “beta”?",
    a: "Aplikasi masih dalam tahap uji coba. Fitur bisa berubah dan sesekali mungkin ada bug. Kami sarankan rutin mengekspor cadangan JSON Anda dari halaman Pengaturan.",
  },
  {
    group: "Data & Keamanan",
    q: "Di mana data keuangan saya disimpan?",
    a: "Di mode lokal, data ada di IndexedDB browser Anda dan tidak pernah dikirim keluar perangkat. Di mode connect, data ditulis langsung ke Google Spreadsheet milik akun Google Anda. Server aplikasi tidak menyimpan transaksi, saldo, atau nomor rekening Anda.",
  },
  {
    group: "Data & Keamanan",
    q: "Apakah token Google saya aman?",
    a: "Aplikasi hanya menggunakan token akses sementara di sesi browser Anda dan tidak menyimpannya di server. Kami juga hanya meminta izin (scope) untuk file spreadsheet yang Anda buat atau pilih — bukan akses penuh ke seluruh Google Drive Anda.",
  },
  {
    group: "Data & Keamanan",
    q: "Saya memakai komputer bersama. Bagaimana menghapus data lokal?",
    a: "Buka Pengaturan lalu gunakan opsi hapus/keluar untuk membersihkan data lokal dan memutus koneksi. Ini penting di komputer publik agar data finansial Anda tidak terbaca pengguna lain.",
  },
  {
    group: "Google Sheets",
    q: "Kenapa harus pakai akun Google saya sendiri?",
    a: "Supaya data tetap 100% milik Anda. Spreadsheet dibuat di Drive Anda, jadi Anda bebas membuka, membagikan, atau menghapusnya kapan pun tanpa bergantung pada kami.",
  },
  {
    group: "Google Sheets",
    q: "Apakah ada batas berapa kali data bisa disimpan ke Google Sheet?",
    a: "Google Sheets API membatasi jumlah permintaan PER MENIT, bukan per hari. Untuk satu pengguna, kira-kira 60 permintaan baca dan 60 permintaan tulis per menit. Selama tidak melampaui batas per menit itu, tidak ada batas jumlah per hari. Aplikasi mengumpulkan perubahan Anda lalu mengirimnya sekaligus (batch) agar tetap jauh di bawah batas ini.",
  },
  {
    group: "Google Sheets",
    q: "Apa yang terjadi kalau batas kuota terlampaui?",
    a: "Anda mungkin melihat pesan ramah bahwa sinkronisasi akan dicoba lagi sebentar lagi. Aplikasi menunggu otomatis lalu mencoba ulang — perubahan Anda tidak hilang dan tetap tersimpan dulu secara lokal.",
  },
  {
    group: "Google Sheets",
    q: "Koneksi ke Google Sheet terputus. Apa yang harus saya lakukan?",
    a: "Aplikasi akan menampilkan pemberitahuan dengan tombol untuk menghubungkan kembali. Sementara terputus, Anda tetap bisa melihat data terakhir yang tersimpan secara lokal.",
  },
  {
    group: "Sinkronisasi",
    q: "Bisakah saya memilih kapan data disinkronkan?",
    a: "Ya. Di Pengaturan Anda dapat memilih sinkron manual, berkala (misalnya tiap 5/15/30 menit), harian, atau otomatis saat menutup halaman. Ini membantu menghemat kuota API dan menyesuaikan dengan kebiasaan Anda.",
  },
];

const GROUPS = ["Umum", "Data & Keamanan", "Google Sheets", "Sinkronisasi"];

function FaqItem({ item }: { item: QA }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl" data-testid="faq-item">
      <button
        type="button"
        data-testid="faq-item-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="text-sm font-semibold text-foreground">{item.q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground" data-testid="faq-item-answer">
          {item.a}
        </div>
      )}
    </div>
  );
}

// Search bar sits above the grouped list.
export default function Faq() {
  useDocumentTitle("FAQ — _self.manage");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q));
  }, [query]);

  return (
    <DocLayout
      testid="faq-page"
      icon={<HelpCircle size={22} />}
      title="Pertanyaan Umum"
      subtitle="Jawaban singkat seputar penyimpanan data, keamanan, batas Google Sheets API, dan sinkronisasi — dalam bahasa yang mudah dipahami."
    >
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          data-testid="faq-search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari pertanyaan…"
          className="h-12 w-full rounded-2xl border border-border bg-card/70 pl-11 pr-4 text-sm outline-none backdrop-blur-xl transition-colors focus:border-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-card/60 px-5 py-6 text-center text-sm text-muted-foreground" data-testid="faq-empty">
          Tidak ada hasil untuk “{query}”.
        </p>
      ) : (
        GROUPS.map((group) => {
          const items = filtered.filter((item) => item.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="space-y-3" data-testid={`faq-group-${group}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group}</p>
              {items.map((item) => (
                <FaqItem key={item.q} item={item} />
              ))}
            </div>
          );
        })
      )}
    </DocLayout>
  );
}
