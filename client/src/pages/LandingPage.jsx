import { ArrowRight, BarChart3, Check, Package, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { icon: Package, title: 'Know what’s on your shelves', copy: 'Keep product details, stock levels, and low-stock alerts together.' },
  { icon: BarChart3, title: 'See the whole sale', copy: 'Record multi-item transactions and let the API keep stock in sync.' },
  { icon: TrendingUp, title: 'Make decisions with your numbers', copy: 'Explore revenue, gross profit, and product movement from your records.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-lime"><Sparkles size={20} /></span>
          <span className="text-lg font-bold tracking-tight">MarketMind<span className="text-forest">.</span></span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink hover:bg-white">Log in</Link>
          <Link to="/register" className="rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#174d3b]">Create account</Link>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28">
          <div className="absolute -right-20 top-10 h-80 w-80 rounded-full bg-lime/30 blur-3xl" />
          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce8c7] bg-white px-3 py-1.5 text-xs font-semibold text-forest">
              <span className="h-2 w-2 rounded-full bg-forest" /> Built for independent retailers
            </div>
            <h1 className="max-w-2xl text-5xl font-bold leading-[1.07] tracking-[-0.055em] text-ink sm:text-6xl lg:text-7xl">
              A clearer view of your <span className="text-forest">everyday business.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Bring products, stock, and sales into one calm workspace. MarketMind turns your shop records into a more confident daily routine.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3.5 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-[#174d3b]">
                Get started <ArrowRight size={17} />
              </Link>
              <Link to="/login" className="rounded-xl border border-line bg-white px-6 py-3.5 text-center text-sm font-bold text-ink hover:border-forest/30">I already have an account</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-muted">
              <span className="flex items-center gap-1.5"><Check size={15} className="text-forest" /> Your own shop data</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-forest" /> Secure sign-in</span>
              <span className="flex items-center gap-1.5"><Check size={15} className="text-forest" /> No paid AI required</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -left-8 -top-8 h-24 w-24 rounded-[28px] bg-lime" />
            <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full border-[22px] border-[#dce9d7]" />
            <div className="relative rounded-[28px] border border-white bg-white p-5 shadow-[0_28px_80px_rgba(28,68,49,0.14)] sm:p-7">
              <div className="flex items-center justify-between border-b border-line pb-5">
                <div><p className="text-xs text-muted">Your workspace</p><p className="mt-1 font-bold">A little more in control.</p></div>
                <span className="rounded-full bg-[#edf5ee] px-3 py-1.5 text-xs font-bold text-forest">Private to you</span>
              </div>
              <div className="grid grid-cols-2 gap-3 py-5">
                <div className="rounded-2xl bg-canvas p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-forest"><Package size={18} /></span><p className="mt-3 text-sm font-bold">Products & stock</p><p className="mt-1 text-xs leading-5 text-muted">Know what’s available and what needs a restock.</p></div>
                <div className="rounded-2xl bg-[#f2f6e8] p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-forest"><BarChart3 size={18} /></span><p className="mt-3 text-sm font-bold">Sales & insights</p><p className="mt-1 text-xs leading-5 text-muted">Your actual transactions drive your shop reports.</p></div>
              </div>
              <div className="rounded-2xl bg-ink p-5 text-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-white/60">A better business rhythm</p><p className="mt-1 text-lg font-bold">Small details. Clear decisions.</p></div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><TrendingUp size={20} /></div>
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs text-white/65"><Check size={15} className="text-lime" /> Your sales, stock, and analytics in one place.</div>
              </div>
              <p className="mt-4 text-center text-[11px] text-muted">Dashboard values are shown from your own records.</p>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-10 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">A thoughtful toolkit</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The essentials, working together.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, copy }, index) => (
                <article key={title} className="rounded-2xl border border-line p-6 transition hover:-translate-y-1 hover:shadow-card">
                  <span className={`mb-5 grid h-11 w-11 place-items-center rounded-xl ${index === 1 ? 'bg-[#f1f6df]' : 'bg-[#edf5ee]'} text-forest`}><Icon size={20} /></span>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} MarketMind AI</span>
        <span>Business analytics are calculated from your shop's recorded sales.</span>
      </footer>
    </div>
  );
}
