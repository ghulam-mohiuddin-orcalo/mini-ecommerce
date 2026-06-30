import Link from 'next/link';

/* ----------------------------------------------------------------------------
 * Verdant "Our philosophy" band — a split panel ported from the reference. The
 * left is a soft sage art panel (radial gradient + a large faded serif initial,
 * with a muted uppercase eyebrow top-left); the right holds the serif headline,
 * a blurb, two brand promises with line icons, and a dark "Read our journal" CTA.
 *
 * Follows the established port pattern: inline styles for static props, `v-phil-*`
 * classes in globals.css for hover/focus + the responsive single-column collapse.
 * -------------------------------------------------------------------------- */

const LeafIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
  </svg>
);

const ShieldIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);

const ArrowRight = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** The soft sage art for the left panel — a light green tone fading into the surface. */
const philArt =
  'radial-gradient(120% 120% at 30% 22%, color-mix(in oklab, #3F7D5B 24%, var(--surface)) 0%, var(--surface2) 58%, color-mix(in oklab, #3F7D5B 8%, var(--surface2)) 100%)';

interface BrandPromise {
  icon: React.ReactNode;
  title: string;
  sub: string;
}

const PROMISES: BrandPromise[] = [
  { icon: <LeafIcon />, title: 'Responsibly grown', sub: 'Peat-free, pesticide-light nurseries.' },
  { icon: <ShieldIcon />, title: '30-day promise', sub: 'Thriving, or your money back.' },
];

export function Philosophy() {
  return (
    <section className="v-section" aria-label="Our philosophy">
      <div className="v-phil-card">
        {/* left — sage art panel */}
        <div className="v-phil-art">
          <span className="v-phil-eyebrow">Our philosophy</span>
          <span aria-hidden="true" className="v-phil-initial">
            V
          </span>
        </div>

        {/* right — content */}
        <div className="v-phil-body">
          <h2 className="v-phil-title">The art of slow living, one object at a time.</h2>
          <p className="v-phil-text">
            We work with a small circle of growers and makers who share our patience. Nothing
            mass-produced, nothing rushed — only pieces made to be lived with for years.
          </p>

          <div className="v-phil-features">
            {PROMISES.map((p) => (
              <div key={p.title} className="v-phil-feature">
                <span aria-hidden="true" className="v-phil-feature-icon">
                  {p.icon}
                </span>
                <span>
                  <span className="v-phil-feature-title">{p.title}</span>
                  <span className="v-phil-feature-sub">{p.sub}</span>
                </span>
              </div>
            ))}
          </div>

          <Link href="/journal" className="v-phil-cta">
            Read our journal
            <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}
