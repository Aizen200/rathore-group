"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PresenceMap from "./PresenceMap";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  ArrowDown,
  Plus,
  Minus,
  MapPin,
  Building2,
  Route,
  Waves,
  Recycle,
  X,
  Check,
  ShieldCheck,
  Construction,
  Users,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import CredentialsGallery from "./CredentialsGallery";
import RevealText from "./RevealText";
import {
  capabilities,
  projects,
  leadership,
  equipment,
  groupCompanies,
  registrations,
  type Project,
} from "@/data/company";
const sectorImages: Record<string, string> = {
  Buildings: "/images/project-silvassa.webp",
  "Water infrastructure": "/images/hero-bridge.webp",
  "Roads & transportation": "/images/road.webp",
  "Waste & renewables": "/images/waste.webp",
  "Electrical & technology": "/images/banner1.webp",
  "Renewable energy": "/images/buildings.webp",
};
export function SectionLabel({
  children,
  number,
}: {
  children: React.ReactNode;
  number?: string;
}) {
  // Section labels (small eyebrows above headings) are no longer shown on the site.
  void children;
  void number;
  return null;
}
export function AboutSection({ full = false }: { full?: boolean }) {
  return (
    <section className="about-section story-section section-pad" id="about">
      <div className="container">
        <div className="story-head">
          <div className="story-title">
            <RevealText as="h2">
              Three decades of
              <br />
              engineering <span className="story-gold">excellence.</span>
            </RevealText>
          </div>
          <div className="story-intro">
            <p className="story-lead">
              Built with purpose. Defined by the things that last.
            </p>
            <p>
              Established in 1994 and headquartered in Mumbai, R & B Infra
              Project Limited delivers civil, mechanical and electrical
              engineering works across India. From the roads that connect us to
              the water systems that sustain us, our work is part of everyday
              life.
            </p>
            {!full && (
              <Link href="/about/" className="story-link">
                Get to know Rathore Group
                <span>
                  <ArrowUpRight size={18} />
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="story-mosaic">
          <figure className="story-photo story-photo-main">
            <img
              src="/images/projects/sirohi-medical-college.webp"
              alt="Medical College at Sirohi, photograph from the 2026 corporate profile"
              loading="lazy"
              width="900"
              height="1100"
            />
            <figcaption>
              <span>FEATURED PROJECT</span>
              <strong>Medical College</strong>
              <em>
                <MapPin size={13} /> Sirohi, Rajasthan
              </em>
            </figcaption>
          </figure>

          <div className="story-legacy">
            <div className="story-legacy-top">
              <span>EST.</span>
              <span>1994</span>
            </div>
            <strong>
              30<sup>+</sup>
            </strong>
            <p>Years of building trust across India</p>
            <div className="story-legacy-rule" />
            <ul>
              <li>Civil</li>
              <li>Mechanical</li>
              <li>Electrical</li>
            </ul>
          </div>

          <figure className="story-photo story-photo-side">
            <img
              src="/images/projects/pangong-road.webp"
              alt="Lukung–Chartse road in Ladakh"
              loading="lazy"
              width="700"
              height="500"
            />
            <figcaption>
              <span>ROADS</span>
              <strong>Lukung–Chartse, Ladakh</strong>
            </figcaption>
          </figure>
        </div>

        <ul className="story-facts">
          {[
            { icon: Building2, value: "Mumbai", label: "Headquarters" },
            { icon: Route, value: "Pan-India", label: "Project footprint" },
            { icon: Waves, value: "Water & roads", label: "Core infrastructure" },
            { icon: Recycle, value: "Waste-to-energy", label: "New frontiers" },
          ].map((f) => (
            <li key={f.label}>
              <f.icon size={22} strokeWidth={1.4} aria-hidden="true" />
              <div>
                <strong>{f.value}</strong>
                <span>{f.label}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="story-vm">
          <article className="story-vm-card story-vm-dark">
            <RevealText as="h3">
              A larger vision.
              <br />A lasting difference.
            </RevealText>
            <p>
              To become a preeminent Indian conglomerate across infrastructure,
              civil construction, solid waste management, storm water drainage
              and related sectors.
            </p>
          </article>
          <article className="story-vm-card">
            <RevealText as="h3">
              Quality in every detail.
              <br />
              Purpose in every project.
            </RevealText>
            <p>
              To deliver quality services, maintain efficiency and establish a
              strong presence across the globe.
            </p>
          </article>
        </div>
        {full && (
          <div className="history-line">
            <span className="eyebrow">OUR JOURNEY</span>
            {[
              { year: "1994", text: "The journey begins as a proprietorship." },
              {
                year: "2018",
                text: "Sewage treatment infrastructure at Mount Abu.",
              },
              {
                year: "2021",
                text: "Two-lane roads and bridges in Jammu & Kashmir.",
              },
              {
                year: "2024",
                text: "Mother and child specialty hospital construction.",
              },
              {
                year: "2026",
                text: "Diversification into waste-to-energy, biogas and biomining.",
              },
            ].map((m) => (
              <div key={m.year}>
                <strong>{m.year}</strong>
                <span>{m.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const capabilityProjects = [
  { image: "/images/projects/kanjurmarg-hospital.webp", title: "Mother–Child Hospital", location: "Kanjurmarg, Mumbai", focus: "Spaces for communities" },
  { image: "/images/projects/pangong-road.webp", title: "Lukung–Chartse Road", location: "Ladakh", focus: "Connections that matter" },
  { image: "/images/projects/parbhani-water-supply.webp", title: "Water Supply Scheme", location: "Parbhani, Maharashtra", focus: "Systems that sustain life" },
  { image: "/images/projects/badlapur-waste-plant.webp", title: "Waste Processing Plant", location: "Badlapur, Maharashtra", focus: "Resources reimagined" },
];

export function CapabilitiesSection({ full = false }: { full?: boolean }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const icons = [Building2, Route, Waves, Recycle];

  // Activate whichever step crosses the middle band of the viewport.
  useEffect(() => {
    const steps = stepRefs.current.filter(Boolean) as HTMLLIElement[];
    if (!steps.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  const goTo = (i: number) => {
    setActive(i);
    stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section
      className="capabilities-section expertise-section section-pad"
      id="capabilities"
      aria-labelledby="expertise-heading"
    >
      <div className="container">
        <SectionLabel number="02 / THE EXPERTISE">WHAT WE BUILD</SectionLabel>
        <div className="expertise-heading">
          <RevealText as="h2" id="expertise-heading">
            Built for life.<br />
            <span className="serif-accent">Engineered to last.</span>
          </RevealText>
          <div className="expertise-intro">
            <p>From the places we gather to the systems we depend on. We build the infrastructure that moves everyday life forward.</p>
          </div>
        </div>

        <div className="expertise-process">
          <div className="expertise-media" aria-hidden="true">
            {capabilityProjects.map((project, i) => (
              <figure key={project.image} className={`expertise-media-frame${active === i ? " is-active" : ""}`}>
                <img src={project.image} alt="" loading="lazy" width="1000" height="850" />
                <figcaption>
                  <strong>{project.title}</strong>
                  <span><MapPin size={14} />{project.location}</span>
                </figcaption>
              </figure>
            ))}
          </div>

          <ol className="expertise-steps" aria-label="Infrastructure capabilities">
            {capabilities.map((item, i) => {
              const Icon = icons[i];
              const project = capabilityProjects[i];
              const isActive = active === i;
              return (
                <li
                  key={item.id}
                  ref={(el) => { stepRefs.current[i] = el; }}
                  data-index={i}
                  className={`expertise-step${isActive ? " is-active" : ""}${i < active ? " is-past" : ""}`}
                >
                  <div className="expertise-rail">
                    <button
                      type="button"
                      className="expertise-node"
                      onClick={() => goTo(i)}
                      aria-label={`Show ${item.title}`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                  <article className="expertise-card">
                    <figure className="expertise-card-media">
                      <img src={project.image} alt={`${project.title}, ${project.location}`} loading="lazy" width="1000" height="850" />
                    </figure>
                    <span className="expertise-card-number">{item.number}</span>
                    <h3>{item.title}</h3>
                    <p className="expertise-card-subtitle">{item.subtitle}</p>
                    <p>{item.description}</p>
                    <ul>
                      {item.items.map((entry) => <li key={entry}><span aria-hidden="true" />{entry}</li>)}
                    </ul>
                    <Link
                      href={full ? "/contact/" : `/capabilities/#${item.id}`}
                      className="expertise-link"
                    >
                      {full ? "Discuss a project" : "Explore this capability"}
                      <span><ArrowUpRight size={18} aria-hidden="true" /></span>
                    </Link>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
        {full && (
          <div className="capability-all">
            {capabilities.map((c, i) => {
              const Icon = icons[i];
              return (
                <article id={c.id} key={c.id}>
                  <Icon size={27} />
                  <span>{c.number}</span>
                  <RevealText as="h3">{c.title}</RevealText>
                  <p>{c.description}</p>
                  <ul>
                    {c.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectDialog({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (project) dialog.current?.showModal();
    else dialog.current?.close();
  }, [project]);
  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      aria-labelledby="project-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      {project && (
        <div className="project-dialog-inner">
          <button
            onClick={onClose}
            className="dialog-close"
            aria-label="Close project details"
          >
            <X />
          </button>
          <div className="project-dialog-image">
            <img
              src={
                project.image?.replace(".jpg", ".webp") ||
                sectorImages[project.category]
              }
              alt={
                project.image
                  ? "Project image from the 2026 corporate profile"
                  : `${project.category} sector illustration; not a photograph of this project`
              }
            />
          </div>
          <div className="project-dialog-copy">
            <span className="eyebrow">
              {project.status} / {project.category}
            </span>
            <RevealText as="h2" id="project-dialog-title">{project.title}</RevealText>
            <p>
              <MapPin size={15} />
              {project.location}
            </p>
            <p>{project.description}</p>
            {project.value && (
              <div className="project-value">
                <strong>
                  ₹{project.value}
                  <small> Cr</small>
                </strong>
                <span>DOCUMENTED PROJECT VALUE</span>
              </div>
            )}
            <Link
              href={`/projects/${project.slug}/`}
              className="button button-gold"
            >
              View project page <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      )}
    </dialog>
  );
}
function scrollProjectTrack(element: HTMLDivElement, direction: number, from: number) {
  const cards = [...element.querySelectorAll<HTMLElement>(".project-card")];
  const first = cards[0];
  if (!first) return 0;
  const positions = cards.map((card) => card.offsetLeft - first.offsetLeft);
  const destination = direction > 0
    ? positions.find((position) => position > from + 2)
    : positions.reverse().find((position) => position < from - 2);
  const target = Math.max(0, Math.min(
    element.scrollWidth - element.clientWidth,
    destination ?? (direction > 0 ? element.scrollWidth : 0),
  ));
  element.scrollTo({
    left: target,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
  return target;
}

export function ProjectShowcase({ full = false }: { full?: boolean }) {
  const [status, setStatus] = useState<"Completed" | "Ongoing">("Completed");
  const [category, setCategory] = useState("All sectors");
  const [selected, setSelected] = useState<Project | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const navigationTarget = useRef<number | null>(null);
  useEffect(() => {
    const element = track.current;
    if (full || !element) return;
    let frame = 0;
    let pendingLeft: number | null = null;
    let maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    let drag: { id: number; x: number; left: number } | null = null;

    function flushScroll() {
      frame = 0;
      if (pendingLeft === null) return;
      element!.scrollTo({ left: pendingLeft, behavior: "instant" });
      pendingLeft = null;
    }
    function scheduleScroll(left: number) {
      pendingLeft = Math.max(0, Math.min(maxScroll, left));
      if (!frame) frame = requestAnimationFrame(flushScroll);
    }
    const resize = new ResizeObserver(() => {
      maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    });
    resize.observe(element);

    const resetNavigation = () => { navigationTarget.current = null; };
    function pointerDown(event: PointerEvent) {
      resetNavigation();
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      dragged.current = false;
      drag = { id: event.pointerId, x: event.clientX, left: element!.scrollLeft };
    }
    function pointerMove(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return;
      const distance = event.clientX - drag.x;
      if (!dragged.current && Math.abs(distance) < 6) return;
      if (!dragged.current) {
        dragged.current = true;
        element!.setPointerCapture(event.pointerId);
        element!.classList.add("is-dragging");
      }
      event.preventDefault();
      scheduleScroll(drag.left - distance);
    }
    function pointerEnd(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      cancelAnimationFrame(frame);
      flushScroll();
      element!.classList.remove("is-dragging");
      if (element!.hasPointerCapture(event.pointerId)) element!.releasePointerCapture(event.pointerId);
    }
    const preventImageDrag = (event: DragEvent) => event.preventDefault();
    element.addEventListener("wheel", resetNavigation, { passive: true });
    element.addEventListener("touchstart", resetNavigation, { passive: true });
    element.addEventListener("keydown", resetNavigation);
    element.addEventListener("scrollend", resetNavigation);
    element.addEventListener("pointerdown", pointerDown);
    element.addEventListener("pointermove", pointerMove);
    element.addEventListener("pointerup", pointerEnd);
    element.addEventListener("pointercancel", pointerEnd);
    element.addEventListener("lostpointercapture", pointerEnd);
    element.addEventListener("dragstart", preventImageDrag);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      element.classList.remove("is-dragging");
      resetNavigation();
      element.removeEventListener("wheel", resetNavigation);
      element.removeEventListener("touchstart", resetNavigation);
      element.removeEventListener("keydown", resetNavigation);
      element.removeEventListener("scrollend", resetNavigation);
      element.removeEventListener("pointerdown", pointerDown);
      element.removeEventListener("pointermove", pointerMove);
      element.removeEventListener("pointerup", pointerEnd);
      element.removeEventListener("pointercancel", pointerEnd);
      element.removeEventListener("lostpointercapture", pointerEnd);
      element.removeEventListener("dragstart", preventImageDrag);
    };
  }, [full, status]);
  const filtered = projects.filter(
    (p) =>
      p.status === status &&
      (category === "All sectors" || p.category === category),
  );
  function changeStatus(s: "Completed" | "Ongoing") {
    setStatus(s);
    track.current?.scrollTo({ left: 0, behavior: "instant" });
  }
  function moveProjects(direction: number) {
    const element = track.current;
    if (!element) return;
    navigationTarget.current = scrollProjectTrack(
      element, direction, navigationTarget.current ?? element.scrollLeft,
    );
  }
  return (
    <section className="projects-section section-pad" id="projects">
      <div className="container">
        <SectionLabel number="03 / PROOF IN EVERY PROJECT">
          SELECTED WORK
        </SectionLabel>
        <div className="section-heading-row">
          <RevealText as="h2">
            Engineering
            <br />
            <span className="serif-accent">what matters.</span>
          </RevealText>
          <div>
            <p>
              From critical public infrastructure to urban development,
              <br />
              our work creates value that outlasts the build.
            </p>
            {!full && (
              <Link href="/projects/" className="underlined-link">
                View all projects <ArrowUpRight size={17} />
              </Link>
            )}
          </div>
        </div>
        <div className="project-controls">
          <div
            className="status-tabs"
            role="tablist"
            aria-label="Project status"
          >
            {(["Completed", "Ongoing"] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={status === s}
                onClick={() => changeStatus(s)}
              >
                {s} projects{" "}
                <span>
                  {projects
                    .filter((p) => p.status === s)
                    .length.toString()
                    .padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
          {full ? (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter projects by sector"
            >
              <option>All sectors</option>
              {[...new Set(projects.map((p) => p.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          ) : (
            <div className="project-arrows">
              <button
                aria-label="Previous projects"
                onClick={() => moveProjects(-1)}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                aria-label="Next projects"
                onClick={() => moveProjects(1)}
              >
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className={full ? "project-grid container" : "project-track"}
        ref={track}
        onClickCapture={(event) => {
          if (!full && dragged.current && event.detail > 0) {
            event.preventDefault();
            event.stopPropagation();
            dragged.current = false;
          }
        }}
      >
        {filtered.map((p) => (
          <button
            className="project-card"
            key={p.slug}
            onClick={() => setSelected(p)}
          >
            <div className="project-image">
              <img
                src={
                  p.image?.replace(".jpg", ".webp") || sectorImages[p.category]
                }
                alt={
                  p.image
                    ? "Project image from the 2026 corporate profile"
                    : `${p.category} sector illustration`
                }
                loading="lazy"
                width="850"
                height="650"
              />
              <span className="project-status">
                <i />
                {p.status}
              </span>
              <span className="project-open">
                <ArrowUpRight size={23} />
              </span>
            </div>
            <div className="project-meta">
              <span>{p.category}</span>
            </div>
            <RevealText as="h3">{p.title}</RevealText>
            <div className="project-card-bottom">
              <span>
                <MapPin size={12} />
                {p.location}
              </span>
              {p.value && <strong>₹{p.value} Cr</strong>}
            </div>
          </button>
        ))}
      </div>
      <ProjectDialog project={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

const regions = [
  {
    name: "Maharashtra",
    caption: "Our home. A foundation for nationwide delivery.",
  },
  {
    name: "Rajasthan",
    caption: "Healthcare, sewerage and institutional infrastructure.",
  },
  {
    name: "Jammu & Kashmir",
    caption: "Road construction and highway connectivity.",
  },
  {
    name: "Ladakh",
    caption: "High-altitude roads connecting remote communities.",
  },
  {
    name: "Madhya Pradesh",
    caption: "Urban sanitation and sewage infrastructure.",
  },
  {
    name: "Uttar Pradesh",
    caption: "Renewable energy and public lighting systems.",
  },
  {
    name: "Odisha",
    caption: "Technology systems for public infrastructure.",
  },
  {
    name: "Arunachal Pradesh",
    caption: "Road infrastructure across challenging terrain.",
  },
  {
    name: "Himachal Pradesh",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
  {
    name: "Uttarakhand",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
  {
    name: "Haryana",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
  {
    name: "Bihar",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
  {
    name: "Assam",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
  {
    name: "Nagaland",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
  {
    name: "Gujarat",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
  {
    name: "Daman",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
  {
    name: "Karnataka",
    caption: "Regional presence documented in the 2026 corporate profile.",
  },
];
export function PresenceSection() {
  const [active, setActive] = useState(0);
  const region = regions[active];
  const list = projects.filter((p) => p.state === region.name);
  const pad = (n: number) => String(n).padStart(2, "0");
  const countFor = (name: string) =>
    projects.filter((p) => p.state === name).length;
  const documented = projects.filter((p) =>
    regions.some((r) => r.name === p.state),
  ).length;
  return (
    <section
      className="presence-section prs section-pad"
      id="presence"
      aria-labelledby="presence-heading"
    >
      <div className="container">
        <div className="prs-head">
          <RevealText as="h2" id="presence-heading">
            Many landscapes.
            <br />
            <span className="serif-accent">One purpose.</span>
          </RevealText>
          <div className="prs-intro">
            <p>
              From growing cities to demanding terrain, we bring engineering
              expertise where it matters.
            </p>
            <dl className="prs-stats">
              <div>
                <dt>{regions.length}</dt>
                <dd>Regions</dd>
              </div>
              <div>
                <dt>{pad(documented)}</dt>
                <dd>Documented projects</dd>
              </div>
              <div>
                <dt>Mumbai</dt>
                <dd>Home base</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="prs-body">
          <nav className="prs-list" aria-label="Explore project regions">
            <div className="prs-list-head" aria-hidden="true">
              <span>REGION</span>
              <span>PROJECTS</span>
            </div>
            <ol>
              {regions.map((r, i) => {
                const n = countFor(r.name);
                return (
                  <li key={r.name}>
                    <button
                      aria-pressed={i === active}
                      onClick={() => setActive(i)}
                    >
                      <span>{pad(i + 1)}</span>
                      <strong>{r.name}</strong>
                      <em>{n ? pad(n) : "—"}</em>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="prs-mobile-select">
            <label htmlFor="presence-select">EXPLORE A REGION</label>
            <select
              id="presence-select"
              value={active}
              onChange={(e) => setActive(Number(e.target.value))}
            >
              {regions.map((r, i) => (
                <option value={i} key={r.name}>
                  {pad(i + 1)} / {r.name}
                </option>
              ))}
            </select>
          </div>

          <figure className="prs-stage">
            <span className="prs-tag">
              <i />
              Documented regional presence
            </span>
            <PresenceMap regions={regions} active={active} onSelect={setActive} />

            <figcaption className="prs-detail" aria-live="polite">
              <div className="prs-detail-copy" key={region.name}>
                <span className="prs-eyebrow">
                  <MapPin size={12} aria-hidden="true" />
                  {pad(active + 1)} / {pad(regions.length)} · {region.name}
                </span>
                <h3>{region.caption}</h3>
                {list.length === 0 ? (
                  <p className="prs-note">
                    The corporate profile records our presence in this region.
                    Contact our team for individual project details.
                  </p>
                ) : (
                  <ul className="prs-projects">
                    {list.map((p) => (
                      <li key={p.slug}>
                        <Link href={`/projects/${p.slug}/`}>
                          <span>{p.title}</span>
                          <small>{p.status}</small>
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <small className="prs-disclaimer">
                Regional positions are indicative. Presence does not imply an
                active project; project status is identified individually.
              </small>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
const strengths = [
  {
    icon: ShieldCheck,
    title: "Proven execution excellence",
    text: "Multi-sector expertise backed by robust systems, streamlined processes and a commitment to quality.",
  },
  {
    icon: Construction,
    title: "An in-house equipment bank",
    text: "Owned construction machinery supporting operational efficiency and timely delivery.",
  },
  {
    icon: Users,
    title: "Experienced leadership",
    text: "A management team with experience in the delivery of complex infrastructure projects.",
  },
  {
    icon: TrendingUp,
    title: "Consistent financial growth",
    text: "Disciplined project execution with a long-term approach to sustainable business growth.",
  },
];
export function StrengthsSection() {
  return (
    <section className="strengths-section section-pad">
      <div className="container">
        <SectionLabel>THE WAY WE BUILD</SectionLabel>
        <div className="section-heading-row">
          <RevealText as="h2">
            The foundation of
            <br />
            <span className="muted">execution excellence.</span>
          </RevealText>
        </div>
        <div className="strengths-grid">
          {strengths.map((s, i) => (
            <article key={s.title}>
              <span className="strength-number">0{i + 1}</span>
              <s.icon size={37} strokeWidth={1} />
              <RevealText as="h3">{s.title}</RevealText>
              <p>{s.text}</p>
              <span className="strength-line" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function EquipmentSection() {
  const [active, setActive] = useState(0);
  const current = equipment[active];
  const count = equipment.length;
  return (
    <section className="equipment-section fleet-section section-pad" id="equipment" aria-labelledby="fleet-heading">
      <div className="container">
        <SectionLabel number="THE EQUIPMENT BANK">BUILT TO DELIVER</SectionLabel>
        <div className="fleet-heading">
          <RevealText as="h2" id="fleet-heading">
            Our strength.<br />
            <span className="serif-accent">On the ground.</span>
          </RevealText>
          <div className="fleet-intro">
            <p>A capable in-house equipment bank. The right tools to turn engineering ambition into on-site progress.</p>
          </div>
        </div>
        <div className="eqb">
          <nav className="eqb-list" aria-label="Select equipment">
            <ol>
              {equipment.map((item, i) => (
                <li key={item.name}>
                  <button aria-pressed={active === i} onClick={() => setActive(i)}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>{item.name}</strong>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="eqb-mobile-select">
            <label htmlFor="fleet-select">EXPLORE OUR EQUIPMENT</label>
            <select id="fleet-select" value={active} onChange={(event) => setActive(Number(event.target.value))}>
              {equipment.map((item, i) => <option value={i} key={item.name}>{String(i + 1).padStart(2, "0")} / {item.name}</option>)}
            </select>
          </div>
          <figure className="eqb-stage">
            {/* Photos vary wildly in ratio/size: a blurred cover fill sits behind the uncropped photo. */}
            <div className="eqb-media" key={current.image}>
              <img className="eqb-media-fill" src={current.image} alt="" aria-hidden="true" />
              <img className="eqb-media-photo" src={current.image} alt={`${current.name}, equipment photograph from the 2026 corporate profile`} loading="lazy" />
            </div>
            <figcaption className="eqb-caption">
              <div className="eqb-caption-copy" key={current.name}>
                <h3>{current.name}</h3>
                <p>{current.description}</p>
              </div>
              <div className="eqb-controls">
                <div className="eqb-position" aria-live="polite" aria-atomic="true">
                  <strong>{String(active + 1).padStart(2, "0")}</strong>
                  <span>/ {String(count).padStart(2, "0")}</span>
                  <span className="sr-only"> — {current.name}</span>
                </div>
                <div className="eqb-arrows">
                  <button aria-label="Previous equipment" onClick={() => setActive((value) => (value - 1 + count) % count)}><ArrowLeft size={19} /></button>
                  <button aria-label="Next equipment" onClick={() => setActive((value) => (value + 1) % count)}><ArrowRight size={19} /></button>
                </div>
              </div>
              <div className="eqb-progress" aria-hidden="true"><span style={{ width: `${((active + 1) / count) * 100}%` }} /></div>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
export function LeadershipSection({ full = false }: { full?: boolean }) {
  return (
    <section className="leadership-section section-pad" id="leadership">
      <div className="container">
        <SectionLabel number="05 / THE PEOPLE BEHIND THE PURPOSE">
          OUR LEADERSHIP
        </SectionLabel>
        <div className="section-heading-row">
          <RevealText as="h2">
            Leadership that builds
            <br />
            <span className="serif-accent">the future.</span>
          </RevealText>
          {!full && (
            <Link href="/leadership/" className="underlined-link">
              Meet our leadership <ArrowUpRight size={17} />
            </Link>
          )}
        </div>
        <div className="leadership-portraits">
          {leadership.map((leader, i) => (
            <article key={leader.name}>
              <div className="leader-portrait">
                <img
                  src={leader.photo}
                  alt={leader.name}
                  loading="lazy"
                  width="500"
                  height="650"
                />
              </div>
              <RevealText as="h3">{leader.name}</RevealText>
              <span className="leader-role">{leader.role}</span>
              {full && <p>{leader.note}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function GroupSection() {
  return (
    <section className="group-section section-pad">
      <div className="container">
        <SectionLabel>THE RATHORE ECOSYSTEM</SectionLabel>
        <div className="group-layout">
          <RevealText as="h2">
            One vision.
            <br />
            <span className="muted">Many possibilities.</span>
          </RevealText>
          <p>
            A connected group of companies working across infrastructure,
            environmental services and energy.
          </p>
        </div>
        <div className="group-companies">
          {groupCompanies.map((name, i) => (
            <div key={name}>
              <span>0{i + 1}</span>
              <RevealText as="h3">{name}</RevealText>
              <div className="ecosystem-node" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export function TrustSection() {
  const [open, setOpen] = useState(false);
  const clientGroups: { label: string; note: string; items: [string, string][] }[] = [
    {
      label: "Municipal bodies",
      note: "Urban water, roads & civic works",
      items: [
        ["/images/client-mcgm.webp", "Municipal Corporation of Greater Mumbai"],
        ["/images/client-thane.webp", "Thane Municipal Corporation"],
        ["/images/client-vvm.webp", "Vasai Virar City Municipal Corporation"],
        ["/images/client-jnn.webp", "Jodhpur Municipal Corporation"],
      ],
    },
    {
      label: "National agencies",
      note: "Rail, metro & highway infrastructure",
      items: [
        ["/images/clients/indian-railways.webp", "Indian Railways"],
        ["/images/clients/mmrda.webp", "MMRDA"],
        ["/images/clients/bro.webp", "Border Roads Organisation"],
        ["/images/clients/nhai.webp", "National Highways Authority of India"],
      ],
    },
  ];
  return (
    <section className="trust-section section-pad">
      <div className="container">
        <SectionLabel>INSTITUTIONAL TRUST</SectionLabel>
        <div className="section-heading-row">
          <RevealText as="h2">
            Trusted to build
            <br />
            public value.
          </RevealText>
          <p>
            Working with public institutions
            <br />
            to deliver essential infrastructure.
          </p>
        </div>
        <div className="trust-roster">
          {clientGroups.map((group, g) => (
            <div className="trust-group" key={group.label}>
              <div className="trust-group-head">
                <span className="trust-group-label">{group.label}</span>
                <span className="trust-group-note">{group.note}</span>
              </div>
              <ul className="trust-grid">
                {group.items.map(([src, name], i) => (
                  <li className="trust-card" key={name}>
                    <span className="trust-index">
                      {String(g * group.items.length + i + 1).padStart(2, "0")}
                    </span>
                    <div className="trust-logo">
                      <img src={src} alt="" width="110" height="110" loading="lazy" />
                    </div>
                    <span className="trust-name">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="registration-block">
          <button onClick={() => setOpen(!open)} aria-expanded={open}>
            <span>Registrations & government affiliations</span>
            <span>{open ? <Minus size={20} /> : <Plus size={20} />}</span>
          </button>
          {open && (
            <>
              <div className="registration-grid">
                {registrations.map((r) => (
                  <div key={r}>
                    <ShieldCheck size={19} />
                    {r}
                  </div>
                ))}
              </div>
              <p className="registration-note">
                Registrations documented on page 15 of the 2026 corporate
                profile.
              </p>
            </>
          )}
        </div>
        <CredentialsGallery />
      </div>
    </section>
  );
}
export function ResponsibilitySection() {
  return (
    <section className="responsibility-section section-pad">
      <div className="container">
        <SectionLabel>RESPONSIBILITY, BY DESIGN</SectionLabel>
        <div className="responsibility-layout">
          <div>
            <RevealText as="h2">
              A stronger tomorrow.
              <br />
              <span className="serif-accent">Starts with care.</span>
            </RevealText>
            <p>
              Our responsibilities extend beyond the structures we build—to our
              people, our communities and the environment.
            </p>
            <Link className="underlined-link" href="/contact/">
              Start a conversation <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="responsibility-values">
            <div>
              <ShieldCheck size={25} strokeWidth={1.3} />
              <RevealText as="h3">Safety. At every step.</RevealText>
              <p>
                Risk assessment, a commitment to safe working, incident
                reporting and investigation, and ongoing safety training and
                awareness.
              </p>
            </div>
            <div>
              <Recycle size={25} strokeWidth={1.3} />
              <RevealText as="h3">Progress. With purpose.</RevealText>
              <p>
                Community development, environmental stewardship, employee
                well-being, ethical governance and sustainable growth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export function FinalCTA() {
  return (
    <section className="final-cta">
      <img
        src="/images/road.webp"
        alt=""
        loading="lazy"
        width="1920"
        height="600"
      />
      <div className="final-cta-shade" />
      <div className="container">
        <RevealText as="h2">
          Let’s build
          <br />
          <span className="serif-accent">what matters.</span>
        </RevealText>
        <div>
          <p>
            Have an infrastructure project or partnership in mind?
            <br />
            Let’s start a conversation.
          </p>
          <div className="cta-actions">
            <Link href="/contact/" className="button button-gold">
              Get in touch <ArrowUpRight size={19} />
            </Link>
            <Link href="/capabilities/" className="text-link">
              Our capabilities <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
