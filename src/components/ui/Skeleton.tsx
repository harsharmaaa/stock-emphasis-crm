export interface SkeletonProps {
  w?: number | string;
  h?: number | string;
  className?: string;
}

/** Shimmering placeholder. Decorative – announce loading state on the parent (aria-busy). */
export function Skeleton({ w = "100%", h = 14, className }: SkeletonProps) {
  return (
    <div
      className={className ? `skel ${className}` : "skel"}
      style={{ width: w, height: h }}
      aria-hidden="true"
    />
  );
}
