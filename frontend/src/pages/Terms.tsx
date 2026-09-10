import { ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { DocLayout, DocSection } from "@/components/DocLayout";
import { useDocumentTitle } from "@/hooks/useReveal";

export default function Terms() {
  useDocumentTitle("Ketentuan Layanan — _self.manage");
  return (
    <DocLayout
      testid="terms-page"
      icon={<ScrollText size={22} />}
      title="Ketentuan Layanan"
      subtitle="Ringkasan sederhana tentang penggunaan _self.manage selama masa uji coba (beta)."
    >
      <DocSection title="Status layanan (beta)">
        <p>
          _self.manage disediakan “sebagaimana adanya” selama masa uji coba. Fitur dapat berubah, ditambah, atau dihentikan
          sewaktu-waktu. Sesekali mungkin terjadi gangguan atau bug.
        </p>
      </DocSection>

      <DocSection title="Kepemilikan & tanggung jawab data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Data keuangan Anda berada di perangkat Anda (mode lokal) atau di Google Spreadsheet milik Anda (mode connect).</li>
          <li>
            Karena data disimpan di sisi Anda, Anda bertanggung jawab menjaga cadangannya. Kami sarankan rutin mengekspor JSON
            dari Pengaturan.
          </li>
          <li>Kami tidak dapat memulihkan data yang hilang karena browser dibersihkan atau spreadsheet dihapus.</li>
        </ul>
      </DocSection>

      <DocSection title="Penggunaan yang wajar">
        <p>
          Gunakan aplikasi untuk keperluan pengelolaan keuangan pribadi Anda. Jangan menyalahgunakan integrasi Google Sheets
          dengan permintaan berlebihan yang dapat melanggar ketentuan Google API.
        </p>
      </DocSection>

      <DocSection title="Batasan tanggung jawab">
        <p>
          Sepanjang diizinkan hukum, _self.manage tidak bertanggung jawab atas kerugian yang timbul dari penggunaan aplikasi
          selama masa beta, termasuk kehilangan data. Gunakan dengan bijak dan simpan cadangan Anda.
        </p>
      </DocSection>

      <DocSection title="Privasi">
        <p>
          Cara kami memperlakukan data dijelaskan di{" "}
          <Link to="/privacy" data-testid="terms-privacy-link" className="font-semibold text-primary hover:underline">
            Kebijakan Privasi
          </Link>
          .
        </p>
      </DocSection>
    </DocLayout>
  );
}
