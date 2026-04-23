import { cn } from "@/lib/utils";
import { formatCurrency, formatPct } from "@/lib/fechamentos";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: number;
  variation?: number | null;
  variationLabel?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "success" | "info";
  className?: string;
}

const variantStyles = {
  default: "bg-card",
  primary:
    "text-primary-foreground bg-[image:var(--gradient-primary)] border-transparent shadow-[var(--shadow-glow)]",
  success:
    "text-primary-foreground bg-[image:var(--gradient-success)] border-transparent",
  info: "bg-secondary",
};

export function KpiCard({
  label,
  value,
  variation,
  variationLabel,
  subtitle,
  icon,
  variant = "default",
  className,
}: KpiCardProps) {
  const isPrimary = variant === "primary" || variant === "success";
  const trend =
    variation == null
      ? null
      : variation > 0.5
        ? "up"
        : variation < -0.5
          ? "down"
          : "flat";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-elevated)]",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-xs font-medium uppercase tracking-wider",
            isPrimary ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              isPrimary ? "bg-white/15" : "bg-secondary",
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-3 font-[Sora] text-3xl font-bold leading-none tracking-tight">
        {formatCurrency(value)}
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              isPrimary
                ? "bg-white/15 text-primary-foreground"
                : trend === "up"
                  ? "bg-success/15 text-success"
                  : trend === "down"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-muted text-muted-foreground",
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {formatPct(variation!)}
          </span>
        )}
        {(variationLabel || subtitle) && (
          <span
            className={cn(
              isPrimary ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {variationLabel ?? subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
