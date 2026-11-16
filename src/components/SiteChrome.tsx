"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowUp, Mail, Phone, X } from "lucide-react";
import { company } from "@/data/company";
import { usePathname } from "next/navigation";
import RevealText from "./RevealText";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link className={`brand ${small ? "brand-small" : ""}`} href="/">
      <span className="crest">
        <img src="/images/crest.webp" alt="" width="273" height="288" />
      </span>
      <span className="brand-text">
        RATHORE GROUP<small>BUILDING A LEGACY SINCE 1994</small>
      </span>
    </Link>
  );
}
const links = [
  ["About", "/about/"],
  ["Capabilities", "/capabilities/"],
  ["Projects", "/projects/"],
  ["Our presence", "/our-presence/"],
  ["Leadership", "/leadership/"],
];
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const [active, setActive] = useState(pathname);
  const norm = (h: string) => h.replace(/\/$/, "");

  useEffect(() => {
    setActive(pathname);
    if (pathname !== "/") return;
    const sections: Record<string, string> = {
      about: "/about/",
      capabilities: "/capabilities/",
      projects: "/projects/",
      presence: "/our-presence/",
      leadership: "/leadership/",
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(sections[e.target.id]);
        });
      },
      { rootMargin: "-15% 0px -50% 0px" },
    );
    Object.keys(sections).forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pathname]);

  // Condense after a little scroll; tuck away while scrolling down, return on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const handle = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 30);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      headerRef.current?.style.setProperty(
        "--hdr-progress",
        String(max > 0 ? Math.min(y / max, 1) : 0),
      );
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 420);
        last = y;
      }
    };
    update();
    window.addEventListener("scroll", handle, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handle);
    };
  }, []);

  // Sliding gold rule follows the hovered link, falling back to the active one.
  const target = hovered ?? active;
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>(
      `[data-href="${norm(target)}"]`,
    );
    if (!nav || !link) return setPill(null);
    setPill({ left: link.offsetLeft, width: link.offsetWidth });
  }, [target, scrolled]);

  function openMenu() {
    dialog.current?.showModal();
    setMenuOpen(true);
  }
  function closeMenu() {
    dialog.current?.close();
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header
        ref={headerRef}
        className={`hdr${scrolled ? " is-scrolled" : ""}${hidden && !menuOpen ? " is-hidden" : ""}`}
      >
        <div className="hdr-strip">
          <span>Est. {company.founded} · Mumbai, India</span>
          <span className="hdr-strip-contact">
            <a href={`tel:${company.phone.replace(/[^0-9+]/g, "")}`}>
              <Phone size={12} /> {company.phone}
            </a>
            <a href={`mailto:${company.email}`}>
              <Mail size={12} /> {company.email}
            </a>
          </span>
        </div>
        <div className="hdr-bar-wrap">
          <div className="hdr-bar">
            <Link
              className="hdr-brand"
              href="/"
              aria-label="Rathore Group home"
            >
              <img src="/images/crest.webp" alt="" width="273" height="288" />
              <span>
                <strong>Rathore Group</strong>
                <small>Building a legacy since {company.founded}</small>
              </span>
            </Link>
            <nav
              ref={navRef}
              className="hdr-nav"
              aria-label="Main navigation"
              onMouseLeave={() => setHovered(null)}
            >
              <span
                className="hdr-rule"
                aria-hidden="true"
                style={
                  pill
                    ? {
                        transform: `translateX(${pill.left}px)`,
                        width: pill.width,
                        opacity: 1,
                      }
                    : { opacity: 0 }
                }
              />
              {links.map(([label, href]) => {
                const current = norm(active) === norm(href);
                const lit = norm(target) === norm(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    data-href={norm(href)}
                    className={lit ? "is-lit" : undefined}
                    aria-current={current ? "page" : undefined}
                    onMouseEnter={() => setHovered(href)}
                    onFocus={() => setHovered(href)}
                    onBlur={() => setHovered(null)}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="hdr-actions">
              <Link href="/contact/" className="hdr-cta">
                <span>Enquire now</span>
                <i>
                  <ArrowUpRight size={16} strokeWidth={1.75} />
                </i>
              </Link>
              <button
                className="hdr-burger"
                aria-label="Open navigation"
                onClick={openMenu}
              >
                <span />
                <span />
              </button>
            </div>
          </div>
          <span className="hdr-progress" aria-hidden="true" />
        </div>
      </header>

      <dialog
        aria-label="Navigation"
        className="hdr-menu"
        ref={dialog}
        onClose={() => setMenuOpen(false)}
      >
        <div className="hdr-menu-top">
          <Link className="hdr-brand" href="/" onClick={closeMenu}>
            <img src="/images/crest.webp" alt="" width="273" height="288" />
            <span>
              <strong>Rathore Group</strong>
              <small>Building a legacy since {company.founded}</small>
            </span>
          </Link>
          <button
            className="hdr-menu-close"
            aria-label="Close navigation"
            onClick={closeMenu}
          >
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Mobile navigation" className="hdr-menu-nav">
          {[["Home", "/"], ...links, ["Contact", "/contact/"]].map(
            ([label, href], i) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                style={{ animationDelay: `${0.08 + i * 0.05}s` }}
                aria-current={norm(active) === norm(href) ? "page" : undefined}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {label}
                <ArrowUpRight size={22} />
              </Link>
            ),
          )}
        </nav>
        <div className="hdr-menu-foot">
          <a href={`tel:${company.phone.replace(/[^0-9+]/g, "")}`}>
            <Phone size={14} /> {company.phone}
          </a>
          <a href={`mailto:${company.email}`}>
            <Mail size={14} /> {company.email}
          </a>
          <p>Engineering infrastructure. Building a lasting legacy.</p>
        </div>
        <img
          className="hdr-menu-watermark"
          src="/images/crest.webp"
          alt=""
          aria-hidden="true"
        />
      </dialog>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <Logo />
          <p>
            Engineering infrastructure.
            <br />
            Building communities. Creating a stronger future.
          </p>
        </div>
        <a href="#main" className="back-top" aria-label="Back to top">
          <ArrowUp size={22} />
        </a>
      </div>
      <div className="footer-grid">
        <div>
          <span className="eyebrow">A LEGACY IN THE MAKING</span>
          <h3>
            Built on trust.
            <br />
            <span>Engineered to last.</span>
          </h3>
          <p>{company.legalName}</p>
        </div>
        <div>
          <h3 className="footer-nav-title">Explore</h3>
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h3 className="footer-nav-title">Capabilities</h3>
          <Link href="/capabilities/#buildings">Buildings</Link>
          <Link href="/capabilities/#roads">Roads & transportation</Link>
          <Link href="/capabilities/#water">Water infrastructure</Link>
          <Link href="/capabilities/#waste">Waste & renewables</Link>
        </div>
        <div>
          <h3 className="footer-nav-title">Get in touch</h3>
          <a href="tel:+912228957474">+91 22 2895 7474</a>
          <a href="tel:+912228958787">+91 22 2895 8787</a>
          <a href={`mailto:${company.email}`}>{company.email}</a>
          <a href={`mailto:${company.tenderEmail}`}>{company.tenderEmail}</a>
          <p className="footer-address">{company.address}</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Rathore Group. All rights reserved.
        </span>
        <span>
          MUMBAI, INDIA <span className="live-dot" />
        </span>
        <Link href="/privacy/">
          Privacy policy <ArrowUpRight size={12} />
        </Link>
      </div>
    </footer>
  );
}
export function PageHeading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div className="container">
        <div className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>{label}</span>
        </div>
        <span className="eyebrow">
          <span className="gold-line" />
          {label}
        </span>
        <RevealText as="h1">{title}</RevealText>
        <p>{description}</p>
      </div>
      <div className="heading-grid" />
    </div>
  );
}
