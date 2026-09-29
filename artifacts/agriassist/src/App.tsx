import { useMemo, useRef, useState, type ReactNode, type FormEvent, type ChangeEvent } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { SignIn, SignUp, useAuth } from '@clerk/react';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import {
  ArrowRight, BarChart3, Bell, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleAlert, CloudRain, FileText, History, ImagePlus, Leaf, LoaderCircle, LogIn,
  MapPin, Menu, MoreHorizontal, Pencil, ScanLine, Search, Settings2, ShieldCheck,
  Sprout, Store, SunMedium, Tractor, TrendingUp, UploadCloud, UserRound, X, Wind,
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey, getGetDashboardSummaryQueryKey, getGetFarmQueryKey,
  getListAdvisoriesQueryKey, useCreateDiseaseAdvisory, useCreateMarketAdvisory,
  useCreateWeatherAdvisory, useGetCurrentUser, useGetDashboardSummary, useGetFarm,
  useHealthCheck, useListAdvisories, useRequestUploadUrl, useUpsertFarm,
} from '@workspace/api-client-react';
import type { Advisory, AdvisoryCategory, DashboardSummary, FarmProfile } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const categoryMeta: Record<AdvisoryCategory, { label: string; color: string; icon: typeof Leaf }> = {
  disease: { label: 'Disease', color: 'hsl(3 59% 47%)', icon: ScanLine },
  weather: { label: 'Weather', color: 'hsl(205 58% 43%)', icon: CloudRain },
  market: { label: 'Market', color: 'hsl(35 76% 47%)', icon: TrendingUp },
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function initials(name?: string | null) {
  return (name || 'Farmer').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function readableResponse(response: Record<string, unknown> | undefined) {
  if (!response) return 'Your advisory is ready to review.';
  const preferred = ['summary', 'recommendation', 'advice', 'diagnosis', 'actionPlan', 'message'];
  for (const key of preferred) {
    const value = response[key];
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(' ');
  }
  const firstString = Object.values(response).find((value) => typeof value === 'string');
  return typeof firstString === 'string' ? firstString : 'Your advisory is ready to review.';
}

function ErrorState({ onRetry, message = 'We could not load this view.' }: { onRetry?: () => void; message?: string }) {
  return <div className="card p-8 text-center">
    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(3_59%_47%_/_0.1)] text-[hsl(3_59%_47%)]"><CircleAlert size={20} /></div>
    <h3 className="font-semibold">A little fieldwork is needed</h3>
    <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    {onRetry && <button data-testid="button-retry" className="btn-outline mt-5" onClick={onRetry}>Try again</button>}
  </div>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[hsl(var(--muted))] ${className}`} />;
}

function Logo({ dark = false }: { dark?: boolean }) {
  return <Link href="/" data-testid="link-logo" className={`flex items-center gap-3 ${dark ? 'text-[hsl(var(--primary-foreground))]' : 'text-foreground'}`}>
    <span className="leaf-mark"><Leaf size={18} strokeWidth={2.5} /></span>
    <span className="text-[17px] font-bold tracking-[-.03em]">AgriAssist</span>
  </Link>;
}

function Landing() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading: userLoading } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const { data: health } = useHealthCheck({ query: { queryKey: ['health'] } });
  if (isLoaded && isSignedIn) return <Redirect to="/dashboard" />;
  if (isLoaded && user && !userLoading) return <Redirect to="/dashboard" />;
  return <div className="grain min-h-[100dvh] overflow-hidden">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
      <Logo />
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-[hsl(158_42%_40%)]" /> {health?.status === 'ok' ? 'Systems ready' : 'Field-ready guidance'}</span>
        <Link href="/sign-in" data-testid="link-landing-signin" className="btn-outline"><LogIn size={15} /> Sign in</Link>
      </div>
    </header>
    <main>
      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-12 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="rise relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary))]"><Sprout size={14} /> Decisions for the next field day</div>
          <h1 className="serif max-w-2xl text-[clamp(3.2rem,7vw,6.2rem)] leading-[.93] tracking-[-.055em]">Good farming starts with a <span className="text-[hsl(var(--primary))]">clear read.</span></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">AgriAssist turns leaf photos, changing skies, and local prices into practical next steps — built for the work between sunrise and sundown.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/sign-up" data-testid="link-landing-signup" className="btn-primary">Set up your workspace <ArrowRight size={16} /></Link><Link href="/sign-in" data-testid="link-landing-enter" className="btn-outline">I already have an account</Link></div>
          <div className="mt-10 flex items-center gap-3 text-xs text-muted-foreground"><ShieldCheck size={16} className="text-[hsl(var(--primary))]" /> Your advisory history stays tied to your account.</div>
        </div>
        <div className="rise-2 relative min-h-[390px]">
          <div className="absolute right-0 top-0 h-[345px] w-[88%] rounded-[48%_48%_12%_12%] bg-[hsl(158_42%_29%)] lg:h-[430px]" />
          <div className="absolute bottom-0 left-0 h-[260px] w-[72%] rounded-[34%_70%_12%_12%] bg-[hsl(91_26%_68%)]" />
          <div className="absolute left-[12%] top-[15%] w-[78%] rotate-[-7deg] rounded-2xl border border-[hsl(42_44%_98%_/_0.35)] bg-[hsl(42_44%_98%_/_0.15)] p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[hsl(42_44%_98%_/_0.2)] pb-3 text-[hsl(var(--primary-foreground))]"><span className="flex items-center gap-2 text-xs font-semibold"><ScanLine size={15} /> Leaf advisory</span><span className="rounded-full bg-[hsl(35_76%_59%)] px-2 py-1 text-[10px] font-bold text-[hsl(var(--foreground))]">READY</span></div>
            <div className="mt-5 flex gap-3"><div className="h-28 w-24 rounded-xl bg-[hsl(91_30%_60%)]" /><div className="flex-1 text-[hsl(var(--primary-foreground))]"><p className="text-xs opacity-70">Field note · ready to review</p><p className="serif mt-2 text-2xl">Crop pattern</p><p className="mt-2 text-xs leading-5 opacity-75">A focused read with practical next steps for the field.</p></div></div>
          </div>
          <div className="absolute bottom-7 right-[4%] rounded-2xl bg-[hsl(var(--card))] p-4 shadow-xl"><div className="flex items-center gap-2 text-xs font-semibold"><CloudRain size={15} className="text-[hsl(205_58%_43%)]" /> Weather window</div><p className="mt-2 text-sm font-bold">A change is coming</p><p className="mt-1 text-xs text-muted-foreground">Plan your next field window.</p></div>
        </div>
      </section>
      <section className="border-y border-[hsl(var(--border))] bg-[hsl(91_26%_88%_/_.35)] px-5 py-12 lg:px-10"><div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3"><Feature icon={<ScanLine />} title="See what changed" text="Upload a leaf photo and get a focused disease read with actions you can take today." /><Feature icon={<Wind />} title="Prepare for weather" text="Turn a forecast event into crop-specific protection steps for the growth stage you are in." /><Feature icon={<Store />} title="Sell with context" text="Compare yield, price, and storage choices before you decide to move the harvest." /></div></section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="mono text-xs uppercase tracking-[.2em] text-[hsl(var(--primary))]">A quieter kind of confidence</p><h2 className="serif mt-4 text-4xl leading-tight tracking-[-.04em] lg:text-5xl">The field is complex. Your next step does not have to be.</h2></div><div className="grid gap-4 sm:grid-cols-2"><Quote n="01" text="Keep your farm profile once. Every advisory starts closer to the truth." /><Quote n="02" text="Review decisions over time, not just when the pressure is on." /></div></div></section>
    </main>
    <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-[hsl(var(--border))] px-5 py-7 text-xs text-muted-foreground sm:flex-row sm:justify-between lg:px-10"><span>AgriAssist Crop Advisory</span><span>Practical intelligence for the growing season.</span></footer>
  </div>;
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rise-3"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--card))] text-[hsl(var(--primary))]">{icon}</div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}
function Quote({ n, text }: { n: string; text: string }) {
  return <div className="card p-5"><span className="mono text-xs text-[hsl(var(--accent-foreground))]">{n}</span><p className="mt-8 text-lg leading-7">{text}</p></div>;
}

const nav = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/disease-detection', label: 'Disease detection', icon: ScanLine },
  { href: '/weather-alerts', label: 'Weather alerts', icon: CloudRain },
  { href: '/market-insights', label: 'Market insights', icon: TrendingUp },
  { href: '/history', label: 'Advisory history', icon: History },
];

function PortalShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  return <div className="grain app-shell flex bg-[hsl(var(--background))]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-[hsl(var(--border))] bg-[hsl(91_26%_91%)] px-4 py-5 transition-transform md:relative md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-10 flex items-center justify-between px-2"><Logo /><button className="md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-nav"><X size={18} /></button></div>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Workspace</div>
      <nav className="space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`sidebar-link ${location === href ? 'active' : ''}`}><Icon size={17} />{label}</Link>)}</nav>
      <div className="mt-auto space-y-1"><Link href="/farm-profile" data-testid="link-nav-farm-profile" className={`sidebar-link ${location === '/farm-profile' ? 'active' : ''}`}><Tractor size={17} />Farm profile</Link><div className="mt-5 border-t border-[hsl(var(--border))] pt-4"><div className="flex items-center gap-3 px-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))]">{initials(user?.fullName)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.fullName || 'Your workspace'}</p><p className="truncate text-xs text-muted-foreground">{user?.email || 'Account details'}</p></div><MoreHorizontal size={16} className="ml-auto text-muted-foreground" /></div></div></div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-[hsl(var(--foreground)_/_0.25)] md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu overlay" data-testid="button-overlay-nav" />}
    <div className="min-w-0 flex-1"><header className="flex h-[72px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)_/_.82)] px-5 backdrop-blur md:px-9"><button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-nav"><Menu size={21} /></button><div className="hidden text-sm text-muted-foreground md:block">{location === '/dashboard' ? 'Your farm at a glance' : nav.find((item) => item.href === location)?.label || 'Farm profile'}</div><div className="ml-auto flex items-center gap-4"><button className="relative text-muted-foreground" aria-label="Notifications" data-testid="button-notifications"><Bell size={18} /><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /></button><div className="hidden h-5 w-px bg-[hsl(var(--border))] sm:block" /><span className="hidden text-xs text-muted-foreground sm:block">{user?.location || 'Add your farm location'}</span><MapPin size={15} className="text-[hsl(var(--primary))]" /></div></header><main className="mx-auto max-w-[1400px] px-5 py-7 md:px-9 md:py-9">{children}</main></div>
  </div>;
}

function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  return <div className="rise">
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mono text-xs uppercase tracking-[.2em] text-[hsl(var(--primary))]">Overview</p><h1 className="serif mt-2 text-4xl tracking-[-.04em]">Good morning, {data.user.fullName?.split(' ')[0] || 'farmer'}.</h1><p className="mt-2 text-sm text-muted-foreground">A clear view of the decisions shaping your season.</p></div><Link href="/farm-profile" data-testid="link-dashboard-profile" className="btn-outline"><Settings2 size={15} /> {data.farm ? 'Update farm profile' : 'Set up farm profile'}</Link></div>
    <div className="page-grid">
      <StatCard label="Total advisories" value={data.totalAdvisories} note="All time" icon={<BookOpen />} />
      <StatCard label="Disease checks" value={data.categoryCounts.disease} note="Leaf image reads" icon={<ScanLine />} />
      <StatCard label="Weather plans" value={data.categoryCounts.weather} note="Crop protection" icon={<CloudRain />} />
      <StatCard label="Market reads" value={data.categoryCounts.market} note="Selling decisions" icon={<TrendingUp />} />
      <section className="card col-span-12 p-6 lg:col-span-7"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Your farm profile</p><h2 className="mt-2 text-xl font-semibold">{data.farm?.location || 'A profile makes every read sharper.'}</h2></div><Tractor className="text-[hsl(var(--primary))]" size={22} /></div>{data.farm ? <div className="mt-7 grid grid-cols-2 gap-5 border-t border-[hsl(var(--border))] pt-5 sm:grid-cols-3"><Info label="Primary crops" value={data.farm.primaryCrops.join(', ')} /><Info label="Farm size" value={data.farm.farmSizeHectares ? `${data.farm.farmSizeHectares} hectares` : 'Not recorded'} /><Info label="Added" value={formatDate(data.farm.createdAt)} /></div> : <div className="mt-6 rounded-xl bg-[hsl(var(--secondary))] p-5"><p className="text-sm leading-6 text-muted-foreground">Add your location and crops so every recommendation has the context of your land.</p><Link href="/farm-profile" data-testid="link-dashboard-create-profile" className="btn-quiet mt-4">Create farm profile <ArrowRight size={15} /></Link></div>}</section>
      <section className="card col-span-12 p-6 lg:col-span-5"><p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Start here</p><h2 className="mt-2 text-xl font-semibold">What needs your attention?</h2><div className="mt-5 space-y-2"><QuickAction href="/disease-detection" icon={<ScanLine />} title="Check a leaf" sub="Upload a crop photo" /><QuickAction href="/weather-alerts" icon={<CloudRain />} title="Plan for weather" sub="Build a protection plan" /><QuickAction href="/market-insights" icon={<Store />} title="Read the market" sub="Think through selling" /></div></section>
      <section className="card col-span-12 p-6"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Recent activity</p><h2 className="mt-2 text-xl font-semibold">Your latest field notes</h2></div><Link href="/history" data-testid="link-dashboard-history" className="text-sm font-semibold text-[hsl(var(--primary))]">View all <ArrowRight className="ml-1 inline" size={14} /></Link></div>{data.recentAdvisories.length ? <div className="mt-5 divide-y divide-[hsl(var(--border))]">{data.recentAdvisories.map((item) => <AdvisoryRow item={item} key={item.id} />)}</div> : <EmptyState title="No advisories yet" text="Your first advisory will appear here once you make a field decision." href="/disease-detection" action="Start with a leaf photo" />}</section>
    </div>
  </div>;
}

function DashboardSkeleton() {
  return <div className="space-y-6"><Skeleton className="h-10 w-72" /><div className="grid gap-5 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32" />)}</div><Skeleton className="h-80" /></div>;
}
function StatCard({ label, value, note, icon }: { label: string; value: number; note: string; icon: ReactNode }) {
  return <div className="card col-span-12 p-5 sm:col-span-6 md:col-span-3"><div className="flex items-start justify-between"><p className="text-sm text-muted-foreground">{label}</p><span className="text-[hsl(var(--primary))]">{icon}</span></div><p className="mono mt-5 text-3xl font-medium">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
function QuickAction({ href, icon, title, sub }: { href: string; icon: ReactNode; title: string; sub: string }) {
  return <Link href={href} data-testid={`link-quick-${title.toLowerCase().replaceAll(' ', '-')}`} className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">{icon}</span><span className="flex-1"><b className="block text-sm">{title}</b><small className="text-xs text-muted-foreground">{sub}</small></span><ArrowRight size={15} className="text-muted-foreground" /></Link>;
}
function EmptyState({ title, text, href, action }: { title: string; text: string; href?: string; action?: string }) {
  return <div className="py-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Sprout size={22} /></div><h3 className="mt-4 font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>{href && action && <Link href={href} data-testid="link-empty-action" className="btn-quiet mt-5">{action} <ArrowRight size={15} /></Link>}</div>;
}
function AdvisoryRow({ item }: { item: Advisory }) {
  const meta = categoryMeta[item.category]; const Icon = meta.icon;
  return <div className="flex items-center gap-3 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}><Icon size={18} /></div><div className="min-w-0 flex-1"><p className="font-semibold">{item.cropType}</p><p className="text-xs text-muted-foreground">{meta.label} advisory · {formatDate(item.createdAt)}</p></div><span className="hidden text-sm text-muted-foreground sm:block">{readableResponse(item.aiResponse)}</span><ArrowRight size={15} className="text-muted-foreground" /></div>;
}

type AdvisoryFormProps = { onResult: (item: Advisory) => void };
function DiseasePage() {
  const [result, setResult] = useState<Advisory | null>(null);
  return <AdvisoryWorkspace eyebrow="Disease detection" title="Look closer at the leaf." intro="A photo can help you spot a pattern early. Add one clear image and a little field context." accent="red" result={result}><DiseaseForm onResult={setResult} /></AdvisoryWorkspace>;
}
function DiseaseForm({ onResult }: AdvisoryFormProps) {
  const [cropType, setCropType] = useState(''); const [onset, setOnset] = useState(''); const [file, setFile] = useState<File | null>(null); const [imagePath, setImagePath] = useState(''); const [error, setError] = useState('');
  const mutation = useCreateDiseaseAdvisory(); const upload = useRequestUploadUrl();
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] || null;
    setFile(picked);
    setImagePath('');
    if (!picked) return;
    upload.mutate(
      { data: { name: picked.name, size: picked.size, contentType: picked.type || 'application/octet-stream' } },
      {
        onSuccess: async (result) => {
          try {
            const response = await fetch(result.uploadURL, { method: 'PUT', headers: { 'Content-Type': picked.type }, body: picked });
            if (!response.ok) throw new Error('Upload failed');
            setImagePath(result.objectPath);
          } catch {
            setError('The photo could not be saved. You can still try again.');
          }
        },
        onError: () => setError('The photo could not be prepared for analysis.'),
      },
    );
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!cropType || !onset || !file) { setError('Add a crop, when symptoms began, and a leaf photo.'); return; } setError(''); mutation.mutate({ data: { cropType, symptomsOnset: Number(onset), image: file, ...(imagePath ? { imagePath } : {}) } }, { onSuccess: onResult, onError: () => setError('The image could not be analyzed. Please try again.') }); };
  return <FormCard title="New leaf advisory" description="Use a well-lit photo of the affected leaf. Avoid blurry or distant images."><form onSubmit={submit} className="space-y-5"><Field label="Crop type" hint="For example, tomato or maize"><input data-testid="input-disease-crop" className="field" value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="What crop is this?" /></Field><Field label="Symptoms began" hint="Number of days since you first noticed"><div className="relative"><input data-testid="input-disease-onset" className="field pr-20" type="number" min="0" value={onset} onChange={(e) => setOnset(e.target.value)} placeholder="0" /><span className="absolute right-3 top-3 text-sm text-muted-foreground">days ago</span></div></Field><div><label className="mb-2 block text-sm font-semibold">Leaf photo</label><label data-testid="input-disease-image" className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)_/_.5)] px-5 text-center transition hover:border-[hsl(var(--primary))]"><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} /><span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--card))] text-[hsl(var(--primary))]">{file ? <Check size={20} /> : <ImagePlus size={20} />}</span><b className="text-sm">{file ? file.name : 'Choose a leaf photo'}</b><span className="mt-1 text-xs text-muted-foreground">{upload.isPending ? 'Saving the photo securely…' : file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ready to analyze` : 'JPG, PNG, or WebP · one image'}</span></label></div>{error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}<button data-testid="button-submit-disease" className="btn-primary w-full" disabled={mutation.isPending || upload.isPending}>{mutation.isPending ? <><LoaderCircle className="animate-spin" size={16} /> Reading the leaf</> : upload.isPending ? <><LoaderCircle className="animate-spin" size={16} /> Saving the photo</> : <><ScanLine size={16} /> Analyze leaf</>}</button></form></FormCard>;
}

