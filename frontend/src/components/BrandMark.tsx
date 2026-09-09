import { CircleDollarSign } from "lucide-react";

const sizes = {
  sm: { box: "size-9 rounded-xl", icon: 19, text: "text-sm" },
  md: { box: "size-10 rounded-2xl", icon: 21, text: "text-base" },
  lg: { box: "size-10 rounded-2xl", icon: 22, text: "text-lg" },
} as const;

/** The product wordmark. Kept identical everywhere so it matches the OAuth app name. */
export function BrandMark({
  size = "md",
  showTagline = false,
  showText = true,
  className = "",
}: {
  size?: keyof typeof sizes;
  showTagline?: boolean;
  showText?: boolean;
  className?: string;
}) {
  const preset = sizes[size];
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="brand-mark">
      <div
        className={`grid shrink-0 place-items-center bg-primary text-primary-foreground shadow-lg shadow-primary/20 ${preset.box}`}
      >
        <CircleDollarSign size={preset.icon} />
      </div>
      {showText && (
        <div className="min-w-0">
          <p className={`font-heading font-extrabold leading-none tracking-tight ${preset.text}`}>_self.manage</p>
          {showTagline && (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Money, made clear
            </p>
          )}
        </div>
      )}
    </div>
  );
}
