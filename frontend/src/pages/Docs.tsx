import { BookOpen, Cloud, Download, HardDrive, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { DocLayout, DocSection, DocSteps } from "@/components/DocLayout";
import { useDocumentTitle } from "@/hooks/useReveal";

export default function Docs() {
  useDocumentTitle("Panduan Pengguna — _self.manage");
  return (
    <DocLayout
      testid="docs-page"
      icon={<BookOpen size={22} />}
      title="Panduan Pengguna"
      subtitle="Mulai dari nol: cara mencoba mode lokal, menghubungkan Google Sheet, mengatur sinkronisasi, dan mencadangkan data Anda."
    >
      <DocSection title="Dua cara menyimpan data Anda">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
            <div className="mb-3 grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
              <HardDrive size={17} />
            </div>
            <p className="font-semibold text-foreground">Mode Demo Lokal</p>
            <p className="mt-1 text-sm">
              Data disimpan di browser ini (IndexedDB). Cepat, tanpa login, tapi hanya ada di perangkat ini. Cocok untuk mencoba.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
            <div className="mb-3 grid size-9 place-items-center rounded-xl bg-emerald-500/12 text-emerald-400">
              <Cloud size={17} />
            </div>
            <p className="font-semibold text-foreground">Mode Google Sheet</p>
            <p className="mt-1 text-sm">
              Data ditulis langsung ke Google Spreadsheet milik Anda. Bisa dibuka di perangkat lain dan tetap 100% milik Anda.
            </p>
          </div>
        </div>
      </DocSection>

      <DocSection title="Mulai dengan mode lokal (30 detik)">
        <DocSteps
          steps={[
            { title: "Buka aplikasi", body: "Di halaman depan, klik “Lihat opsi lain”, lalu pilih “Coba dulu tanpa connect”." },
            { title: "Tambahkan akun", body: "Buat akun pertama Anda (bank, e-wallet, atau uang tunai) beserta saldo awalnya." },
            { title: "Catat transaksi", body: "Tambahkan pemasukan/pengeluaran pertama. Dashboard, grafik, dan KPI langsung diperbarui." },
          ]}
        />
      </DocSection>

      <DocSection title="Menghubungkan Google Sheet">
        <DocSteps
          steps={[
            { title: "Klik “Hubungkan Spreadsheet”", body: "Anda bisa memakai spreadsheet yang sudah ada atau membiarkan aplikasi membuat yang baru di Drive Anda." },
            { title: "Login Google satu kali", body: "Aplikasi hanya meminta izin untuk file spreadsheet yang Anda buat/pilih — bukan seluruh Google Drive." },
            { title: "Data lokal ikut terbawa", body: "Jika spreadsheet masih kosong dan Anda punya data lokal, data itu otomatis disalin ke spreadsheet." },
            { title: "Selesai", body: "Setiap perubahan sekarang tersimpan di spreadsheet Anda. Buka, edit, atau bagikan kapan pun." },
          ]}
        />
      </DocSection>

      <DocSection title="Mengatur strategi sinkronisasi">
        <p>
          Buka <span className="font-semibold text-foreground">Pengaturan</span> untuk memilih kapan perubahan dikirim ke Google
          Sheet — manual, berkala, harian, atau saat menutup halaman. Menyimpan perubahan dalam kelompok (batch) membantu Anda
          tetap jauh dari batas kuota Google Sheets API. Pelajari batas ini di{" "}
          <Link to="/faq" data-testid="docs-faq-link" className="font-semibold text-primary hover:underline">
            halaman FAQ
          </Link>
          .
        </p>
      </DocSection>

      <DocSection title="Ekspor & cadangkan">
        <p className="flex items-start gap-2">
          <Download size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>
            Di <span className="font-semibold text-foreground">Pengaturan</span> Anda dapat mengekspor seluruh data sebagai JSON
            atau CSV, dan mengimpornya kembali kapan saja. Simpan salinan JSON secara berkala sebagai cadangan.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <RefreshCw size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>
            Karena spreadsheet adalah milik Anda, Anda juga bisa mengeditnya langsung di Google Sheets — tarik ulang (refresh) di
            aplikasi untuk menyinkronkan perubahan tersebut.
          </span>
        </p>
      </DocSection>
    </DocLayout>
  );
}