function WeatherPage() {
  const [result, setResult] = useState<Advisory | null>(null);
  return <AdvisoryWorkspace eyebrow="Weather alerts" title="Make room for the weather." intro="Describe the event on the horizon and get a crop-specific plan for the growth stage you are in." accent="blue" result={result}><WeatherForm onResult={setResult} /></AdvisoryWorkspace>;
}
function WeatherForm({ onResult }: AdvisoryFormProps) {
  const [cropType, setCropType] = useState(''); const [growthStage, setGrowthStage] = useState('vegetative'); const [weatherEvent, setWeatherEvent] = useState(''); const [error, setError] = useState('');
  const mutation = useCreateWeatherAdvisory();
  const submit = (event: FormEvent) => { event.preventDefault(); if (!cropType || weatherEvent.length < 5) { setError('Add a crop and describe the weather event in a few words.'); return; } setError(''); mutation.mutate({ data: { cropType, growthStage: growthStage as 'seedling' | 'vegetative' | 'flowering' | 'maturity', weatherEvent } }, { onSuccess: onResult, onError: () => setError('The weather plan could not be created. Please try again.') }); };
  return <FormCard title="Weather event" description="The more specific the event, the more useful the plan."><form onSubmit={submit} className="space-y-5"><Field label="Crop type"><input data-testid="input-weather-crop" className="field" value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="What crop needs protection?" /></Field><Field label="Growth stage"><select data-testid="select-weather-stage" className="field" value={growthStage} onChange={(e) => setGrowthStage(e.target.value)}><option value="seedling">Seedling</option><option value="vegetative">Vegetative</option><option value="flowering">Flowering</option><option value="maturity">Maturity</option></select></Field><Field label="Weather event" hint="For example, heavy rain expected tomorrow"><textarea data-testid="input-weather-event" className="field min-h-28 resize-y" value={weatherEvent} onChange={(e) => setWeatherEvent(e.target.value)} placeholder="Tell us what is coming..." /></Field>{error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}<button data-testid="button-submit-weather" className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="animate-spin" size={16} /> Building protection plan</> : <><CloudRain size={16} /> Create weather plan</>}</button></form></FormCard>;
}

