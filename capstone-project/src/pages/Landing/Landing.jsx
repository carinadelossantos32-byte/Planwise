import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ClipboardList,
  FileBarChart2,
  MapPinned,
  PackageCheck,
} from "lucide-react";
import "./landing.css";

const LOGO = "/planwise-logo-yellow-gradient.svg";

const NAV_LINKS = [
  { id: "better-way", label: "Why PlanWise" },
  { id: "how-it-works", label: "How it works" },
];

const PAIN_POINTS = [
  {
    icon: ClipboardList,
    question: "Still keeping records on paper?",
    answer: "Every client record is kept in one private, searchable registry that only authorized staff can open.",
  },
  {
    icon: MapPinned,
    question: "Do you know where support is needed?",
    answer: "See service coverage across the barangays on the map, filtered by area and by family planning method.",
  },
  {
    icon: PackageCheck,
    question: "Running out of supplies without warning?",
    answer: "Low-stock thresholds for each method flag the health units that need restocking.",
  },
  {
    icon: FileBarChart2,
    question: "Spending days preparing reports?",
    answer: "Official forms are generated from your records, ready to export to PDF or Excel.",
  },
];

const STEPS = [
  {
    title: "Collect",
    text: "Authorized staff add records or bring in field data, so nothing has to be re-typed by hand.",
  },
  {
    title: "Verify",
    text: "Duplicate and inconsistent entries are caught before records are saved.",
  },
  {
    title: "Map & monitor",
    text: "Coverage is shown on the map, and supplies are tracked for every health unit.",
  },
  {
    title: "Report",
    text: "Generate the official forms and export them to PDF or Excel.",
  },
];

function scrollToId(event, id) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function Landing() {
  const [scrolled, setScrolled] = useState(false);

  // Tab title while this page is open
  useEffect(() => {
    const previous = document.title;
    document.title = "PlanWise | Family planning, managed wisely";
    return () => { document.title = previous; };
  }, []);

  // Solid navigation bar once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sections fade in as they come into view
  useEffect(() => {
    const items = document.querySelectorAll(".lp-reveal");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);


  return (
    <div className="lp">
      <a className="lp-skip" href="#main-content">Skip to content</a>

      {/* ── Navigation ── */}
      <header className={`lp-nav${scrolled ? " is-solid" : ""}`}>
        <div className="lp-wrap lp-nav-inner">
          <Link to="/" className="lp-brand" aria-label="PlanWise home">
            <img src={LOGO} alt="" width="36" height="36" />
            <span className="lp-wordmark">Plan<span>Wise</span></span>
          </Link>

          <nav className="lp-nav-links" aria-label="Page sections">
            {NAV_LINKS.map((link) => (
              <a key={link.id} href={`#${link.id}`} onClick={(e) => scrollToId(e, link.id)}>
                {link.label}
              </a>
            ))}
          </nav>

          <Link to="/login" className="lp-btn lp-btn--gold lp-btn--sm">
            Log In
          </Link>
        </div>
      </header>

      <main id="main-content">
        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <h1 className="lp-h1">
                Family planning, managed <em>wisely.</em>
              </h1>
              <p className="lp-lead">
                PlanWise brings private client records, field data, maps, supplies, and official reports
                into one system for the Commission on Population and Development and the City
                Health Office.
              </p>
              <div className="lp-actions">
                <Link to="/login" className="lp-btn lp-btn--gold lp-btn--lg">
                  Log In to PlanWise <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a
                  href="#how-it-works"
                  className="lp-btn lp-btn--ghost lp-btn--lg"
                  onClick={(e) => scrollToId(e, "how-it-works")}
                >
                  See how it works
                </a>
              </div>
            </div>

            <div className="lp-hero-visual">
              <div className="lp-hero-mark">
                <img src={LOGO} alt="PlanWise logo" width="240" height="240" fetchPriority="high" />
                <p className="lp-hero-name">Plan<span>Wise</span></p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why PlanWise ── */}
        <section id="better-way" className="lp-section lp-better" aria-labelledby="lp-better-title">
          <div className="lp-wrap">
            <header className="lp-section-head lp-reveal">
              <p className="lp-kicker lp-kicker--dark">Sound familiar?</p>
              <h2 id="lp-better-title" className="lp-h2">There&rsquo;s a better way.</h2>
              <p className="lp-sub">
                Paper logbooks and scattered spreadsheets slow down every part of the program.
                PlanWise answers each one.
              </p>
            </header>

            <div className="lp-feature-grid">
              {PAIN_POINTS.map(({ icon: Icon, question, answer }, index) => (
                <article
                  key={question}
                  className="lp-feature lp-reveal"
                  style={{ "--d": `${index * 70}ms` }}
                >
                  <span className="lp-feature-icon"><Icon size={22} aria-hidden="true" /></span>
                  <h3>{question}</h3>
                  <p className="lp-feature-tag">With PlanWise</p>
                  <p>{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="lp-section lp-how" aria-labelledby="lp-how-title">
          <div className="lp-wrap">
            <header className="lp-section-head lp-reveal">
              <p className="lp-kicker lp-kicker--dark">How it works</p>
              <h2 id="lp-how-title" className="lp-h2">From the field to the report</h2>
            </header>

            <ol className="lp-steps">
              {STEPS.map((step, index) => (
                <li key={step.title} className="lp-step lp-reveal" style={{ "--d": `${index * 90}ms` }}>
                  <span className="lp-step-num" aria-hidden="true">{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Call to action ── */}
        <section className="lp-cta" aria-labelledby="lp-cta-title">
          <div className="lp-wrap lp-cta-inner lp-reveal">
            <h2 id="lp-cta-title" className="lp-h2">Ready to get started?</h2>
            <p className="lp-sub">Sign in with your CPD or Health Office account.</p>
            <Link to="/login" className="lp-btn lp-btn--gold lp-btn--lg">
              Log In to PlanWise <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-grid">
          <div className="lp-footer-brand">
            <Link to="/" className="lp-brand" aria-label="PlanWise home">
              <img src={LOGO} alt="" width="36" height="36" />
              <span className="lp-wordmark">Plan<span>Wise</span></span>
            </Link>
            <p>
              A Geo-Enabled Responsible Parenthood and Family Planning Management System for the
              City of Malolos, Bulacan.
            </p>
          </div>

          <nav aria-label="Footer">
            <h4>Explore</h4>
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} onClick={(e) => scrollToId(e, link.id)}>{link.label}</a>
                </li>
              ))}
              <li><Link to="/login">Log In</Link></li>
            </ul>
          </nav>

          <div>
            <h4>Built for</h4>
            <p>Commission on Population and Development</p>
            <p>City Health Office</p>
            <p>City of Malolos, Province of Bulacan</p>
          </div>
        </div>

        <div className="lp-wrap lp-footer-base">
          <p>
            Developed as a capstone project of the College of
            Information and Communications Technology, Bulacan State University.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
