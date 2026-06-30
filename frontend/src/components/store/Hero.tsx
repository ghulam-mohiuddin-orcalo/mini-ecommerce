'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';

/* ----------------------------------------------------------------------------
 * Verdant Hero + brand strip — a 1:1 port of the HTML reference. Styling is
 * inline (static) + `v-*` classes in globals.css (hover/keyframes), all keyed off
 * the reference design variables. A pointer-driven parallax sets --mx/--my on the
 * section (disabled under prefers-reduced-motion); the showcase panel and the
 * free-shipping pill translate with it, while the blobs and floating cards drift
 * on their own float animations — exactly as the reference behaves.
 * -------------------------------------------------------------------------- */

const BRANDS = ['Kinfolk', 'Cereal', 'Monocle', 'The Edit', 'Apartamento', 'Dwell'];

const ArrowRight = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section
      ref={heroRef}
      style={
        {
          position: 'relative',
          overflow: 'hidden',
          '--mx': 0,
          '--my': 0,
          background: 'linear-gradient(180deg,var(--bg),var(--bg2))',
        } as CSSProperties
      }
    >
      {/* decorative blobs */}
      <span
        className="v-blob1"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-8%',
          left: '-6%',
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: 'radial-gradient(circle,color-mix(in oklab,var(--primary) 30%,transparent),transparent 68%)',
          filter: 'blur(20px)',
          transform: 'translate(calc(var(--mx)*-34px),calc(var(--my)*-34px))',
        }}
      />
      <span
        className="v-blob2"
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-14%',
          right: '6%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle,color-mix(in oklab,var(--gold-soft) 26%,transparent),transparent 68%)',
          filter: 'blur(20px)',
          transform: 'translate(calc(var(--mx)*30px),calc(var(--my)*30px))',
        }}
      />

      <div className="v-hero-grid">
        {/* left */}
        <div>
          <div
            className="v-rise"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '7px 14px 7px 8px',
              borderRadius: 30,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              boxShadow: '0 4px 14px -10px var(--shadow)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 26,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--on-primary)',
                background: 'var(--primary)',
                padding: '3px 9px',
                borderRadius: 20,
              }}
            >
              New
            </span>
            The Winter Botanicals edit has landed
          </div>

          <h1
            className="v-rise"
            style={{
              fontFamily: "'Newsreader',serif",
              fontWeight: 400,
              fontSize: 'clamp(44px,5.4vw,76px)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              margin: '0 0 22px',
              color: 'var(--ink)',
              animationDelay: '0.05s',
            }}
          >
            Bring the
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--primary)' }}>quiet</em> outside in.
          </h1>

          <p
            className="v-rise"
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: 'var(--muted)',
              maxWidth: 480,
              margin: '0 0 34px',
              animationDelay: '0.12s',
            }}
          >
            Considered plants, hand-thrown ceramics and slow-made objects for a calmer home. Sourced responsibly, delivered carbon-neutral.
          </p>

          <div className="v-rise" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', animationDelay: '0.18s' }}>
            <Link href="/products" className="v-hero-btn-primary">
              Shop the collection
              <ArrowRight />
            </Link>
            <Link href="/about" className="v-hero-btn-secondary">
              Our story
            </Link>
          </div>

          <div className="v-rise" style={{ display: 'flex', gap: 34, marginTop: 46, animationDelay: '0.26s' }}>
            <div>
              <div style={{ fontFamily: "'Newsreader',serif", fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>38k+</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>Homes greened</div>
            </div>
            <div style={{ width: 1, background: 'var(--line2)' }} />
            <div>
              <div style={{ fontFamily: "'Newsreader',serif", fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>
                4.9<span style={{ fontSize: 18, color: 'var(--gold)' }}>★</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>12,400 reviews</div>
            </div>
            <div style={{ width: 1, background: 'var(--line2)' }} />
            <div>
              <div style={{ fontFamily: "'Newsreader',serif", fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>100%</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>Carbon neutral</div>
            </div>
          </div>
        </div>

        {/* right — showcase */}
        <div className="v-rise v-hero-showcase" style={{ animationDelay: '0.1s' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 28,
              background: 'radial-gradient(120% 120% at 35% 22%,color-mix(in oklab,var(--primary) 26%,var(--surface)),var(--surface2) 60%)',
              border: '1px solid var(--line)',
              boxShadow: '0 40px 80px -36px var(--shadow2)',
              overflow: 'hidden',
              transform: 'translate(calc(var(--mx)*16px),calc(var(--my)*16px))',
              transition: 'transform .2s ease-out',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: -40,
                bottom: -50,
                fontFamily: "'Newsreader',serif",
                fontSize: 300,
                lineHeight: 1,
                color: 'var(--ink)',
                opacity: 0.05,
              }}
            >
              M
            </span>
            <span
              style={{
                position: 'absolute',
                top: 26,
                left: 26,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Featured
            </span>
          </div>

          {/* floating product chip */}
          <div
            className="v-float-card"
            style={{
              position: 'absolute',
              left: -22,
              top: 60,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 18,
              padding: '14px 16px',
              boxShadow: '0 22px 50px -22px var(--shadow2)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transform: 'translate(calc(var(--mx)*-26px),calc(var(--my)*-26px))',
              transition: 'transform .2s ease-out',
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'radial-gradient(120% 120% at 30% 20%,color-mix(in oklab,#3F7D5B 32%,var(--surface)),var(--surface2))',
                display: 'grid',
                placeItems: 'center',
                fontFamily: "'Newsreader',serif",
                fontSize: 20,
                color: 'var(--ink-soft)',
              }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Monstera Deliciosa</div>
              <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>$68.00</div>
            </div>
          </div>

          {/* review card */}
          <div
            className="v-float2-card"
            style={{
              position: 'absolute',
              right: -14,
              bottom: 54,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 18,
              padding: '13px 16px',
              boxShadow: '0 22px 50px -22px var(--shadow2)',
              transform: 'translate(calc(var(--mx)*22px),calc(var(--my)*22px))',
              transition: 'transform .2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--gold)', fontSize: 15, letterSpacing: 1 }}>★★★★★</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Loved by 12,400 plant people</div>
          </div>

          {/* free shipping pill */}
          <div
            style={{
              position: 'absolute',
              left: 34,
              bottom: 30,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '10px 14px',
              boxShadow: '0 18px 40px -22px var(--shadow2)',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              transform: 'translate(calc(var(--mx)*-14px),calc(var(--my)*14px))',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h11v12m0 0h4m-4 0a2 2 0 1 0 4 0m0 0h2a1 1 0 0 0 1-1v-3.5L19 9h-5" />
              <circle cx="7" cy="18" r="2" />
            </svg>
            Free shipping
          </div>
        </div>
      </div>

      {/* brand strip / marquee */}
      <div style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)', overflow: 'hidden' }}>
        <div
          className="v-marquee-track"
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 64,
            padding: '18px 0',
            width: 'max-content',
            fontFamily: "'Newsreader',serif",
            fontSize: 21,
            color: 'var(--muted)',
            opacity: 0.8,
          }}
        >
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <span key={`${brand}-${i}`} style={{ display: 'contents' }}>
              <span>{brand}</span>
              <span>·</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
