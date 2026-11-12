import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminCourses, CourseEditor, Dashboard, Users } from './Admin.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Ctx = createContext(null);
const useAuth = () => useContext(Ctx);

const inp = 'h-[52px] w-full rounded-xl border border-border bg-white px-4 text-sm text-forest placeholder:text-muted focus:border-teal';
const btn = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal px-6 font-semibold text-white transition hover:bg-[#145c51] disabled:cursor-not-allowed disabled:opacity-60';
const btnOutline = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-forest/20 bg-transparent px-6 font-semibold text-forest transition hover:border-teal hover:text-teal';
const btnSoft = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 font-semibold text-forest transition hover:border-teal/40 hover:text-teal';
const card = 'rounded-[14px] border border-border bg-white p-6 shadow-sm';

const Icon = ({ name, className = 'h-5 w-5' }) => {
  const p = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };
  if (name === 'book') return <svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (name === 'check') return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>;
  if (name === 'clock') return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
  if (name === 'device') return <svg {...p}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>;
  if (name === 'award') return <svg {...p}><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/></svg>;
  if (name === 'shield') return <svg {...p}><path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === 'play') return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z" fill="currentColor" stroke="none"/></svg>;
  if (name === 'search') return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
  if (name === 'user') return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>;
  if (name === 'arrow') return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
  if (name === 'menu') return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
  if (name === 'x') return <svg {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
};

const fmt = (m = 0) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);
const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'U';

async function api(path, opts = {}, token) {
  const t = token ?? localStorage.getItem('t');
  const r = await fetch(API + '/api' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: 'Bearer ' + t } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && t) {
      localStorage.clear();
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    const err = new Error(d.error || 'Something went wrong');
    err.status = r.status;
    throw err;
  }
  return d;
}

function useCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCourses(await api('/courses'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  return { courses, loading, error, reload: load };
}

function StateBox({ title, text, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-center">
      <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
      {text && <p className="mt-2 text-sm text-ink/70">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

function Loading({ label = 'Loading…' }) {
  return <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/70 shadow-sm">{label}</div>;
}

function Notice({ type = 'info', children }) {
  const styles = type === 'error'
    ? 'bg-red-50 text-red-700 border-red-200'
    : type === 'success'
      ? 'bg-mint text-ink border-lake/20'
      : 'bg-[#fff8e8] text-ink border-sun/40';
  return <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

function Site({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  const nav = [
    { to: '/', label: 'Home' },
    { to: '/courses', label: 'Courses' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];
  return (
    <div className="min-h-screen bg-canvas text-body">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-forest">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-4 px-5 lg:px-10">
          <Link to="/" className="font-display text-xl font-bold tracking-tight text-forest md:text-2xl">
            Thanzi<span className="text-teal">Learn</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-body md:flex" aria-label="Primary">
            {nav.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'text-teal' : 'text-forest/80 hover:text-teal'}>{item.label}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <Link to={user.role === 'admin' ? '/admin' : '/learn'} className="text-sm font-semibold text-forest hover:text-teal">{user.role === 'admin' ? 'Admin' : 'My Learning'}</Link>
                <button onClick={logout} className="inline-flex h-12 items-center rounded-xl px-5 text-sm font-semibold text-forest hover:text-teal">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="inline-flex h-12 items-center rounded-xl px-4 text-sm font-semibold text-forest hover:text-teal">Sign In</Link>
                <Link to="/register" className="inline-flex h-12 items-center justify-center rounded-xl bg-teal px-6 text-sm font-semibold text-white transition hover:bg-[#145c51]">Get Started</Link>
              </>
            )}
          </div>
          <button onClick={() => setOpen(v => !v)} className="inline-flex items-center justify-center rounded-xl border border-border p-2.5 text-forest md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}>
            <Icon name={open ? 'x' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
        {open && (
          <div id="mobile-nav" className="border-t border-border bg-white px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium" aria-label="Mobile">
              {nav.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `rounded-lg px-3 py-2.5 ${isActive ? 'bg-mint text-teal' : 'text-forest hover:bg-canvas'}`}>{item.label}</NavLink>
              ))}
              {user ? (
                <>
                  <Link to={user.role === 'admin' ? '/admin' : '/learn'} className="rounded-lg px-3 py-2.5 text-forest hover:bg-canvas">{user.role === 'admin' ? 'Admin' : 'My Learning'}</Link>
                  <button onClick={logout} className="rounded-lg px-3 py-2.5 text-left text-forest hover:bg-canvas">Log out</button>
                </>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link to="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-border font-semibold text-forest">Sign In</Link>
                  <Link to="/register" className="inline-flex h-12 items-center justify-center rounded-xl bg-teal font-semibold text-white">Get Started</Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="bg-white print:hidden">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div>
            <Link to="/" className="font-display text-xl font-bold text-forest">
              Thanzi<span className="text-teal">Learn</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-body">Learn. Grow. Strengthen Healthcare.</p>
          </div>
          <div>
            <h3 className="font-semibold text-forest">Explore</h3>
            <ul className="mt-4 space-y-3 text-sm text-body">
              <li><Link to="/" className="hover:text-teal">Home</Link></li>
              <li><Link to="/courses" className="hover:text-teal">Courses</Link></li>
              <li><Link to="/about" className="hover:text-teal">About Us</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-forest">Account</h3>
            <ul className="mt-4 space-y-3 text-sm text-body">
              <li><Link to="/login" className="hover:text-teal">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-teal">Create Account</Link></li>
              <li><Link to={user ? (user.role === 'admin' ? '/admin' : '/learn/my-learning') : '/login'} className="hover:text-teal">My Learning</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-forest">Support</h3>
            <ul className="mt-4 space-y-3 text-sm text-body">
              <li><Link to="/contact" className="hover:text-teal">Contact Us</Link></li>
              <li><Link to="/privacy" className="hover:text-teal">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-teal">Terms of Use</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-5 py-5 text-sm text-muted lg:px-10">© 2026 ThanziLearn. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

function Wrap({ children }) { return <div className="mx-auto max-w-[1200px] px-5 py-12 lg:px-10 lg:py-16">{children}</div>; }

function PageHero({ eyebrow, title, text, image = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80' }) {
  return (
    <section className="relative isolate min-h-[620px] overflow-hidden bg-forest md:min-h-[720px]">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
      <div className="relative mx-auto flex min-h-[620px] max-w-[1200px] items-center px-5 py-20 md:min-h-[720px] lg:px-10">
        <div className="max-w-3xl">
          {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-mint">{eyebrow}</p>}
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl" style={{ color: '#FFFFFF' }}>{title}</h1>
          {text && <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 md:text-lg">{text}</p>}
        </div>
      </div>
    </section>
  );
}

function CourseCard({ course, to }) {
  const progress = pct(course.done || 0, course.lessons || 0);
  const href = to || `/courses/${course.id}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-border bg-white transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-48 overflow-hidden border-b border-border bg-canvas">
        <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80" alt="" className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{course.category || 'Healthcare'}</div>
        <h3 className="mt-2 font-display text-xl font-semibold text-forest">{course.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-body">{course.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5" title="Level"><Icon name="layers" className="h-4 w-4" />Beginner</span>
          <span className="inline-flex items-center gap-1.5" title="Lessons"><Icon name="book" className="h-4 w-4" />{course.lessons ?? 0}</span>
          <span className="inline-flex items-center gap-1.5" title="Duration"><Icon name="clock" className="h-4 w-4" />{fmt(course.minutes)}</span>
        </div>
        {course.done > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted"><span>{course.passed ? 'Completed' : 'Progress'}</span><span>{course.passed ? '100%' : `${progress}%`}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-teal" style={{ width: `${course.passed ? 100 : progress}%` }} /></div>
          </div>
        )}
        <Link to={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-[#145c51]">View Course <Icon name="arrow" className="h-4 w-4" /></Link>
      </div>
    </article>
  );
}

function Landing() {
  const { courses, loading } = useCourses();
  const featured = courses.slice(0, 3);

  return (
    <>
      {/* Hero: background image, text left, light black gradient */}
      <section className="relative isolate min-h-[520px] overflow-hidden bg-forest">
        <img src="/images/herobg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10" />
        <div className="relative mx-auto flex max-w-[1200px] items-center px-5 py-20 md:py-28 lg:px-10 lg:py-32">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-[3.2rem]" style={{ color: '#FFFFFF' }}>Building knowledge.<br /><span className="text-orange">Strengthening</span> healthcare.</h1>
            <p className="mt-5 text-base leading-7 text-white/85 md:text-lg">Access practical learning opportunities designed to help healthcare professionals develop their knowledge, strengthen their skills and support better healthcare delivery.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" className={btn}>Explore Courses</Link>
              <Link to="/about" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/40 px-6 font-semibold text-white transition hover:bg-white/10">About Us</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/90">
              {[
                { icon: 'clock', label: 'Flexible learning' },
                { icon: 'book', label: 'Practical courses' },
                { icon: 'award', label: 'Certificates of completion' },
              ].map(item => (
                <li key={item.label} className="inline-flex items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-black"><Icon name={item.icon} className="h-4 w-4" /></span>{item.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why ThanziLearn: image left, text right */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-16 md:py-24 lg:grid-cols-2 lg:px-10 lg:py-[100px]">
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80" alt="Healthcare professionals learning together" className="aspect-[4/3] w-full rounded-[14px] border border-border object-cover" />
            <div className="absolute -bottom-4 -right-2 rounded-xl border border-border bg-white px-4 py-3 shadow-sm md:-right-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-forest"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-mint text-teal"><Icon name="book" className="h-4 w-4" /></span>Learn at your pace</div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Why ThanziLearn</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-forest md:text-4xl">Learning that supports better care.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-body">Accessible, focused courses that help healthcare professionals grow their knowledge and skills.</p>
            <ul className="mt-8 space-y-5">
              {[
                { icon: 'device', title: 'Accessible Learning', desc: 'Learn anywhere on phone, tablet, or computer.' },
                { icon: 'clock', title: 'Flexible Learning', desc: 'Short lessons that fit your schedule.' },
                { icon: 'shield', title: 'Practical Knowledge', desc: 'Apply relevant topics and check your understanding.' },
              ].map(item => (
                <li key={item.title} className="flex gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint text-teal"><Icon name={item.icon} className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-forest">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-body">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-24 lg:px-10 lg:py-[100px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Explore our courses</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-forest md:text-4xl">Explore learning opportunities.</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-body">Discover courses covering healthcare practice, patient safety, public health and emerging technologies.</p>
            </div>
            <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-[#0c3d68]">View All Courses <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10">
            {loading ? <Loading label="Loading courses…" /> : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(featured.length ? featured : [
                  { id: 'sample-1', title: 'Infection Prevention Basics', description: 'Learn essential practices to reduce infection risks and improve patient safety.', category: 'Patient Safety', lessons: 6, minutes: 30 },
                  { id: 'sample-2', title: 'Safe Medication Administration', description: 'Build confidence in safe medication checks and administration practices.', category: 'Clinical Practice', lessons: 8, minutes: 40 },
                  { id: 'sample-3', title: 'TB Awareness and Prevention', description: 'Understand key information on TB awareness, prevention, and care support.', category: 'Public Health', lessons: 5, minutes: 25 },
                ]).map(c => <CourseCard key={c.id} course={c} to={featured.length ? `/courses/${c.id}` : '/courses'} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Designed for practical learning - dark bg, minimal text, image with floating elements */}
      <section className="relative isolate overflow-hidden bg-forest">
        <img src="/images/Designedbg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/75" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-16 md:py-24 lg:grid-cols-2 lg:px-10 lg:py-[100px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange">Designed for practical learning</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white md:text-4xl" style={{ color: '#FFFFFF' }}>More than just reading. An engaging <span className="text-orange">learning</span> experience.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80">Clear, focused lessons help you learn, practise, and track your progress with confidence.</p>
            <Link to="/courses" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal px-6 font-semibold text-white transition hover:bg-[#0c3d68]">Explore courses <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <img src="/images/desgned.jpg" alt="Healthcare learning experience" className="aspect-[4/3] w-full rounded-[14px] object-cover" />
            <div className="absolute -left-2 top-6 rounded-xl bg-white px-4 py-3 shadow-lg md:-left-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-mint text-teal"><Icon name="play" className="h-5 w-5" /></span>
                <div><p className="text-xs text-muted">Lesson progress</p><p className="text-sm font-semibold text-forest">65% complete</p></div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-2 rounded-xl bg-white px-4 py-3 shadow-lg md:-right-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange/15 text-orange"><Icon name="award" className="h-5 w-5" /></span>
                <div><p className="text-xs text-muted">On completion</p><p className="text-sm font-semibold text-forest">Earn a certificate</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate / resume section (before CTA) */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-24 lg:px-10 lg:py-[100px]">
          <div className="grid items-center gap-8 rounded-[14px] border border-border bg-canvas p-6 md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Show your achievement</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-forest md:text-4xl">Earn a certificate you can add to your resume.</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-body">Upon successful completion of a course, you’ll receive a certificate of completion to showcase your learning and professional development on your resume or profile.</p>
            </div>
            <div className="rounded-[14px] border border-border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-teal"><Icon name="award" className="h-7 w-7" /></div>
              <p className="mt-4 font-display text-lg font-semibold text-forest">Certificate of Completion</p>
              <p className="mt-1 text-sm text-muted">ThanziLearn</p>
              <div className="mt-4 h-2 w-full rounded-full bg-canvas"><div className="h-2 w-3/4 rounded-full bg-orange" /></div>
              <p className="mt-3 text-xs text-muted">Add it to your resume and professional profiles</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - blue bg */}
      <section className="bg-teal">
        <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-20 lg:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Your learning journey starts here</p>
              <h2 className="mt-4 font-display text-3xl font-semibold text-white md:text-4xl" style={{ color: '#FFFFFF' }}>Invest in your knowledge. <span className="text-orange">Strengthen</span> your impact.</h2>
              <p className="mt-4 text-base leading-7 text-white/85">Explore practical learning opportunities and take the next step in your professional development.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3 md:justify-end">
              <Link to="/courses" className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 font-semibold text-teal transition hover:bg-mint">Explore Courses</Link>
              <Link to="/contact" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/40 px-8 font-semibold text-white transition hover:bg-white/10">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Catalogue() {
  const { courses, loading, error, reload } = useCourses();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = [...new Set(courses.map(c => c.category).filter(Boolean))];
  const list = courses.filter(c => {
    const q = query.toLowerCase();
    const matchQ = !q || `${c.title} ${c.description || ''} ${c.category || ''}`.toLowerCase().includes(q);
    const matchC = !category || c.category === category;
    return matchQ && matchC;
  });
  return (
    <>
      <PageHero eyebrow="Courses" title="Explore courses" text="Find practical training to support your professional development." image="https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1600&q=80" />
      <Wrap>
        <div className="-mt-6 mb-8 grid gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-md md:grid-cols-[1fr_220px]">
          <label className="block"><span className="sr-only">Search courses</span><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"><Icon name="search" className="h-4 w-4" /></span><input className={inp + ' pl-9'} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by title or keyword" /></div></label>
          <label className="block"><span className="sr-only">Filter by category</span><select className={inp} value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        </div>
        {loading ? <Loading label="Loading courses…" /> : error ? <StateBox title="Couldn’t load courses" text={error} action={<button className={btn} onClick={reload}>Try again</button>} /> : list.length === 0 ? (
          <StateBox title="No courses found" text={courses.length ? 'Try a different search or category.' : 'No courses have been published yet.'} action={courses.length ? <button className={btnSoft} onClick={() => { setQuery(''); setCategory(''); }}>Clear filters</button> : null} />
        ) : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{list.map(c => <CourseCard key={c.id} course={c} />)}</div>}
      </Wrap>
    </>
  );
}

function Preview() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api('/courses/' + id + '/preview').then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <Wrap><Loading label="Loading course…" /></Wrap>;
  if (error || !data) return <Wrap><StateBox title="Course unavailable" text={error || 'This course could not be found.'} action={<Link to="/courses" className={btnSoft}>Back to courses</Link>} /></Wrap>;
  const { course, lessons } = data;
  const total = lessons.reduce((s, l) => s + (l.duration_min || 0), 0);
  const startTo = user ? `/learn/course/${id}` : '/register';
  return (
    <>
      <PageHero eyebrow={course.category || 'Course'} title={course.title} text={course.description} image="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80" />
      <Wrap>
      <div className={card + ' -mt-6 md:p-8'}>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
          <span className="inline-flex items-center gap-1.5"><Icon name="book" className="h-4 w-4 text-lake" />{lessons.length} lessons</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4 text-lake" />About {fmt(total)}</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-lake" />Pass mark {course.pass_mark}%</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="shield" className="h-4 w-4 text-lake" />{course.questions} quiz questions</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={startTo} className={btn}>{user ? 'Open course' : 'Create free account to start'} <Icon name="arrow" className="h-4 w-4" /></Link>
          {!user && <Link to="/login" className={btnSoft}>I have an account</Link>}
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className={card}>
            <h2 className="font-display text-2xl font-bold">What you will learn</h2>
            {course.skills?.length ? (
              <ul className="mt-4 space-y-2 pl-5 text-sm leading-7 text-ink/70">{course.skills.map(s => <li key={s} className="list-disc">{s}</li>)}</ul>
            ) : <p className="mt-3 text-sm text-ink/70">Key concepts and practical steps are covered across the lessons and assessment.</p>}
          </section>
          <section className={card}>
            <h2 className="font-display text-2xl font-bold">Curriculum</h2>
            <ol className="mt-4 space-y-3">
              {lessons.map((l, i) => (
                <li key={l.id} className="flex items-center justify-between gap-4 rounded-xl border border-ink/10 bg-mist p-3">
                  <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">Lesson {i + 1}</div><div className="mt-1 font-semibold text-ink">{l.title}</div></div>
                  <div className="text-sm text-ink/60">{l.duration_min} min</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className={card + ' h-fit'}>
          <div className="rounded-xl bg-gradient-to-br from-lake/10 to-mint p-5">
            <div className="font-display text-lg font-bold text-ink">Course details</div>
            <dl className="mt-4 space-y-3 text-sm text-ink/70">
              <div className="flex justify-between gap-4"><dt>Lessons</dt><dd className="font-semibold text-ink">{lessons.length}</dd></div>
              <div className="flex justify-between gap-4"><dt>Duration</dt><dd className="font-semibold text-ink">{fmt(total)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Assessment</dt><dd className="font-semibold text-ink">Final quiz</dd></div>
              <div className="flex justify-between gap-4"><dt>Certificate</dt><dd className="font-semibold text-ink">On completion</dd></div>
            </dl>
          </div>
          <p className="mt-4 text-xs leading-5 text-ink/60">Completion certificates are for learning records and are not a professional licence unless stated.</p>
        </aside>
      </div>
      </Wrap>
    </>
  );
}

function About() {
  return (
    <>
      {/* Hero: consistent layout, taller, bg image, no eyebrow, short heading with orange accent, white subheading box */}
      <section className="relative isolate min-h-[620px] overflow-hidden bg-forest md:min-h-[720px]">
        <img src="/images/about.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
        <div className="relative mx-auto flex min-h-[620px] max-w-[1200px] items-center px-5 py-20 md:min-h-[720px] md:py-28 lg:px-10">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-[3.5rem]" style={{ color: '#FFFFFF' }}>
              Making healthcare <span className="text-orange">learning</span> accessible.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/90 md:text-lg">Flexible, practical courses that support healthcare professionals and students to grow with confidence.</p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-24 lg:px-10 lg:py-[100px]">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Our story</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-forest md:text-4xl">Why ThanziLearn?</h2>
            </div>
            <div className="space-y-4 text-base leading-7 text-body">
              <p>Healthcare professionals and students need learning that is accessible, relevant, and easy to fit into busy schedules. Yet opportunities for continued education can be limited by time, distance, and resources.</p>
              <p>ThanziLearn was created to help bridge that gap by offering flexible healthcare education that supports continuous learning. Through focused courses and clear learning experiences, we aim to make it easier for learners to grow their knowledge and apply it in practice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Experience */}
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-16 md:py-24 lg:grid-cols-2 lg:px-10 lg:py-[100px]">
          <div>
            <img src="/images/experience.jpg" alt="Healthcare learning experience" className="aspect-[4/3] w-full rounded-[14px] border border-border object-cover" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Learning experience</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-forest md:text-4xl">A clear and engaging way to learn.</h2>
            <p className="mt-5 text-base leading-7 text-body">
              ThanziLearn offers focused courses with clear learning materials, knowledge checks, and progress tracking to support understanding at every step. Learners can move at their own pace and, upon successful completion, receive a certificate of completion to reflect their learning.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {['Focused courses', 'Engaging materials', 'Knowledge checks', 'Progress & certificates'].map(item => (
                <li key={item} className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-forest">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-mint text-teal"><Icon name="check" className="h-4 w-4" /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Our Commitment to Quality */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-24 lg:px-10 lg:py-[100px]">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Our commitment to quality</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-forest md:text-4xl">Responsible learning. <span className="text-orange">Meaningful</span> knowledge.</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Clinical content review', desc: 'Content is reviewed for clarity and relevance to healthcare learning.' },
              { title: 'Clear learning objectives', desc: 'Each course has defined objectives so learners know what to expect.' },
              { title: 'Content accuracy', desc: 'We aim to keep information accurate, clear, and up to date.' },
              { title: 'Certificates and accreditation', desc: 'Completion certificates are not professional accreditation or a licence to practise unless stated.' },
            ].map(item => (
              <div key={item.title} className="rounded-[14px] border border-border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-teal"><Icon name="shield" className="h-5 w-5" /></span>
                <h3 className="mt-4 font-display text-lg font-semibold text-forest">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-body">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-teal">
        <div className="mx-auto max-w-[1200px] px-5 py-16 text-center md:py-20 lg:px-10">
          <h2 className="font-display text-3xl font-semibold text-white md:text-4xl" style={{ color: '#FFFFFF' }}>Be part of a continuous <span className="text-orange">learning</span> journey.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/85">Explore courses designed to support your growth and strengthen healthcare knowledge.</p>
          <Link to="/courses" className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 font-semibold text-teal transition hover:bg-mint">Explore Courses</Link>
        </div>
      </section>
    </>
  );
}

function HowItWorks() {
  const steps = [
    { icon: 'search', t: 'Explore courses', d: 'Browse available training and preview what each course covers.' },
    { icon: 'user', t: 'Create an account', d: 'Register for free to track your progress.' },
    { icon: 'book', t: 'Learn at your pace', d: 'Complete short lessons on any device.' },
    { icon: 'check', t: 'Take the assessment', d: 'Answer the final quiz to check understanding.' },
    { icon: 'award', t: 'Earn a certificate', d: 'View your certificate when you meet the pass mark.' },
  ];
  return (
    <>
      <PageHero eyebrow="How it works" title="A simple path from learning to completion" text="From discovery to certificate, every step is designed to be clear and manageable." image="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1600&q=80" />
      <Wrap>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {steps.map(({ icon, t, d }, i) => (
            <div key={t} className={card}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint font-display text-sm font-bold text-lake">{i + 1}</div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-lake/10 text-lake"><Icon name={icon} className="h-5 w-5" /></div>
              </div>
              <h2 className="font-display text-xl font-bold">{t}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/70">{d}</p>
            </div>
          ))}
        </div>
      </Wrap>
    </>
  );
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHero eyebrow="Contact" title="We’re here to help" text="Questions about courses, accounts, or using the platform? Send us a message." image="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=80" />
      <Wrap>
        <div className="-mt-6 mx-auto max-w-4xl rounded-3xl border border-ink/10 bg-white p-6 shadow-md md:p-8">
          <div className="grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl bg-ink p-6 text-white">
              <div className="font-display text-2xl font-bold">Thanzi<span className="text-sun">Learn</span></div>
              <div className="mt-6 space-y-4 text-sm text-white/85">
                <p className="flex items-start gap-2"><Icon name="user" className="mt-0.5 h-4 w-4 text-mint" /><span><a className="underline hover:text-white" href="mailto:hello@thanzilearn.org">hello@thanzilearn.org</a></span></p>
                <p className="flex items-start gap-2"><Icon name="clock" className="mt-0.5 h-4 w-4 text-mint" /><span>Support hours: Mon–Fri, 08:00–17:00</span></p>
                <p className="flex items-start gap-2"><Icon name="shield" className="mt-0.5 h-4 w-4 text-mint" /><span>For urgent clinical matters, contact your local health authority or supervisor.</span></p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); setSent(true); }}>
              {sent && <Notice type="success">Thanks for your message. If email delivery isn’t configured in this environment, please contact us directly at hello@thanzilearn.org.</Notice>}
              <div><label className="mb-1 block text-sm font-medium">Name</label><input className={inp} required placeholder="Your full name" /></div>
              <div><label className="mb-1 block text-sm font-medium">Email</label><input className={inp} required type="email" placeholder="you@example.com" /></div>
              <div><label className="mb-1 block text-sm font-medium">Message</label><textarea className={inp + ' min-h-32'} required placeholder="How can we help?" /></div>
              <button className={btn} type="submit">Send message <Icon name="arrow" className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
      </Wrap>
    </>
  );
}

function AuthPage({ reg = false, admin = false }) {
  const { login } = useAuth();
  const [fields, setFields] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();
  const testimonials = [
    { quote: 'ThanziLearn makes it easy to fit learning into a busy schedule and apply new knowledge with confidence.', name: 'Grace M.', role: 'Nurse' },
    { quote: 'The courses are clear, practical, and focused on what matters most in everyday healthcare work.', name: 'Daniel K.', role: 'Clinical Officer' },
    { quote: 'I appreciate being able to learn at my own pace and track my progress along the way.', name: 'Memory P.', role: 'Community Health Worker' },
  ];
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [testimonials.length]);
  const submit = async e => {
    e.preventDefault();
    setErr('');
    if (reg && (fields.name || '').trim().length < 2) return setErr('Please enter your full name.');
    if ((fields.password || '').length < 6) return setErr('Password must be at least 6 characters.');
    setBusy(true);
    try {
      const data = await api('/auth/' + (reg ? 'register' : 'login'), { method: 'POST', body: fields });
      login(data);
      navigate(data.user.role === 'admin' ? '/admin' : '/learn', { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-forest md:flex md:flex-col">
        <img src="/images/why.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="font-display text-3xl font-extrabold" style={{ color: '#FFFFFF' }}>Thanzi<span className="text-orange">Learn</span></Link>
          <div>
            <h1 className="max-w-md font-display text-4xl font-bold leading-tight" style={{ color: '#FFFFFF' }}>{admin ? 'Manage courses and learners' : reg ? 'Start your learning journey' : 'Welcome back'}</h1>
            <p className="mt-4 max-w-md text-base leading-7 text-white/85">Access practical courses, track progress, and earn completion certificates.</p>
          </div>
          <div className="max-w-md rounded-[14px] border border-white/20 bg-black/30 p-5 backdrop-blur-sm">
            <p className="text-sm leading-7 text-white/95">“{testimonials[slide].quote}”</p>
            <div className="mt-4">
              <p className="font-semibold text-white">{testimonials[slide].name}</p>
              <p className="text-xs text-white/75">{testimonials[slide].role}</p>
            </div>
            <div className="mt-4 flex gap-2">
              {testimonials.map((_, i) => (
                <button key={i} type="button" aria-label={`Show testimonial ${i + 1}`} onClick={() => setSlide(i)} className={`h-2.5 rounded-full transition ${slide === i ? 'w-6 bg-orange' : 'w-2.5 bg-white/50 hover:bg-white/70'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white p-6 md:p-10">
        <form onSubmit={submit} className="w-full max-w-md">
          <Link to="/" className="font-display text-xl font-extrabold text-forest md:hidden">Thanzi<span className="text-teal">Learn</span></Link>
          <h2 className="mt-4 font-display text-3xl font-bold text-forest md:mt-0">{admin ? 'Admin sign in' : reg ? 'Create your account' : 'Sign in'}</h2>
          <p className="mt-2 text-sm text-body">{reg ? 'Use your email to create a free learner account.' : 'Enter your email and password to continue.'}</p>
          <div className="mt-8 space-y-5">
            {reg && <div><label className="mb-1 block text-sm font-medium text-forest">Full name</label><input className={inp} required value={fields.name} onChange={e => setFields({ ...fields, name: e.target.value })} placeholder="Full name" autoComplete="name" /></div>}
            <div><label className="mb-1 block text-sm font-medium text-forest">Email address</label><input className={inp} required type="email" value={fields.email} onChange={e => setFields({ ...fields, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></div>
            <div><label className="mb-1 block text-sm font-medium text-forest">Password</label><input className={inp} required type="password" value={fields.password} onChange={e => setFields({ ...fields, password: e.target.value })} placeholder={reg ? 'At least 6 characters' : 'Password'} autoComplete={reg ? 'new-password' : 'current-password'} /></div>
            {err && <Notice type="error">{err}</Notice>}
            <button className={btn + ' w-full'} disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Sign in'}</button>
            {!admin && <p className="text-center text-sm text-body">{reg ? 'Already have an account?' : 'Don’t have an account?'} <Link to={reg ? '/login' : '/register'} className="font-semibold text-teal hover:underline">{reg ? 'Sign in' : 'Register'}</Link></p>}
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoPage({ title, text, backTo = '/login', backLabel = 'Back to sign in', embedded = false }) {
  const content = (
    <div className="w-full max-w-lg rounded-[14px] border border-border bg-white p-6 shadow-sm md:p-8">
      <Link to="/" className="font-display text-2xl font-bold text-forest">Thanzi<span className="text-teal">Learn</span></Link>
      <h1 className="mt-5 font-display text-3xl font-semibold text-forest">{title}</h1>
      <p className="mt-3 text-sm leading-7 text-body">{text}</p>
      <div className="mt-6 flex flex-wrap gap-3"><Link to={backTo} className={btn}>{backLabel}</Link><Link to="/contact" className={btnSoft}>Contact support</Link></div>
    </div>
  );
  if (embedded) return <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-10">{content}</div>;
  return <div className="flex min-h-screen items-center justify-center bg-canvas p-6">{content}</div>;
}

function LearnerShell({ children, title, subtitle, current = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  const links = [
    ['Dashboard', '/learn'],
    ['Explore courses', '/learn/courses'],
    ['My learning', '/learn/my-learning'],
    ['Certificates', '/learn/certificates'],
  ];
  return (
    <div className="min-h-screen bg-mist text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-ink/10 bg-white p-5 lg:flex">
          <Link to="/" className="font-display text-2xl font-extrabold">Thanzi<span className="text-lake">Learn</span></Link>
          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-mint p-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lake font-display text-sm font-bold text-white">{initials(user?.name)}</div>
            <div className="min-w-0"><div className="truncate font-semibold">{user?.name}</div><div className="text-xs text-ink/60">Learner account</div></div>
          </div>
          <nav className="mt-8 space-y-2" aria-label="Learner">
            {links.map(([label, to]) => (
              <NavLink key={to} end={to === '/learn'} to={to} className={({ isActive }) => `block rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-lake text-white' : 'text-ink/70 hover:bg-mint hover:text-ink'}`}>{label}</NavLink>
            ))}
          </nav>
          <div className="mt-auto pt-6"><button onClick={logout} className={btnSoft + ' w-full'}>Log out</button></div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-ink/10 bg-white px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 lg:hidden"><Link to="/" className="font-display text-lg font-extrabold">Thanzi<span className="text-lake">Learn</span></Link></div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink/60">{current}</div>
                <h1 className="truncate font-display text-2xl font-bold">{title}</h1>
                {subtitle && <p className="text-sm text-ink/70">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(v => !v)} className="rounded-xl border border-ink/15 px-3 py-2 text-sm font-semibold lg:hidden" aria-expanded={open} aria-controls="learner-nav">{open ? 'Close' : 'Menu'}</button>
                <button onClick={logout} className="hidden rounded-xl border border-ink/15 px-3 py-2 text-sm font-semibold sm:inline-flex lg:hidden">Log out</button>
              </div>
            </div>
            {open && (
              <nav id="learner-nav" className="mt-3 grid gap-2 lg:hidden" aria-label="Learner mobile">
                {links.map(([label, to]) => <NavLink key={to} end={to === '/learn'} to={to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-mint text-lake' : 'text-ink/80 hover:bg-mist'}`}>{label}</NavLink>)}
                <Link to="/" className="rounded-lg px-3 py-2 text-sm font-medium text-ink/80 hover:bg-mist">Back to site</Link>
              </nav>
            )}
          </header>
          <div className="flex-1 px-4 py-6 md:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function LearnDashboard() {
  const { user } = useAuth();
  const { courses, loading, error, reload } = useCourses();
  const inProgress = courses.filter(c => c.done > 0 && !c.passed);
  const completed = courses.filter(c => c.passed);
  const next = inProgress[0] || courses.find(c => !c.passed) || courses[0];
  const lessonsDone = courses.reduce((s, c) => s + (c.done || 0), 0);
  const first = user?.name?.split(' ')[0] || 'there';
  return (
    <LearnerShell title={`Welcome, ${first}`} subtitle="Track your progress and continue learning." current="Dashboard">
      {loading ? <Loading /> : error ? <StateBox title="Couldn’t load your dashboard" text={error} action={<button className={btn} onClick={reload}>Try again</button>} /> : courses.length === 0 ? (
        <StateBox title="No courses available yet" text="When courses are published, you’ll be able to start learning here." action={<Link to="/courses" className={btn}>Browse site</Link>} />
      ) : (
        <>
          {next && (
            <section className="rounded-3xl border border-ink/10 bg-mint p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lake">{next.done > 0 ? 'Continue learning' : 'Recommended to start'}</p>
              <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="font-display text-3xl font-bold">{next.title}</h2>
                  <p className="mt-2 text-sm text-ink/70">{next.done || 0} of {next.lessons} lessons complete · {fmt(next.minutes)}</p>
                </div>
                <Link to={`/learn/course/${next.id}`} className={btn}>{next.done > 0 ? 'Continue course' : 'Start course'}</Link>
              </div>
            </section>
          )}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[['Courses available', courses.length], ['In progress', inProgress.length], ['Lessons completed', lessonsDone], ['Certificates earned', completed.length]].map(([label, value]) => (
              <div key={label} className={card}><div className="font-display text-3xl font-bold">{value}</div><div className="mt-1 text-sm text-ink/70">{label}</div></div>
            ))}
          </div>
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-bold">Your courses</h2><Link to="/learn/my-learning" className="text-sm font-semibold text-lake">View all</Link></div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{courses.slice(0, 6).map(c => <CourseCard key={c.id} course={c} to={`/learn/course/${c.id}`} />)}</div>
          </section>
        </>
      )}
    </LearnerShell>
  );
}

function LearnCoursesPage() {
  const { courses, loading, error, reload } = useCourses();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = [...new Set(courses.map(c => c.category).filter(Boolean))];
  const list = courses.filter(c => {
    const q = query.toLowerCase();
    const matchQ = !q || `${c.title} ${c.description || ''}`.toLowerCase().includes(q);
    const matchC = !category || c.category === category;
    return matchQ && matchC;
  });
  return (
    <LearnerShell title="Explore courses" subtitle="Browse available courses and continue your learning." current="Explore courses">
      <div className="mb-6 grid gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
        <input className={inp} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search courses" aria-label="Search courses" />
        <select className={inp} value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>
      {loading ? <Loading /> : error ? <StateBox title="Couldn’t load courses" text={error} action={<button className={btn} onClick={reload}>Try again</button>} /> : list.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{list.map(c => <CourseCard key={c.id} course={c} to={`/learn/course/${c.id}`} />)}</div>
      ) : <StateBox title="No courses found" text="Try adjusting your search or filters." />}
    </LearnerShell>
  );
}

function MyLearningPage() {
  const { courses, loading, error, reload } = useCourses();
  const inProgress = courses.filter(c => c.done > 0 && !c.passed);
  const notStarted = courses.filter(c => !c.done && !c.passed);
  const completed = courses.filter(c => c.passed);
  const Section = ({ title, items, empty }) => (
    <section className={card}>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.length ? items.map(c => <CourseCard key={c.id} course={c} to={`/learn/course/${c.id}`} />) : <div className="rounded-2xl bg-mist p-5 text-sm text-ink/70 md:col-span-2 xl:col-span-3">{empty}</div>}
      </div>
    </section>
  );
  return (
    <LearnerShell title="My learning" subtitle="Manage courses and track your progress." current="My learning">
      {loading ? <Loading /> : error ? <StateBox title="Couldn’t load your courses" text={error} action={<button className={btn} onClick={reload}>Try again</button>} /> : (
        <div className="space-y-8">
          <Section title="In progress" items={inProgress} empty="No courses in progress yet. Start a course to see it here." />
          <Section title="Not started" items={notStarted} empty="You’ve started all available courses." />
          <Section title="Completed" items={completed} empty="No completed courses yet. Pass an assessment to earn a certificate." />
        </div>
      )}
    </LearnerShell>
  );
}

function CoursePage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async (keepIdx = true) => {
    try {
      const data = await api('/courses/' + id);
      setD(data);
      setError('');
      if (!keepIdx) setIdx(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { setLoading(true); load(false); }, [id]);
  if (loading) return <Wrap><Loading label="Loading course…" /></Wrap>;
  if (error || !d) return <Wrap><StateBox title="Couldn’t open course" text={error || 'Course not found.'} action={<Link to="/learn" className={btnSoft}>Back to dashboard</Link>} /></Wrap>;
  const { course, lessons, done, passed } = d;
  const progress = pct(done.length, lessons.length);
  const allDone = lessons.length > 0 && done.length === lessons.length;
  const inQuiz = idx < 0;
  const lesson = lessons[idx];
  const complete = async () => {
    if (!lesson) return;
    setBusy(true);
    try {
      await api('/lessons/' + lesson.id + '/complete', { method: 'POST' });
      const nextIdx = idx < lessons.length - 1 ? idx + 1 : -1;
      await load();
      setIdx(nextIdx);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const submitQuiz = async () => {
    if (answers.filter(a => a !== undefined).length < course.questions.length) { setError('Please answer all questions before submitting.'); return; }
    setBusy(true); setError('');
    try { setResult(await api('/courses/' + id + '/quiz', { method: 'POST', body: { answers } })); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Wrap>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lake">Course</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{course.title}</h1>
          <p className="mt-1 text-sm text-ink/70">{lessons.length} lessons · Pass mark {course.pass_mark}%</p>
        </div>
        <Link to="/learn/my-learning" className={btnSoft}>Back to my learning</Link>
      </div>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-ink/70"><span>Progress</span><span>{progress}%</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-lake" style={{ width: `${progress}%` }} /></div>
      </div>
      {error && <div className="mb-4"><Notice type="error">{error}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className={card + ' h-fit space-y-2 lg:sticky lg:top-24'}>
          <div className="mb-2 font-semibold text-ink">Lessons</div>
          {lessons.map((l, n) => (
            <button key={l.id} onClick={() => { setIdx(n); setResult(null); }} className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${n === idx ? 'bg-lake text-white' : 'bg-mist text-ink/75 hover:bg-mint hover:text-ink'}`}>
              <span className="mr-2 inline-block w-4">{done.includes(l.id) ? '✓' : n + 1 + '.'}</span>{l.title}
            </button>
          ))}
          <button disabled={!allDone} onClick={() => { setIdx(-1); setError(''); }} className={`w-full rounded-xl px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${inQuiz ? 'bg-lake text-white' : 'bg-mist text-ink/75 hover:bg-mint hover:text-ink'}`}>Final assessment</button>
          {!allDone && <p className="pt-1 text-xs text-ink/60">Complete all lessons to unlock the assessment.</p>}
        </aside>
        <section className={card + ' md:p-8'}>
          {!inQuiz ? (
            lesson ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lake">Lesson {idx + 1} of {lessons.length} · {lesson.duration_min || 5} min</p>
                <h2 className="mt-2 font-display text-3xl font-bold">{lesson.title}</h2>
                {lesson.video_url && <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10"><iframe src={lesson.video_url} className="aspect-video w-full" allowFullScreen title={lesson.title} /></div>}
                <div className="mt-5 whitespace-pre-line text-base leading-8 text-ink/75">{lesson.body || 'Lesson content will appear here.'}</div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className={btnSoft + ' disabled:opacity-50'}>Previous</button>
                  <button onClick={complete} disabled={busy} className={btn}>{busy ? 'Saving…' : done.includes(lesson.id) ? (idx < lessons.length - 1 ? 'Next lesson' : 'Go to assessment') : 'Mark complete & continue'}</button>
                </div>
              </>
            ) : <StateBox title="No lessons yet" text="This course doesn’t have any lessons." />
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lake">Final assessment</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Check your understanding</h2>
              <p className="mt-2 text-sm text-ink/70">Answer all {course.questions.length} questions. You need {course.pass_mark}% to pass.</p>
              {result ? (
                <div className={`mt-6 rounded-2xl p-6 ${result.passed ? 'bg-mint' : 'bg-[#fff3da]'}`}>
                  <div className="font-display text-2xl font-bold">{result.passed ? 'You passed' : 'Not passed yet'}</div>
                  <div className="mt-2 font-display text-5xl font-extrabold text-lake">{result.score}%</div>
                  <p className="mt-2 text-sm text-ink/80">{result.correct} of {result.total} correct · Pass mark {result.pass_mark}%</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {result.passed ? <Link to={`/learn/certificates/${id}`} className={btn}>View certificate</Link> : <button onClick={() => { setResult(null); setAnswers([]); setIdx(0); setError(''); }} className={btn}>Review lessons & try again</button>}
                    <Link to="/learn/my-learning" className={btnSoft}>Back to my learning</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-5">
                    {course.questions.map((q, n) => (
                      <fieldset key={n} className="rounded-2xl border border-ink/10 bg-mist p-4">
                        <legend className="mb-3 px-1 text-sm font-semibold text-ink">{n + 1}. {q.q}</legend>
                        <div className="space-y-2">
                          {q.options.map((opt, k) => (
                            <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${answers[n] === k ? 'border-lake bg-white text-ink' : 'border-ink/10 bg-white/70 text-ink/75 hover:border-lake/40'}`}>
                              <input type="radio" name={`q-${n}`} checked={answers[n] === k} onChange={() => { const next = [...answers]; next[n] = k; setAnswers(next); }} />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={submitQuiz} disabled={busy} className={btn}>{busy ? 'Submitting…' : 'Submit assessment'}</button>
                    <button onClick={() => setIdx(lessons.length - 1)} className={btnSoft}>Review last lesson</button>
                  </div>
                </>
              )}
              {passed && !result?.passed && <p className="mt-4 text-sm text-ink/70">You have already passed this course. <Link to={`/learn/certificates/${id}`} className="font-semibold text-lake hover:underline">View your certificate</Link>.</p>}
            </>
          )}
        </section>
      </div>
    </Wrap>
  );
}

function CertificatesPage() {
  const { courses, loading, error, reload } = useCourses();
  const earned = courses.filter(c => c.passed);
  return (
    <LearnerShell title="Certificates" subtitle="Certificates earned from completed courses." current="Certificates">
      {loading ? <Loading /> : error ? <StateBox title="Couldn’t load certificates" text={error} action={<button className={btn} onClick={reload}>Try again</button>} /> : earned.length === 0 ? (
        <StateBox title="No certificates yet" text="Complete a course and pass its assessment to earn a certificate." action={<Link to="/learn/courses" className={btn}>Explore courses</Link>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {earned.map(c => (
            <div key={c.id} className={card}>
              <div className="rounded-xl bg-mint p-4 text-center font-display text-lg font-bold text-lake">Certificate earned</div>
              <h3 className="mt-4 font-display text-xl font-bold">{c.title}</h3>
              <p className="mt-2 text-sm text-ink/70">Course completed with a passing assessment.</p>
              <Link to={`/learn/certificates/${c.id}`} className={btn + ' mt-5 w-full'}>View certificate</Link>
            </div>
          ))}
        </div>
      )}
    </LearnerShell>
  );
}

function CertificateViewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/courses/' + id).then(setD).catch(e => setError(e.message)).finally(() => setLoading(false)); }, [id]);
  if (loading) return <LearnerShell title="Certificate" current="Certificates"><Loading /></LearnerShell>;
  if (error) return <LearnerShell title="Certificate" current="Certificates"><StateBox title="Couldn’t load certificate" text={error} action={<Link to="/learn/certificates" className={btnSoft}>Back</Link>} /></LearnerShell>;
  if (!d?.passed) return <LearnerShell title="Certificate" current="Certificates"><StateBox title="Certificate locked" text="Pass the final assessment for this course to unlock your certificate." action={<Link to={`/learn/course/${id}`} className={btn}>Open course</Link>} /></LearnerShell>;
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <LearnerShell title="Certificate of completion" subtitle={d.course.title} current="Certificates">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-ink/10 bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <div className="rounded-[1.5rem] border-4 border-lake bg-[#f7faf8] p-8 text-center md:p-12">
            <div className="font-display text-3xl font-extrabold">Thanzi<span className="text-lake">Learn</span></div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-ink/60">Certificate of completion</p>
            <p className="mt-8 text-lg text-ink/70">This certifies that</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-ink">{user?.name}</h2>
            <p className="mt-3 text-lg text-ink/70">has successfully completed</p>
            <h3 className="mt-4 font-display text-3xl font-bold text-lake">{d.course.title}</h3>
            <p className="mt-6 text-sm text-ink/70">Issued on {today}</p>
            <p className="mt-6 text-xs text-ink/60">This certificate records course completion and is not a professional licence unless stated by the provider.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 print:hidden">
          <button onClick={() => window.print()} className={btn}>Print or save as PDF</button>
          <Link to="/learn/certificates" className={btnSoft}>Back to certificates</Link>
        </div>
      </div>
    </LearnerShell>
  );
}

function NotFound() {
  return (
    <Site>
      <Wrap>
        <StateBox title="Page not found" text="The page you’re looking for doesn’t exist or may have moved." action={<Link to="/" className={btn}>Go to home</Link>} />
      </Wrap>
    </Site>
  );
}

function RequireAuth({ children, adminOnly = false }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={adminOnly ? '/admin' : '/login'} replace state={{ from: loc }} />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/learn" replace />;
  return children;
}

function AdminGate({ children }) {
  const { user, logout } = useAuth();
  if (!user) return <AuthPage admin />;
  if (user.role !== 'admin') {
    return (
      <div className="grid min-h-screen place-items-center bg-mist p-6">
        <div className={card + ' max-w-md text-center'}><h1 className="font-display text-2xl font-bold">Admin access required</h1><p className="mt-2 text-sm text-ink/70">This account does not have permission to view the admin area.</p><div className="mt-5 flex justify-center gap-3"><Link to="/learn" className={btnSoft}>Go to dashboard</Link><button onClick={logout} className={btn}>Log out</button></div></div>
      </div>
    );
  }
  const link = ({ isActive }) => `text-sm ${isActive ? 'text-sun underline underline-offset-4' : 'text-white/80 hover:text-white'}`;
  return (
    <div className="min-h-screen bg-mist">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 md:px-6">
          <Link to="/admin" className="font-display text-xl font-bold">Thanzi<span className="text-sun">Learn</span> <span className="text-sm font-semibold text-white/70">Admin</span></Link>
          <nav className="flex flex-1 flex-wrap gap-4">
            <NavLink end to="/admin" className={link}>Dashboard</NavLink>
            <NavLink to="/admin/courses" className={link}>Courses</NavLink>
            <NavLink to="/admin/users" className={link}>Users</NavLink>
            <NavLink to="/admin/progress" className={link}>Progress</NavLink>
          </nav>
          <Link to="/" className="text-sm text-white/80 hover:text-white">View site</Link>
          <button onClick={logout} className="text-sm text-white/80 hover:text-white">Log out</button>
        </div>
      </header>
      <Wrap>{children}</Wrap>
    </div>
  );
}

function Progress() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/admin/overview').then(setRows).catch(e => setErr(e.message)); }, []);
  if (err) return <StateBox title="Couldn’t load progress" text={err} />;
  if (!rows) return <Loading />;
  const by = rows.reduce((acc, r) => { (acc[r.email] ||= { name: r.name, email: r.email, rows: [] }).rows.push(r); return acc; }, {});
  const groups = Object.values(by);
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold">Learner progress</h1>
      <p className="mb-6 text-sm text-ink/70">Progress across all learners and courses.</p>
      {!groups.length ? <StateBox title="No learner progress yet" text="Progress will appear here once learners start courses." /> : (
        <div className="space-y-4">
          {groups.map(g => (
            <section key={g.email} className={card}>
              <h2 className="font-display text-lg font-bold">{g.name} <span className="text-sm font-normal text-ink/60">{g.email}</span></h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm"><thead><tr className="text-left text-ink/60"><th className="py-2 pr-3">Course</th><th className="py-2 pr-3">Lessons</th><th className="py-2">Status</th></tr></thead>
                  <tbody>{g.rows.map(x => (<tr key={x.course_id} className="border-t border-ink/10"><td className="py-2 pr-3">{x.title}</td><td className="py-2 pr-3">{x.done}/{x.total}</td><td className="py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${x.passed ? 'bg-mint text-lake' : x.done > 0 ? 'bg-[#fff3da] text-ink' : 'bg-mist text-ink/60'}`}>{x.passed ? 'Passed' : x.done > 0 ? 'In progress' : 'Not started'}</span></td></tr>))}</tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function RedirectToLearnCourse() {
  const { id } = useParams();
  return <Navigate to={`/learn/course/${id}`} replace />;
}

function RedirectLegacyCourse() {
  const { courseId } = useParams();
  return <Navigate to={`/learn/course/${courseId}`} replace />;
}

function RedirectToLearnCertificate() {
  const { id } = useParams();
  return <Navigate to={`/learn/certificates/${id}`} replace />;
}

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('u') || 'null'); } catch { return null; } });
  const login = ({ token, user }) => { localStorage.setItem('t', token); localStorage.setItem('u', JSON.stringify(user)); setUser(user); };
  const logout = () => { localStorage.clear(); setUser(null); };
  const value = useMemo(() => ({ user, login, logout }), [user]);
  const home = user?.role === 'admin' ? '/admin' : '/learn';
  return (
    <Ctx.Provider value={value}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Site><Landing /></Site>} />
          <Route path="/courses" element={<Site><Catalogue /></Site>} />
          <Route path="/courses/:id" element={<Site><Preview /></Site>} />
          <Route path="/about" element={<Site><About /></Site>} />

          <Route path="/contact" element={<Site><ContactPage /></Site>} />
          <Route path="/privacy" element={<Site><InfoPage embedded title="Privacy Policy" text="Our privacy policy is being prepared. If you have questions about how your information is handled, please contact us." backTo="/" backLabel="Back to home" /></Site>} />
          <Route path="/terms" element={<Site><InfoPage embedded title="Terms of Use" text="Our terms of use are being prepared. By using ThanziLearn you agree to use the platform responsibly for learning purposes." backTo="/" backLabel="Back to home" /></Site>} />
          <Route path="/login" element={user ? <Navigate to={home} replace /> : <AuthPage />} />
          <Route path="/register" element={user ? <Navigate to={home} replace /> : <AuthPage reg />} />
          <Route path="/forgot-password" element={<InfoPage title="Password reset" text="Self-service password reset isn’t available in this version yet. Please contact your administrator or support to reset your password." />} />

          <Route path="/learn" element={<RequireAuth><LearnDashboard /></RequireAuth>} />
          <Route path="/learn/courses" element={<RequireAuth><LearnCoursesPage /></RequireAuth>} />
          <Route path="/learn/my-learning" element={<RequireAuth><MyLearningPage /></RequireAuth>} />
          <Route path="/learn/certificates" element={<RequireAuth><CertificatesPage /></RequireAuth>} />
          <Route path="/learn/certificates/:id" element={<RequireAuth><CertificateViewPage /></RequireAuth>} />
          <Route path="/learn/course/:id" element={<RequireAuth><CoursePage /></RequireAuth>} />

          {/* unify/redirect legacy and placeholder learner routes */}
          <Route path="/course/:id" element={<RequireAuth><RedirectToLearnCourse /></RequireAuth>} />
          <Route path="/my" element={<RequireAuth><Navigate to="/learn/my-learning" replace /></RequireAuth>} />
          <Route path="/certificate/:id" element={<RequireAuth><RedirectToLearnCertificate /></RequireAuth>} />
          <Route path="/learn/courses/:courseId/lessons/:lessonId" element={<RequireAuth><RedirectLegacyCourse /></RequireAuth>} />
          <Route path="/learn/courses/:courseId/assessment" element={<RequireAuth><RedirectLegacyCourse /></RequireAuth>} />
          <Route path="/learn/courses/:courseId/results" element={<RequireAuth><RedirectLegacyCourse /></RequireAuth>} />
          <Route path="/learn/profile" element={<RequireAuth><LearnerShell title="Profile" subtitle="Account details" current="Profile"><StateBox title="Profile editing coming soon" text="Your account name and email are managed by the system in this version. Contact an administrator if you need changes." action={<Link to="/learn" className={btnSoft}>Back to dashboard</Link>} /></LearnerShell></RequireAuth>} />
          <Route path="/learn/settings" element={<RequireAuth><LearnerShell title="Settings" subtitle="Preferences" current="Settings"><StateBox title="Settings coming soon" text="Notification and preference settings are not available yet." action={<Link to="/learn" className={btnSoft}>Back to dashboard</Link>} /></LearnerShell></RequireAuth>} />
          <Route path="/learn/help" element={<RequireAuth><LearnerShell title="Help & support" subtitle="Get assistance" current="Help"><StateBox title="Need help?" text="If you have trouble accessing a course or your account, reach out and we’ll assist you." action={<Link to="/contact" className={btn}>Contact support</Link>} /></LearnerShell></RequireAuth>} />

          <Route path="/admin" element={<AdminGate><Dashboard /></AdminGate>} />
          <Route path="/admin/courses" element={<AdminGate><AdminCourses /></AdminGate>} />
          <Route path="/admin/new" element={<AdminGate><CourseEditor /></AdminGate>} />
          <Route path="/admin/edit/:id" element={<AdminGate><CourseEditor /></AdminGate>} />
          <Route path="/admin/users" element={<AdminGate><Users /></AdminGate>} />
          <Route path="/admin/progress" element={<AdminGate><Progress /></AdminGate>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </Ctx.Provider>
  );
}
