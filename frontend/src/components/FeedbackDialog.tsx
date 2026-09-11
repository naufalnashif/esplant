import { useEffect, useState, type FormEvent } from "react";
import { Check, HelpCircle, ImagePlus, LoaderCircle, MessageSquareText, Send, ShieldCheck, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const feedbackTypes = [
  ["saran", "Saran", "Ide untuk membuat aplikasi lebih berguna"],
  ["masalah", "Kendala", "Sesuatu tidak berjalan seperti seharusnya"],
  ["apresiasi", "Apresiasi", "Bagian yang sudah terasa membantu"],
] as const;

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [type, setType] = useState("saran");
  const [rating, setRating] = useState(0);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    setStatus("idle");
    setFileError("");
    setShowScreenshot(false);
    setShowQuestion(false);
    setScreenshot(null);
  }, [open]);

  const chooseScreenshot = (file?: File) => {
    setFileError("");
    if (!file) { setScreenshot(null); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFileError("Gunakan gambar PNG, JPG, atau WebP.");
      setScreenshot(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Ukuran screenshot maksimal 5 MB.");
      setScreenshot(null);
      return;
    }
    setScreenshot(file);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    try {
      const response = await fetch("/__forms.html", {
        method: "POST",
        body: new FormData(form),
      });
      if (!response.ok) throw new Error("Submission failed");
      form.reset();
      setType("saran");
      setRating(0);
      setScreenshot(null);
      setShowScreenshot(false);
      setShowQuestion(false);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-[410px] flex-col gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-2xl sm:max-h-[calc(100svh-3rem)] sm:w-[calc(100%-3rem)] sm:max-w-[680px] sm:rounded-3xl lg:max-w-[780px]">
        {status === "success" ? (
          <div className="grid min-h-[390px] place-items-center px-7 py-12 text-center" data-testid="feedback-success">
            <div>
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-500">
                <Check size={30} strokeWidth={2.5} />
              </div>
              <h2 className="mt-6 font-heading text-2xl font-extrabold">Masukan sudah kami terima.</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Terima kasih sudah membantu membentuk _self.manage menjadi lebih baik.
              </p>
              <Button className="mt-7 h-11 px-6 font-bold" onClick={() => onOpenChange(false)}>Selesai</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative shrink-0 overflow-hidden border-b border-border/70 bg-primary/[0.07] px-4 py-3.5 sm:px-8 sm:py-6">
              <div className="absolute -right-10 -top-16 size-40 rounded-full bg-primary/15 blur-3xl" />
              <DialogHeader className="relative pr-8">
                <div className="mb-1.5 grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:mb-2 sm:size-10">
                  <MessageSquareText size={20} />
                </div>
                <DialogTitle className="font-heading text-xl font-extrabold sm:text-2xl">Ceritakan pengalaman Anda</DialogTitle>
                <DialogDescription className="max-w-md leading-relaxed">
                  Singkat atau detail, setiap masukan membantu kami menentukan apa yang perlu diperbaiki berikutnya.
                </DialogDescription>
              </DialogHeader>
            </div>

            <form name="product-feedback" method="POST" encType="multipart/form-data" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-5 sm:px-8 sm:py-6" data-testid="feedback-form">
              <input type="hidden" name="form-name" value="product-feedback" />
              <input type="hidden" name="rating" value={rating || "Tidak diisi"} />
              <p className="hidden" aria-hidden="true"><label>Jangan isi kolom ini <input name="bot-field" tabIndex={-1} autoComplete="off" /></label></p>

              <fieldset>
                <legend className="text-sm font-bold">Masukan ini tentang apa?</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {feedbackTypes.map(([value, title, description]) => (
                    <label key={value} className={`cursor-pointer rounded-xl border p-3 transition-all ${type === value ? "border-primary bg-primary/[0.08] ring-1 ring-primary/25" : "border-border/80 hover:border-primary/50 hover:bg-muted/40"}`}>
                      <input type="radio" name="category" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
                      <span className="block text-sm font-bold">{title}</span>
                      <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <Label htmlFor="feedback-message">Apa yang ingin Anda sampaikan? <span className="text-primary">*</span></Label>
                <Textarea id="feedback-message" name="message" required minLength={5} maxLength={2000} rows={5} placeholder="Contoh: Saya ingin bisa mengatur pengingat tagihan mingguan…" className="mt-2 min-h-28 resize-y bg-background/60 px-3 py-3" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">Jangan sertakan kata sandi atau informasi keuangan sensitif.</p>
              </div>

              <fieldset className="border-t border-border/60 pt-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Tambahkan bila perlu</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${showScreenshot ? "border-primary bg-primary/[0.08] ring-1 ring-primary/20" : "border-border/80 hover:border-primary/50"}`}>
                    <input type="checkbox" checked={showScreenshot} onChange={(event) => { setShowScreenshot(event.target.checked); if (!event.target.checked) { chooseScreenshot(); const input = document.getElementById("feedback-screenshot") as HTMLInputElement | null; if (input) input.value = ""; } }} className="size-4 shrink-0 accent-primary" />
                    <ImagePlus size={17} className="shrink-0 text-primary" />
                    <span><span className="block text-sm font-bold">Lampirkan screenshot</span><span className="block text-[11px] text-muted-foreground">Bantu tunjukkan kendala</span></span>
                  </label>
                  <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${showQuestion ? "border-primary bg-primary/[0.08] ring-1 ring-primary/20" : "border-border/80 hover:border-primary/50"}`}>
                    <input type="checkbox" checked={showQuestion} onChange={(event) => setShowQuestion(event.target.checked)} className="size-4 shrink-0 accent-primary" />
                    <HelpCircle size={17} className="shrink-0 text-primary" />
                    <span><span className="block text-sm font-bold">Tanya developer</span><span className="block text-[11px] text-muted-foreground">Minta jawaban langsung</span></span>
                  </label>
                </div>
              </fieldset>

              {(showScreenshot || showQuestion) && <div className="grid animate-rise-in gap-4 rounded-2xl border border-primary/20 bg-primary/[0.035] p-3.5 sm:p-4 lg:grid-cols-2">
              {showQuestion && <div className={showScreenshot ? "" : "lg:col-span-2"}>
                <Label htmlFor="feedback-question">Pertanyaan untuk developer</Label>
                <Textarea id="feedback-question" name="developer_question" maxLength={1000} rows={3} placeholder="Contoh: Apakah fitur pengingat otomatis sedang direncanakan?" className="mt-2 min-h-20 resize-y bg-background/70 px-3 py-3" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">Sertakan email jika Anda ingin mendapat balasan.</p>
              </div>}

              {showScreenshot && <div className={showQuestion ? "" : "lg:col-span-2"}>
                <Label htmlFor="feedback-screenshot">Screenshot</Label>
                <div className={`relative mt-2 rounded-xl border border-dashed bg-background/70 p-3 transition-colors ${fileError ? "border-destructive/60" : "border-border hover:border-primary/60"}`}>
                  <input
                    id="feedback-screenshot"
                    name="screenshot"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      chooseScreenshot(file);
                      if (file && (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) event.target.value = "";
                    }}
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    aria-describedby="screenshot-help screenshot-error"
                  />
                  {screenshot ? (
                    <div className="flex min-w-0 items-center gap-3 pr-10">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ImagePlus size={19} /></div>
                      <div className="min-w-0"><p className="truncate text-sm font-bold">{screenshot.name}</p><p className="text-[11px] text-muted-foreground">{(screenshot.size / 1024 / 1024).toFixed(1)} MB · Ketuk untuk mengganti</p></div>
                      <button type="button" aria-label="Hapus screenshot" onClick={(event) => { event.preventDefault(); event.stopPropagation(); chooseScreenshot(); const input = document.getElementById("feedback-screenshot") as HTMLInputElement | null; if (input) input.value = ""; }} className="absolute right-2 z-20 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X size={17} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><ImagePlus size={19} /></div>
                      <div><p className="text-sm font-bold">Pilih screenshot</p><p id="screenshot-help" className="text-[11px] text-muted-foreground">PNG, JPG, atau WebP · maks. 5 MB</p></div>
                    </div>
                  )}
                </div>
                {fileError && <p id="screenshot-error" role="alert" className="mt-1.5 text-xs text-destructive">{fileError}</p>}
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">Pastikan saldo, nomor rekening, dan data pribadi lain sudah disamarkan sebelum mengunggah.</p>
              </div>}
              </div>}

              <fieldset>
                <legend className="text-sm font-bold">Seberapa mudah _self.manage digunakan? <span className="font-normal text-muted-foreground">(opsional)</span></legend>
                <div className="mt-2 flex gap-1" aria-label="Penilaian kemudahan penggunaan">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" aria-label={`${value} dari 5`} aria-pressed={rating === value} onClick={() => setRating(value === rating ? 0 : value)} className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Star size={21} className={value <= rating ? "fill-primary text-primary" : ""} />
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 border-t border-border/60 pt-5 sm:grid-cols-2">
                <div><Label htmlFor="feedback-name">Nama <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="feedback-name" name="name" autoComplete="name" maxLength={80} placeholder="Nama Anda" className="mt-2 h-10 bg-background/60" /></div>
                <div><Label htmlFor="feedback-email">Email <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="feedback-email" name="email" type="email" autoComplete="email" maxLength={120} placeholder="anda@email.com" className="mt-2 h-10 bg-background/60" /></div>
              </div>

              {status === "error" && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Masukan belum terkirim. Periksa koneksi lalu coba lagi.</p>}

              <div className="flex flex-col-reverse gap-3 pb-[max(0px,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck size={14} className="text-emerald-500" /> Dilindungi penyaring spam Netlify</p>
                <Button type="submit" disabled={status === "sending"} className="h-11 gap-2 px-5 font-bold">
                  {status === "sending" ? <><LoaderCircle className="animate-spin" /> Mengirim…</> : <><Send /> Kirim masukan</>}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
