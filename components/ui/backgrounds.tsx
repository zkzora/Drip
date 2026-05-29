/**
 * Background components inspired by 21st.dev
 * Reusable background effects for different pages
 */

export function GridGradientBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-[#070612]">
      {/* Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(167,139,250,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(167,139,250,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "96px 64px",
        }}
      />

      {/* Multiple radial gradients for depth */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 800px at 100% 200px, rgba(213,197,255,0.15), transparent),
            radial-gradient(circle 600px at 0% 300px, rgba(167,139,250,0.12), transparent),
            radial-gradient(circle 700px at 50% 100%, rgba(103,232,249,0.08), transparent)
          `,
        }}
      />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.03]" />
    </div>
  );
}

export function ComplexMultiplierBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-[#070612]">
      {/* Complex multiplier pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(45deg, rgba(167,139,250,0.08) 0, rgba(167,139,250,0.08) 1px, transparent 1px, transparent 20px),
            repeating-linear-gradient(-45deg, rgba(217,70,239,0.09) 0, rgba(217,70,239,0.09) 1px, transparent 1px, transparent 30px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 80px),
            radial-gradient(circle at 60% 40%, rgba(167,139,250,0.06) 0, transparent 60%)
          `,
          backgroundSize: "80px 80px, 40px 40px, 60px 60px, 80px 80px, 100% 100%",
          backgroundPosition: "0 0, 0 0, 0 0, 40px 40px, center",
        }}
      />

      {/* Accent orbs */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 500px at 20% 80%, rgba(103,232,249,0.08), transparent),
            radial-gradient(circle 600px at 80% 20%, rgba(217,70,239,0.08), transparent)
          `,
        }}
      />

      {/* Noise overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.04]" />
    </div>
  );
}

export function DotGridBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-[#070612]">
      {/* Dot grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(167,139,250,0.15) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Gradient overlays */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 900px at 50% 0%, rgba(167,139,250,0.12), transparent),
            radial-gradient(circle 700px at 0% 100%, rgba(217,70,239,0.10), transparent),
            radial-gradient(circle 700px at 100% 100%, rgba(103,232,249,0.10), transparent)
          `,
        }}
      />
    </div>
  );
}

export function MinimalGridBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-[#070612]">
      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(167,139,250,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(167,139,250,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Single centered gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle 1000px at 50% 30%, rgba(167,139,250,0.08), transparent)`,
        }}
      />
    </div>
  );
}

export function AnimatedGridBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-[#070612] overflow-hidden">
      {/* Animated grid with glow on all sides */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(167,139,250,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(167,139,250,0.06) 1px, transparent 1px),
            radial-gradient(circle 600px at 0% 200px, rgba(213,197,255,0.12), transparent),
            radial-gradient(circle 600px at 100% 200px, rgba(213,197,255,0.12), transparent),
            radial-gradient(circle 600px at 50% 0px, rgba(167,139,250,0.10), transparent),
            radial-gradient(circle 600px at 50% 100%, rgba(103,232,249,0.10), transparent)
          `,
          backgroundSize: `
            96px 64px,
            96px 64px,
            100% 100%,
            100% 100%,
            100% 100%,
            100% 100%
          `,
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] glow-orb opacity-20 aurora-1" />
      <div className="absolute top-[60%] right-[15%] w-[250px] h-[250px] iri-orb rounded-full opacity-15 aurora-2" />
    </div>
  );
}

export function DashboardBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-[#070612]">
      {/* Fine grid for dashboard */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(167,139,250,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(167,139,250,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Subtle corner accents */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 500px at 0% 0%, rgba(167,139,250,0.08), transparent),
            radial-gradient(circle 500px at 100% 0%, rgba(103,232,249,0.06), transparent)
          `,
        }}
      />

      {/* Noise for texture */}
      <div className="absolute inset-0 bg-noise opacity-[0.02]" />
    </div>
  );
}

export function DocsBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-[#070612]">
      {/* Clean grid for reading */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(167,139,250,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(167,139,250,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Minimal top gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle 800px at 50% 0%, rgba(167,139,250,0.06), transparent)`,
        }}
      />
    </div>
  );
}
