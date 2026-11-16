"use client";
import { useRef, useState, useEffect } from "react";
import { ArrowUpRight, X, Plus, Minus, Download } from "lucide-react";
import RevealText from "./RevealText";
const certificates = [
  { file: "cmmi-level3", name: "CMMI — Maturity Level 3", category: "Process improvement", page: 25 },
  { file: "quality-management", name: "Quality Management System", category: "Quality compliance", page: 25 },
  { file: "sa8000", name: "SA8000:2014", category: "Social accountability", page: 25 },
  { file: "iso14001", name: "ISO 14001:2015", category: "Environmental management", page: 27 },
  { file: "iso45001", name: "ISO 45001:2018", category: "Health & safety", page: 27 },
  { file: "rmc-capability", name: "RMC Capability Certification", category: "TÜV India", page: 27 },
];
export default function CredentialsGallery() {
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected !== null) {
      setZoom(1);
      setNaturalWidth(null);
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [selected]);
  const c = selected !== null ? certificates[selected] : null;
  return (
    <div className="cred-wall">
      <div className="cred-head">
        <div>
          <span className="cred-eyebrow">Standards behind our work</span>
          <RevealText as="h3">
            Certified to the
            <br />
            <em>standards that matter.</em>
          </RevealText>
        </div>
        <div className="cred-aside">
          <p>
            Every certificate below is the original document from our 2026
            corporate profile. Click any of them to inspect, zoom or download
            the source scan.
          </p>
          <dl className="cred-stats">
            <div><dt>{String(certificates.length).padStart(2, "0")}</dt><dd>Certifications</dd></div>
            <div><dt>03</dt><dd>ISO standards</dd></div>
            <div><dt>L3</dt><dd>CMMI maturity</dd></div>
          </dl>
        </div>
      </div>
      <ul className="cred-grid">
        {certificates.map((cert, i) => (
          <li key={cert.file}>
            <button className="cred-card" onClick={() => setSelected(i)}>
              <span className="cred-frame">
                <img
                  src={`/images/certificates/${cert.file}.webp`}
                  alt={`${cert.name} certificate preview`}
                  width="445"
                  height="632"
                  loading="lazy"
                />
                <span className="cred-view">
                  View certificate <ArrowUpRight size={15} />
                </span>
              </span>
              <span className="cred-meta">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>{cert.category}</span>
              </span>
              <span className="cred-name">{cert.name}</span>
              <span className="cred-page">Corporate profile · page {cert.page}</span>
            </button>
          </li>
        ))}
      </ul>
      <dialog
        className="certificate-dialog"
        aria-labelledby="certificate-title"
        ref={dialog}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setSelected(null);
        }}
      >
        {c && (
          <>
            <div className="certificate-toolbar">
              <div>
                <h2 id="certificate-title">{c.name}</h2>
                <p>Original scan · 2026 corporate profile</p>
              </div>
              <div>
                <button
                  aria-label="Zoom out certificate"
                  onClick={() => setZoom(Math.max(1, zoom - 0.25))}
                >
                  <Minus size={18} />
                </button>
                <button
                  aria-label="Zoom in certificate"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                >
                  <Plus size={18} />
                </button>
                <a
                  href={`/images/certificates/${c.file}.png`}
                  download
                  aria-label="Download original certificate"
                >
                  <Download size={18} />
                </a>
                <button
                  aria-label="Close certificate"
                  onClick={() => setSelected(null)}
                >
                  <X size={21} />
                </button>
              </div>
            </div>
            <div className="certificate-viewer">
              <img
                // Scans are low-res (~445px): show at native size so they stay
                // crisp, and only upscale when the user zooms in.
                style={
                  naturalWidth
                    ? { width: naturalWidth * zoom, maxWidth: zoom === 1 ? "100%" : "none" }
                    : { maxWidth: "100%" }
                }
                onLoad={(e) => setNaturalWidth(e.currentTarget.naturalWidth)}
                src={`/images/certificates/${c.file}.png`}
                alt={`${c.name}, original certificate scan from the company profile`}
              />
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
