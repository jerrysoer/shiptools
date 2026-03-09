import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import Link from "next/link";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md transition-colors disabled:opacity-50";

const variantClasses = {
  primary: "bg-accent text-accent-fg font-medium shadow-sm hover:bg-accent-hover",
  secondary: "border border-border text-text-secondary font-medium hover:border-border-hover hover:text-text-primary hover:bg-bg-hover",
  ghost: "text-text-secondary hover:text-text-primary",
} as const;

const sizeClasses = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-6 py-3",
} as const;

type Variant = keyof typeof variantClasses;
type Size = keyof typeof sizeClasses;

interface SharedProps {
  variant?: Variant;
  mono?: boolean;
  size?: Size;
  className?: string;
  children?: React.ReactNode;
}

type ButtonAsButton = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedProps> & {
    href?: undefined;
  };

type ButtonAsLink = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof SharedProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function buildClassName({
  variant = "primary",
  mono,
  size = "md",
  className,
}: Pick<SharedProps, "variant" | "mono" | "size" | "className">) {
  return [
    baseClasses,
    variantClasses[variant ?? "primary"],
    sizeClasses[size ?? "md"],
    mono ? "font-mono text-sm tracking-wider uppercase" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(props, ref) {
  const { variant, mono, size, className, children, ...rest } = props;
  const classes = buildClassName({ variant, mono, size, className });

  if ("href" in rest && rest.href != null) {
    const { href, ...anchorProps } = rest as ButtonAsLink & { href: string };
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...anchorProps}
      >
        {children}
      </Link>
    );
  }

  const buttonProps = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedProps>;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      {...buttonProps}
    >
      {children}
    </button>
  );
});