function MarketPage() {
  const [result, setResult] = useState<Advisory | null>(null);
  return <AdvisoryWorkspace eyebrow="Market insights" title="Know your options before harvest." intro="Put today's numbers on the table and think through timing, price, and storage with a little more context." accent="gold" result={result}><MarketForm onResult={setResult} /></AdvisoryWorkspace>;
}
function MarketForm({ onResult }: AdvisoryFormProps) {
  const [cropType, setCropType] = useState(''); const [yieldKg, setYieldKg] = useState(''); const [price, setPrice] = useState(''); const [storage, setStorage] = useState(false); const [error, setError] = useState('');
  const mutation = useCreateMarketAdvisory();
  const submit = (event: FormEvent) => { event.preventDefault(); if (!cropType || Number(yieldKg) <= 0 || Number(price) <= 0) { setError('Add the crop, estimated yield, and a current price.'); return; } setError(''); mutation.mutate({ data: { cropType, estimatedYieldKg: Number(yieldKg), currentLocalPricePerKg: Number(price), storageAvailability: storage } }, { onSuccess: onResult, onError: () => setError('The market read could not be created. Please try again.') }); };
  return <FormCard title="Selling strategy" description="Use your best current estimates. You can run this again as conditions change."><form onSubmit={submit} className="space-y-5"><Field label="Crop type"><input data-testid="input-market-crop" className="field" value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="What are you planning to sell?" /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Estimated yield"><div className="relative"><input data-testid="input-market-yield" className="field pr-12" type="number" min="1" value={yieldKg} onChange={(e) => setYieldKg(e.target.value)} placeholder="0" /><span className="absolute right-3 top-3 text-sm text-muted-foreground">kg</span></div></Field><Field label="Local price today"><div className="relative"><input data-testid="input-market-price" className="field pl-8" type="number" min="0" step=".01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /><span className="absolute left-3 top-3 text-sm text-muted-foreground">$</span><span className="absolute right-3 top-3 text-sm text-muted-foreground">/ kg</span></div></Field></div><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-4"><input data-testid="input-market-storage" type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={storage} onChange={(e) => setStorage(e.target.checked)} /><span><b className="block text-sm">I have storage available</b><small className="text-xs text-muted-foreground">Include holding the crop as an option in the read.</small></span></label>{error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}<button data-testid="button-submit-market" className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="animate-spin" size={16} /> Reading the market</> : <><TrendingUp size={16} /> Create selling strategy</>}</button></form></FormCard>;
}

