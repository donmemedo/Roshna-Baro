"use client";

/** Ambient aurora field: three drifting blobs + film grain. Pure CSS, GPU friendly. */
export function Aurora({ dense = false }: { dense?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain">
      <div
        className="aurora-blob drift-slow"
        style={{
          width: dense ? "58vw" : "46vw",
          height: dense ? "58vw" : "46vw",
          top: "-12vh",
          insetInlineStart: "-8vw",
          background: "radial-gradient(circle at 30% 30%, #ff6ba3, #f8437f 45%, transparent 70%)",
        }}
      />
      <div
        className="aurora-blob drift-slower"
        style={{
          width: "52vw",
          height: "52vw",
          top: "18vh",
          insetInlineEnd: "-14vw",
          background: "radial-gradient(circle at 60% 40%, #8b7cff, #5340d8 48%, transparent 72%)",
        }}
      />
      <div
        className="aurora-blob drift-slow"
        style={{
          width: "44vw",
          height: "44vw",
          bottom: "-18vh",
          insetInlineStart: "22vw",
          background: "radial-gradient(circle at 50% 50%, #2fd8b0, #14b894 50%, transparent 74%)",
          animationDelay: "-8s",
        }}
      />
    </div>
  );
}
