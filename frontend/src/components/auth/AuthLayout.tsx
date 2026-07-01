import Link from 'next/link';
import { fallbackTestimonials } from '@/lib/testimonials';
import { AuthThemeToggle } from './AuthThemeToggle';

/* ----------------------------------------------------------------------------
 * AuthLayout — the standalone, full-viewport split screen used by every auth
 * page (sign in / sign up / forgot / reset). A 1:1 port of the HTML reference:
 * a full-height branded panel on the left (gradient, logo, testimonial, stats)
 * and a vertically-centred form column on the right. It carries none of the
 * store chrome (no header, nav, newsletter, or footer). Layout/spacing live in
 * the `.v-auth-*` classes in globals.css so the pages stay declarative and the
 * form styling is defined exactly once. Below the `880px` breakpoint the brand
 * panel collapses away and only the centred form remains.
 * -------------------------------------------------------------------------- */

const LeafMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
  </svg>
);

const Star = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold-soft)" stroke="none">
    <path d="M12 2l2.9 6.26L21.5 9l-4.75 4.44L18 20l-6-3.27L6 20l1.25-6.56L2.5 9l6.6-.74z" />
  </svg>
);

const testimonial = fallbackTestimonials[0];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="v-auth-shell">
      {/* Brand panel (hidden on small screens) */}
      <aside className="v-auth-brand">
        <span className="v-auth-orb v-blob1" style={{ top: -80, left: -60, width: 320, height: 320, background: 'radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)' }} aria-hidden="true" />
        <span className="v-auth-orb v-blob2" style={{ bottom: -70, right: -50, width: 260, height: 260, background: 'radial-gradient(circle, rgba(212,160,23,0.28), transparent 70%)' }} aria-hidden="true" />

        <Link href="/" aria-label="Verdant home" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none', width: 'fit-content' }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.16)', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.22)' }}>
            <LeafMark />
          </span>
          <span style={{ fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 25, letterSpacing: '-0.01em', color: '#fff' }}>Verdant</span>
        </Link>

        <figure style={{ position: 'relative', margin: 0, maxWidth: 420 }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 18 }} aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} />
            ))}
          </div>
          <blockquote style={{ margin: 0, fontFamily: "'Newsreader',serif", fontSize: 27, lineHeight: 1.32, letterSpacing: '-0.01em', color: '#fff' }}>
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>
          <figcaption style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(150deg,#1f8a7f,#0c5b54)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              {testimonial.initials}
            </span>
            <span>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5, color: '#fff' }}>{testimonial.customerName}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'rgba(234,243,239,0.72)' }}>Verdant Circle member</span>
            </span>
          </figcaption>
        </figure>

        <dl style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,auto)', gap: 34, margin: 0 }}>
          {[
            { value: '38k+', label: 'Members' },
            { value: '4.9★', label: 'Avg rating' },
            { value: '100%', label: 'Carbon neutral' },
          ].map((stat) => (
            <div key={stat.label}>
              <dt style={{ fontFamily: "'Newsreader',serif", fontSize: 26, fontWeight: 500, color: '#fff', lineHeight: 1 }}>{stat.value}</dt>
              <dd style={{ margin: '6px 0 0', fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(234,243,239,0.7)' }}>{stat.label}</dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* Form panel */}
      <div className="v-auth-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link href="/" className="v-auth-back">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to store
          </Link>
          <AuthThemeToggle />
        </div>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px 0' }}>
          <div className="v-auth-body v-rise">{children}</div>
        </main>

        <footer style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--faint)' }}>
          © 2026 Verdant Studio · <Link href="/privacy" className="v-auth-footlink">Privacy</Link> · <Link href="/terms" className="v-auth-footlink">Terms</Link>
        </footer>
      </div>
    </div>
  );
}