function AdvisoryWorkspace({ eyebrow, title, intro, accent, result, children }: { eyebrow: string; title: string; intro: string; accent: string; result: Advisory | null; children: ReactNode }) {
  return <div className="rise"><div className="mb-8 max-w-2xl"><p className={`mono text-xs uppercase tracking-[.2em] ${accent === 'red' ? 'text-[hsl(3_59%_47%)]' : accent === 'blue' ? 'text-[hsl(205_58%_43%)]' : 'text-[hsl(35_76%_47%)]'}`}>{eyebrow}</p><h1 className="serif mt-2 text-4xl tracking-[-.04em]">{title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{intro}</p></div><div className="grid gap-6 lg:grid-cols-[minmax(0,540px)_1fr]"><div>{children}</div>{result ? <ResultCard item={result} /> : <div className="card hidden min-h-[420px] items-center justify-center border-dashed p-8 text-center lg:flex"><div><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileText size={24} /></div><h2 className="serif mt-5 text-2xl">Your advisory will land here</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Complete the form and your practical next steps will be ready to review.</p></div></div>}</div></div>;
}
function FormCard({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <section className="card p-6 md:p-7"><div className="mb-6 border-b border-[hsl(var(--border))] pb-5"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{children}</section>; }
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <div><label className="mb-2 block text-sm font-semibold">{label}</label>{children}{hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}</div>; }
function ResultCard({ item }: { item: Advisory }) {
  const meta = categoryMeta[item.category]; const Icon = meta.icon;
  return <section className="card rise-2 overflow-hidden"><div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)_/_.55)] p-6"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em]" style={{ color: meta.color }}><Icon size={16} /> Advisory ready</span><span className="mono text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</span></div><h2 className="serif mt-6 text-3xl tracking-[-.03em]">{item.cropType}</h2></div><div className="p-6"><p className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">What to do next</p><p className="mt-3 text-[15px] leading-7">{readableResponse(item.aiResponse)}</p><div className="mt-7 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4"><p className="text-xs font-semibold text-[hsl(var(--primary))]">Saved to your advisory history</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Use this read alongside your own field observations and local knowledge.</p></div><Link href="/history" data-testid="link-result-history" className="btn-outline mt-6 w-full">Review advisory history <ArrowRight size={15} /></Link></div></section>;
}

