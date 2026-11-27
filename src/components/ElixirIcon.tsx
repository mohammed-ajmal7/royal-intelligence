import { elixirAsset } from "../lib/statAssets";
import "./elixir-icon.css";

type Props = {
  cost: number | null | undefined;
  size?: number;
  className?: string;
  decorative?: boolean;
};

/** Shared numbered Clash Royale-style elixir cost icon for every card surface. */
export function ElixirIcon({ cost, size = 20, className = "", decorative = false }: Props) {
  const asset = elixirAsset(cost);
  const classes = ["ri-elixir-icon", className].filter(Boolean).join(" ");
  if (!asset) {
    return <span className={classes + " is-unknown"} aria-label={decorative ? undefined : "Elixir cost unknown"}
      aria-hidden={decorative || undefined}>{cost == null ? "?" : String(cost)}</span>;
  }

  return <img
    className={classes}
    src={asset}
    width={size}
    height={size}
    alt={decorative ? "" : cost + " elixir"}
    aria-hidden={decorative || undefined}
    loading="lazy"
  />;
}
