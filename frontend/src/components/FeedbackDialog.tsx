import { useEffect, useState, type FormEvent } from "react";
import { Check, LoaderCircle, MessageSquareText, Send, ShieldCheck, Star } from "lucide-react";
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
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    setStatus("idle");
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    try {
      const fields = new URLSearchParams();
      new FormData(form).forEach((value, key) => fields.append(key, String(value)));
      const response = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fields.toString(),
      });
      if (!response.ok) throw new Error("Submission failed");
      form.reset();
      setType("saran");
      setRating(0);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-1rem)] overflow-y-auto border border-border/80 bg-card p-0 shadow-2xl sm:max-w-[620px] sm:rounded-3xl">
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
            <div className="relative overflow-hidden border-b border-border/70 bg-primary/[0.07] px-5 py-6 sm:px-8 sm:py-8">
              <div className="absolute -right-10 -top-16 size-40 rounded-full bg-primary/15 blur-3xl" />
              <DialogHeader className="relative pr-8">
                <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <MessageSquareText size={20} />
                </div>
                <DialogTitle className="font-heading text-xl font-extrabold sm:text-2xl">Ceritakan pengalaman Anda</DialogTitle>
                <DialogDescription className="max-w-md leading-relaxed">
                  Singkat atau detail, setiap masukan membantu kami menentukan apa yang perlu diperbaiki berikutnya.
                </DialogDescription>
              </DialogHeader>
            </div>

            <form name="product-feedback" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submit} className="space-y-6 px-5 py-6 sm:px-8" data-testid="feedback-form">
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

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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