function HistoryPage() {
  const [category, setCategory] = useState<'all' | AdvisoryCategory>('all'); const [page, setPage] = useState(1);
  const params = useMemo(() => ({ page, pageSize: 8, ...(category === 'all' ? {} : { category }) }), [page, category]);
  const { data, isLoading, isError, refetch } = useListAdvisories(params, { query: { queryKey: getListAdvisoriesQueryKey(params) } });
  const changeCategory = (value: 'all' | AdvisoryCategory) => { setCategory(value); setPage(1); };
  return <div className="rise"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mono text-xs uppercase tracking-[.2em] text-[hsl(var(--primary))]">History</p><h1 className="serif mt-2 text-4xl tracking-[-.04em]">Your field record.</h1><p className="mt-2 text-sm text-muted-foreground">Every advisory, kept in one place for the decisions ahead.</p></div><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><input data-testid="input-history-search" className="field pl-9 sm:w-56" placeholder="Search by crop" /></div></div><div className="mb-5 flex flex-wrap gap-2">{(['all', 'disease', 'weather', 'market'] as const).map((item) => <button key={item} data-testid={`button-filter-${item}`} onClick={() => changeCategory(item)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${category === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-muted-foreground'}`}>{item === 'all' ? 'All advisories' : categoryMeta[item].label}</button>)}</div>{isLoading ? <div className="card divide-y divide-[hsl(var(--border))] p-6">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="my-2 h-14" />)}</div> : isError || !data ? <ErrorState onRetry={() => refetch()} /> : data.items.length ? <><div className="card divide-y divide-[hsl(var(--border))] p-5">{data.items.map((item) => <AdvisoryRow item={item} key={item.id} />)}</div><div className="mt-5 flex items-center justify-between text-sm text-muted-foreground"><span>Page {data.page} of {data.totalPages} · {data.total} total</span><div className="flex gap-2"><button data-testid="button-history-prev" className="btn-outline p-2" disabled={data.page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><button data-testid="button-history-next" className="btn-outline p-2" disabled={data.page >= data.totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div></> : <div className="card"><EmptyState title="Your record is still blank" text="When you create a disease, weather, or market advisory, it will stay here for reference." href="/dashboard" action="Back to overview" /></div>}</div>;
}

