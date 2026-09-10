import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { DocLayout, DocSection } from "@/components/DocLayout";
import { useDocumentTitle } from "@/hooks/useReveal";

export default function Privacy() {
  useDocumentTitle("Kebijakan Privasi — _self.manage");
  return (
    <DocLayout
      testid="privacy-page"
      icon={<ShieldCheck size={22} />}
      title="Kebijakan Privasi"
      subtitle="Ringkasnya: data keuangan Anda tidak kami simpan. Semuanya berada di browser Anda atau di Google Spreadsheet milik Anda sendiri."
    >
      <DocSection title="Data yang disimpan dan di mana">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-foreground">Mode lokal:</span> seluruh data keuangan (akun, transaksi, tagihan,
            utang, tabungan, anggaran) disimpan di IndexedDB browser Anda dan tidak pernah dikirim keluar perangkat.
          </li>
          <li>
            <span className="font-semibold text-foreground">Mode Google Sheet:</span> data ditulis langsung ke Google Spreadsheet
            di akun Google Anda. Kepemilikan dan kendali penuh ada pada Anda.
          </li>
          <li>
            <span className="font-semibold text-foreground">Preferensi kecil</span> (nama panggilan, ID spreadsheet terakhir,
            pilihan sinkronisasi, tema/bahasa) disimpan lokal di browser untuk kenyamanan Anda.
          </li>
        </ul>
      </DocSection>

      <DocSection title="Apa yang TIDAK kami lakukan">
        <ul className="list-disc space-y-2 pl-5">
          <li>Kami tidak menyimpan transaksi, saldo, atau nomor rekening Anda di server pihak ketiga.</li>
          <li>Kami tidak menjual atau membagikan data Anda.</li>
          <li>Kami tidak menyimpan token Google Anda di server aplikasi.</li>
        </ul>
      </DocSection>

      <DocSection title="Izin Google (least privilege)">
        <p>
          Saat Anda menghubungkan Google Sheet, aplikasi hanya meminta izin untuk file spreadsheet yang Anda buat atau pilih
          melalui aplikasi ini — bukan akses ke seluruh isi Google Drive Anda. Token akses bersifat sementara dan hanya berada di
          sesi browser Anda.
        </p>
      </DocSection>

      <DocSection title="Komputer bersama">
        <p>
          Karena data lokal tersimpan di browser, gunakan opsi “keluar & hapus data lokal” di Pengaturan bila Anda memakai
          komputer publik atau bersama, agar data finansial Anda tidak terbaca pengguna berikutnya.
        </p>
      </DocSection>

      <DocSection title="Status beta & kontak">
        <p>
          Aplikasi ini masih dalam tahap uji coba. Lihat{" "}
          <Link to="/terms" data-testid="privacy-terms-link" className="font-semibold text-primary hover:underline">
            Ketentuan Layanan
          </Link>{" "}
          untuk batasan selama masa beta. Kami sarankan mengekspor cadangan JSON secara berkala.
        </p>
      </DocSection>
    </DocLayout>
  );
}
