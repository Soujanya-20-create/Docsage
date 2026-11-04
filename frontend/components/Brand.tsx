/** The DocSage mark and wordmark. "Doc" follows the theme text colour, "Sage" is the brand blue. */
export function Brand({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-bold">
      {/* The mark has navy strokes, so give it a white tile in dark mode to stay legible. */}
      <span className="brand-tile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/docsage-mark.png" alt="" width={size} height={size} style={{ width: size, height: size }} />
      </span>
      <span>
        Doc<span className="text-brand">Sage</span>
      </span>
    </span>
  );
}