function FarmProfilePage() {
  const { data: farm, isLoading, isError, refetch } = useGetFarm({ query: { queryKey: getGetFarmQueryKey() } });
  if (isLoading) return <div className="space-y-5"><Skeleton className="h-10 w-80" /><Skeleton className="h-96 max-w-2xl" /></div>;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  return <FarmProfileForm farm={farm} />;
}
function FarmProfileForm({ farm }: { farm: FarmProfile | null | undefined }) {
  const [location, setLocation] = useState(farm?.location || ''); const [crops, setCrops] = useState(farm?.primaryCrops.join(', ') || ''); const [size, setSize] = useState(farm?.farmSizeHectares?.toString() || ''); const [saved, setSaved] = useState(false); const [error, setError] = useState('');
  const mutation = useUpsertFarm(); const queryClient = useQueryClient();
  const submit = (event: FormEvent) => { event.preventDefault(); const primaryCrops = crops.split(',').map((crop) => crop.trim()).filter(Boolean); if (location.length < 2 || primaryCrops.length === 0) { setError('Add your location and at least one primary crop.'); return; } setError(''); setSaved(false); mutation.mutate({ data: { location, primaryCrops, farmSizeHectares: size ? Number(size) : null } }, { onSuccess: () => { setSaved(true); queryClient.invalidateQueries({ queryKey: getGetFarmQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); }, onError: () => setError('Your farm profile could not be saved. Please try again.') }); };
  return <div className="rise"><div className="mb-8"><p className="mono text-xs uppercase tracking-[.2em] text-[hsl(var(--primary))]">Farm profile</p><h1 className="serif mt-2 text-4xl tracking-[-.04em]">Start with your ground truth.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A few details help AgriAssist make every crop, weather, and market read more relevant to your farm.</p></div><div className="card max-w-2xl p-6 md:p-8"><div className="mb-6 flex items-center gap-3 border-b border-[hsl(var(--border))] pb-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><MapPin size={20} /></div><div><h2 className="font-semibold">{farm ? 'Update your farm profile' : 'Create your farm profile'}</h2><p className="text-sm text-muted-foreground">You can change these details at any time.</p></div></div><form onSubmit={submit} className="space-y-5"><Field label="Farm location" hint="Town, district, or region is enough"><input data-testid="input-farm-location" className="field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where is your farm?" /></Field><Field label="Primary crops" hint="Separate multiple crops with commas"><input data-testid="input-farm-crops" className="field" value={crops} onChange={(e) => setCrops(e.target.value)} placeholder="For example, maize, tomato" /></Field><Field label="Farm size" hint="Optional"><div className="relative"><input data-testid="input-farm-size" className="field pr-24" type="number" min="0" step=".1" value={size} onChange={(e) => setSize(e.target.value)} placeholder="0" /><span className="absolute right-3 top-3 text-sm text-muted-foreground">hectares</span></div></Field>{error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}{saved && <p className="flex items-center gap-2 text-sm text-[hsl(var(--primary))]"><Check size={15} /> Farm profile saved.</p>}<button data-testid="button-save-farm" className="btn-primary w-full sm:w-auto" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="animate-spin" size={16} /> Saving profile</> : <><Check size={16} /> Save farm profile</>}</button></form></div></div>;
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [, setLocation] = useLocation(); const [email, setEmail] = useState(''); const [name, setName] = useState('');
  const clerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  if (clerkConfigured) {
    return <div className="grain flex min-h-[100dvh] bg-[hsl(91_26%_91%)]"><div className="hidden w-[43%] flex-col justify-between bg-[hsl(var(--primary))] p-10 text-[hsl(var(--primary-foreground))] lg:flex"><Logo dark /><div><p className="mono text-xs uppercase tracking-[.2em] text-[hsl(var(--accent))]">AgriAssist Crop Advisory</p><h1 className="serif mt-5 max-w-md text-6xl leading-[.94] tracking-[-.05em]">A steadier hand for the growing season.</h1><p className="mt-7 max-w-sm text-sm leading-6 text-[hsl(var(--primary-foreground)_/.7)]">Practical crop intelligence for the decisions that cannot wait.</p></div><p className="text-xs text-[hsl(var(--primary-foreground)_/.55)]">Your farm. Your context. Your next good move.</p></div><div className="flex flex-1 items-center justify-center p-5 sm:p-10"><div className="w-full max-w-[420px]"><div className="mb-10 lg:hidden"><Logo /></div>{mode === 'sign-in' ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /> : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />}</div></div></div>;
  }
  return <div className="grain flex min-h-[100dvh] bg-[hsl(91_26%_91%)]"><div className="hidden w-[43%] flex-col justify-between bg-[hsl(var(--primary))] p-10 text-[hsl(var(--primary-foreground))] lg:flex"><Logo dark /><div><p className="mono text-xs uppercase tracking-[.2em] text-[hsl(var(--accent))]">AgriAssist Crop Advisory</p><h1 className="serif mt-5 max-w-md text-6xl leading-[.94] tracking-[-.05em]">A steadier hand for the growing season.</h1><p className="mt-7 max-w-sm text-sm leading-6 text-[hsl(var(--primary-foreground)_/.7)]">Practical crop intelligence for the decisions that cannot wait.</p></div><p className="text-xs text-[hsl(var(--primary-foreground)_/.55)]">Your farm. Your context. Your next good move.</p></div><div className="flex flex-1 items-center justify-center p-5 sm:p-10"><div className="w-full max-w-[420px]"><div className="mb-10 lg:hidden"><Logo /></div><p className="mono text-xs uppercase tracking-[.2em] text-[hsl(var(--primary))]">{mode === 'sign-in' ? 'Welcome back' : 'New workspace'}</p><h2 className="serif mt-3 text-4xl tracking-[-.04em]">{mode === 'sign-in' ? 'Pick up where you left off.' : 'Make the next decision clearer.'}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === 'sign-in' ? 'Sign in to review your farm and advisory history.' : 'Create an AgriAssist account for your farm advisory workspace.'}</p><form className="mt-8 space-y-4" onSubmit={(event) => { event.preventDefault(); setLocation('/dashboard'); }}><div>{mode === 'sign-up' && <><label className="mb-2 block text-sm font-semibold">Full name</label><input data-testid="input-auth-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></>}</div><div><label className="mb-2 block text-sm font-semibold">Email address</label><input data-testid="input-auth-email" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div><button data-testid="button-auth-submit" className="btn-primary w-full">{mode === 'sign-in' ? 'Continue to AgriAssist' : 'Create account'} <ArrowRight size={16} /></button></form><p className="mt-6 text-center text-sm text-muted-foreground">{mode === 'sign-in' ? 'New to AgriAssist? ' : 'Already have an account? '}<Link href={mode === 'sign-in' ? '/sign-up' : '/sign-in'} data-testid="link-auth-switch" className="font-semibold text-[hsl(var(--primary))]">{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</Link></p></div></div></div>;
}

function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-[hsl(var(--background))]" />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <PortalShell>{children}</PortalShell>;
}

function AppRouter() {
  return <ErrorBoundary><Switch><Route path="/" component={Landing} /><Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} /><Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} /><Route path="/dashboard"><Protected><Dashboard /></Protected></Route><Route path="/disease-detection"><Protected><DiseasePage /></Protected></Route><Route path="/weather-alerts"><Protected><WeatherPage /></Protected></Route><Route path="/market-insights"><Protected><MarketPage /></Protected></Route><Route path="/history"><Protected><HistoryPage /></Protected></Route><Route path="/farm-profile"><Protected><FarmProfilePage /></Protected></Route><Route component={NotFound} /></Switch></ErrorBoundary>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><AppRouter /></QueryClientProvider>;
}