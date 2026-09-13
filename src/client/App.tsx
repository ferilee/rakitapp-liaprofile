import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  CloudSun,
  ExternalLink,
  Facebook,
  FlaskConical,
  FolderOpen,
  Instagram,
  Laptop,
  Lightbulb,
  Mail,
  Menu,
  Moon,
  NotebookPen,
  PlayCircle,
  Quote,
  Share2,
  Sparkles,
  Sun,
  Target,
  Trash2,
  UserRound,
  Video,
  X,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSite, adminRequest, type Fact, type Resource, type SiteData, type Work } from "./api";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

const resourceIcons: Record<string, LucideIcon> = { "book-open": BookOpen, "notebook-pen": NotebookPen, "play-circle": PlayCircle, "flask-conical": FlaskConical, target: Target, sparkles: Sparkles };
const socialIcons: Record<string, LucideIcon> = { instagram: Instagram, youtube: Youtube, facebook: Facebook, drive: FolderOpen };

function App() {
  const [isAdmin] = useState(() => window.location.pathname === "/admin");
  return isAdmin ? <Admin /> : <PublicSite />;
}

function PublicSite() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("lia-theme") === "dark");
  const [answerVisible, setAnswerVisible] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("theme-light", !dark);
    document.body.classList.toggle("theme-dark", dark);
    localStorage.setItem("lia-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => { getSite().then(setSite).catch((reason) => setError(reason.message)); }, []);
  if (error) return <div className="bio-error"><CircleHelp size={36} /><p>{error}</p></div>;
  if (!site) return <LoadingState />;

  const { profile, resources, works, socials, fact } = site;
  const featured = resources.filter((resource) => resource.isFeatured);
  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return <div className="bio-shell">
    <div className="bio-decoration bio-decoration-left">✿</div>
    <div className="bio-decoration bio-decoration-right">✧</div>
    <header className="bio-topbar"><a href="/" className="bio-brand"><span className="bio-brand-mark"><Sparkles size={16} /></span><span>Lia Physics Hub</span></a><div className="bio-top-actions"><button className="bio-icon-button" onClick={() => setDark((value) => !value)} aria-label="Ganti tema">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><a href="/admin" className="bio-admin-link">Admin</a></div></header>
    <main className="bio-main">
      <section className="bio-profile"><div className="bio-avatar-wrap"><span className="bio-spark bio-spark-one">✦</span><span className="bio-spark bio-spark-two">✧</span><img className="bio-avatar" src={profile.avatarUrl} alt={profile.name} /></div><p className="bio-role">{profile.role} · {profile.school}</p><h1>{profile.name}</h1><p className="bio-tagline">{profile.tagline}</p><div className="bio-actions"><a className="bio-primary-button" href={`https://wa.me/${profile.whatsapp}`}><Share2 size={16} /> Hubungi saya</a><a className="bio-secondary-button" href={`mailto:${profile.email}`}><Mail size={16} /> Email</a></div><div className="bio-socials">{socials.map((social) => { const Icon = socialIcons[social.platform] ?? ExternalLink; return <a key={social.id} href={social.url} target="_blank" rel="noreferrer" aria-label={social.label}><Icon size={17} /></a>; })}</div></section>
      <section id="ruang-belajar" className="bio-section"><div className="bio-section-heading"><span className="bio-section-number">01</span><div><p>Ruang belajar</p><span>Pilih cara belajar yang paling cocok untukmu.</span></div></div><div className="bio-link-list">{featured.map((resource) => <BioLinkCard key={resource.id} resource={resource} />)}</div></section>
      {fact && <section className="bio-fact"><div className="bio-fact-icon">⚡</div><div className="bio-fact-copy"><p>Fisika hari ini</p><h2>{fact.question}</h2>{answerVisible && <span>{fact.answer}</span>}<button onClick={() => setAnswerVisible((value) => !value)}>{answerVisible ? "Tutup jawaban" : "Cari tahu →"}</button></div></section>}
      <section id="karya" className="bio-section"><div className="bio-section-heading"><span className="bio-section-number">02</span><div><p>Karya & inovasi</p><span>Catatan kecil dari ruang kelas.</span></div></div><div className="bio-work-list">{works.map((work) => <BioWorkItem key={work.id} work={work} />)}</div></section>
      <section className="bio-about"><div className="bio-about-quote">“</div><p>{profile.bio}</p><button onClick={() => jumpTo("karya")}>Lihat perjalanan belajar <ArrowUpRight size={15} /></button></section>
    </main>
    <footer className="bio-footer"><span>Belajar · Bertanya · Menemukan</span><span>© {new Date().getFullYear()} {profile.name}</span></footer>
  </div>;
}

function BioLinkCard({ resource }: { resource: Resource }) {
  const Icon = resourceIcons[resource.icon] ?? BookOpen;
  return <a href={resource.url} target="_blank" rel="noreferrer" className="bio-link-card"><span className="bio-link-icon"><Icon size={19} /></span><span className="bio-link-copy"><strong>{resource.title}</strong><small>{resource.description}</small></span><ChevronRight size={18} className="bio-link-arrow" /></a>;
}

function BioWorkItem({ work }: { work: Work }) {
  return <a href={work.url} target="_blank" rel="noreferrer" className="bio-work-item"><img src={work.imageUrl} alt="" /><span><strong>{work.title}</strong><small>{work.description}</small></span><ExternalLink size={15} /></a>;
}

function LegacyPublicSite() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("lia-theme") !== "light");
  const [fact, setFact] = useState<Fact | null>(null);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("theme-light", !dark);
    localStorage.setItem("lia-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    getSite().then((data) => { setSite(data); setFact(data.fact); }).catch((reason) => setError(reason.message));
  }, []);

  if (error) return <div className="grid min-h-screen place-items-center bg-[#07131d] p-6 text-center text-white"><div><CircleHelp className="mx-auto mb-4 text-cyan-300" size={38} /><p>{error}</p></div></div>;
  if (!site) return <LoadingState />;
  const { profile, resources, works, socials } = site;
  const featured = resources.filter((resource) => resource.isFeatured);

  const jumpTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); };
  const newFact = () => { setAnswerVisible(false); setFact(resources.length ? null : site.fact); getSite().then((fresh) => setFact(fresh.fact)); };

  return <div className="site-shell min-h-screen overflow-hidden bg-[#07131d] text-slate-100">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="relative z-30 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <button className="flex items-center gap-3" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20"><Sparkles size={19} /></span>
        <span className="text-left"><span className="block font-display text-sm font-bold text-white">Lia Physics Hub</span><span className="block text-[10px] uppercase tracking-[0.25em] text-cyan-200/60">Ruang belajar</span></span>
      </button>
      <nav className={`mobile-nav ${menuOpen ? "flex" : "hidden"} absolute left-5 right-5 top-20 flex-col gap-2 rounded-2xl border border-white/10 bg-[#0b1c29]/95 p-3 shadow-2xl backdrop-blur-xl sm:static sm:flex sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}>
        <button onClick={() => jumpTo("tentang")} className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">Tentang</button>
        <button onClick={() => jumpTo("ruang-belajar")} className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">Ruang Belajar</button>
        <button onClick={() => jumpTo("karya")} className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">Karya</button>
        <Button variant="secondary" size="sm" onClick={() => window.location.href = `mailto:${profile.email}`}><Mail size={15} /> Hubungi</Button>
      </nav>
      <div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={() => setDark((value) => !value)} aria-label="Ganti tema">{dark ? <Sun size={18} /> : <Moon size={18} />}</Button><Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Buka menu">{menuOpen ? <X size={20} /> : <Menu size={20} />}</Button></div>
    </header>

    <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section className="grid items-center gap-12 pb-24 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:pb-32 lg:pt-24">
        <div><Badge><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" /> Profil digital guru Fisika</Badge><h1 className="mt-7 max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-white sm:text-7xl">Belajar memahami <span className="text-cyan-300">alam</span>, satu pertanyaan setiap hari.</h1><p className="mt-7 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">{profile.tagline}</p><div className="mt-9 flex flex-wrap gap-3"><Button size="lg" onClick={() => jumpTo("ruang-belajar")}><Lightbulb size={18} /> Mulai belajar <ArrowUpRight size={17} /></Button><Button size="lg" variant="secondary" onClick={() => window.location.href = `https://wa.me/${profile.whatsapp}`}><Share2 size={17} /> Hubungi saya</Button></div><div className="mt-10 flex items-center gap-3 text-sm text-slate-500"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5"><CloudSun size={16} className="text-cyan-200" /></span><span>Rasa ingin tahu adalah awal dari setiap penemuan.</span></div></div>
        <div className="relative mx-auto w-full max-w-md lg:ml-auto"><div className="absolute -inset-5 rounded-[3rem] border border-cyan-300/10" /><div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-300/10 blur-3xl" /><Card className="profile-card relative overflow-hidden border-cyan-300/15 bg-[#0d2330]/90 p-3"><div className="relative overflow-hidden rounded-[1.4rem]"><img src={profile.avatarUrl} alt={profile.name} className="h-[430px] w-full object-cover object-center grayscale-[15%]" /><div className="absolute inset-0 bg-gradient-to-t from-[#07131d] via-transparent to-transparent" /><div className="absolute bottom-6 left-6 right-6"><div className="mb-3 flex items-center gap-2 text-xs font-medium text-cyan-200"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Sedang berbagi ilmu</div><p className="font-display text-2xl font-semibold text-white">{profile.name}</p><p className="mt-1 text-sm text-slate-300">{profile.role} · {profile.school}</p></div></div></Card><div className="absolute -bottom-5 -left-7 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#102938]/95 px-4 py-3 shadow-xl sm:flex"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-300/15 text-amber-200"><FlaskConical size={18} /></span><span><span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Eksplorasi hari ini</span><span className="block text-sm font-semibold text-white">Fisika di sekitar kita</span></span></div></div>
      </section>

      <section id="tentang" className="grid gap-8 border-t border-white/10 py-20 lg:grid-cols-[.7fr_1.3fr] lg:py-28"><div><p className="eyebrow">01 / Tentang saya</p><h2 className="section-title">Mengajar dengan rasa ingin tahu.</h2></div><div className="max-w-2xl lg:pt-8"><Quote className="mb-5 text-cyan-300/60" size={30} /><p className="text-xl leading-9 text-slate-200 sm:text-2xl">“Fisika tidak berhenti di buku. Ia hadir di setiap gerak, cahaya, bunyi, dan energi yang kita temui.”</p><p className="mt-7 text-base leading-8 text-slate-400">{profile.bio}</p><div className="mt-8 flex flex-wrap gap-3"><span className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400">{profile.role}</span><span className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400">{profile.school}</span><span className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400">Pembelajaran aktif</span></div></div></section>

      <section id="ruang-belajar" className="scroll-mt-8 py-20 lg:py-24"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">02 / Ruang belajar</p><h2 className="section-title">Temukan cara belajarmu.</h2></div><p className="max-w-sm text-sm leading-7 text-slate-500">Kumpulan sumber belajar yang dirancang untuk membantu konsep Fisika terasa lebih dekat dan masuk akal.</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{featured.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div></section>

      <section className="physics-fact my-12 overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/10 via-[#0d2633] to-[#0b1925] p-6 sm:p-10"><div className="grid items-center gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><Badge className="border-amber-300/20 bg-amber-300/10 text-amber-200">⚡ Fisika hari ini</Badge><h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Pertanyaan kecil, penemuan besar.</h2><p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">Berhenti sebentar. Amati dunia di sekitarmu. Lalu tanyakan mengapa.</p></div>{fact && <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/70">Pikirkan ini</p><h3 className="mt-4 font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">{fact.question}</h3>{answerVisible ? <p className="mt-5 text-sm leading-7 text-slate-300">{fact.answer}</p> : <p className="mt-5 text-sm text-slate-500">Temukan jawabannya dan lihat Fisika bekerja di sekitar kita.</p>}<div className="mt-7 flex flex-wrap gap-3"><Button variant="default" onClick={() => setAnswerVisible((value) => !value)}>{answerVisible ? "Sembunyikan" : "Cari tahu"} <ChevronRight size={16} /></Button><Button variant="ghost" onClick={newFact}>Pertanyaan lain <Sparkles size={15} /></Button></div></div>}</div></section>

      <section id="karya" className="scroll-mt-8 py-20 lg:py-24"><div className="mb-10 flex items-end justify-between gap-5"><div><p className="eyebrow">03 / Karya & inovasi</p><h2 className="section-title">Ide yang menjadi pengalaman.</h2></div><span className="hidden text-sm text-slate-500 sm:block">Praktik baik · Media · Proyek siswa</span></div><div className="grid gap-5 lg:grid-cols-3">{works.map((work) => <WorkCard key={work.id} work={work} />)}</div></section>

      <section className="grid gap-6 border-t border-white/10 py-20 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="eyebrow">04 / Terhubung</p><h2 className="section-title">Mari terus belajar.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-slate-500">Ikuti kanal yang aktif untuk mendapatkan materi, cerita dari kelas, dan eksperimen kecil yang bisa dicoba di rumah.</p></div><div className="flex flex-wrap gap-3 lg:justify-end">{socials.map((social) => { const Icon = socialIcons[social.platform] ?? ExternalLink; return <a key={social.id} href={social.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"><Icon size={16} /> {social.label}</a>; })}</div></section>
    </main>
    <footer className="relative z-10 border-t border-white/10 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 text-xs text-slate-600 sm:flex-row"><span>© {new Date().getFullYear()} {profile.name}</span><a href="/admin" className="transition hover:text-cyan-300">Dikelola dengan RakitApp · Admin</a></div></footer>
  </div>;
}

function ResourceCard({ resource }: { resource: Resource }) {
  const Icon = resourceIcons[resource.icon] ?? BookOpen;
  return <a href={resource.url} target="_blank" rel="noreferrer" className="group"><Card className="h-full transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.07]"><CardHeader><div className="mb-5 flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200 transition group-hover:bg-cyan-300 group-hover:text-slate-950"><Icon size={22} /></span><ArrowUpRight size={18} className="text-slate-600 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-cyan-200" /></div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/60">{resource.category}</p><CardTitle>{resource.title}</CardTitle></CardHeader><CardContent><CardDescription>{resource.description}</CardDescription></CardContent></Card></a>;
}

function WorkCard({ work }: { work: Work }) {
  return <a href={work.url} target="_blank" rel="noreferrer" className="work-card group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045]"><div className="relative h-56 overflow-hidden"><img src={work.imageUrl} alt="" className="h-full w-full object-cover grayscale-[20%] transition duration-500 group-hover:scale-105 group-hover:grayscale-0" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" /><span className="absolute bottom-4 left-5 grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white backdrop-blur"><ExternalLink size={15} /></span></div><div className="p-5"><h3 className="font-display text-lg font-semibold text-white">{work.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{work.description}</p></div></a>;
}

function LoadingState() { return <div className="min-h-screen bg-[#07131d] p-6"><div className="mx-auto max-w-6xl animate-pulse space-y-10 pt-20"><div className="h-5 w-44 rounded-full bg-white/10" /><div className="h-32 max-w-2xl rounded-3xl bg-white/10" /><div className="grid gap-4 md:grid-cols-3"><div className="h-64 rounded-3xl bg-white/10" /><div className="h-64 rounded-3xl bg-white/10" /><div className="h-64 rounded-3xl bg-white/10" /></div></div></div>; }

function Admin() {
  const [data, setData] = useState<{ profile: SiteData["profile"]; resources: Resource[]; works: Work[]; facts: Fact[] } | null>(null);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("lia-admin-token") ?? "");
  const [tokenInput, setTokenInput] = useState("");
  const [loadError, setLoadError] = useState("");
  const [resourceForm, setResourceForm] = useState({ title: "", description: "", category: "Belajar", url: "", icon: "book-open" });
  const [workForm, setWorkForm] = useState({ title: "", description: "", url: "", imageUrl: "" });

  const load = () => adminRequest<typeof data>("/api/admin/stats").then(setData).catch((reason: Error) => { setLoadError(reason.message); setData(null); });
  useEffect(() => { if (token) load(); }, [token]);
  const signIn = (event: React.FormEvent) => { event.preventDefault(); localStorage.setItem("lia-admin-token", tokenInput); setLoadError(""); setToken(tokenInput); };
  const saveResource = async (event: React.FormEvent) => { event.preventDefault(); await adminRequest("/api/admin/resources", { method: "POST", body: JSON.stringify(resourceForm) }); setResourceForm({ title: "", description: "", category: "Belajar", url: "", icon: "book-open" }); setMessage("Sumber belajar ditambahkan."); load(); };
  const saveWork = async (event: React.FormEvent) => { event.preventDefault(); await adminRequest("/api/admin/works", { method: "POST", body: JSON.stringify(workForm) }); setWorkForm({ title: "", description: "", url: "", imageUrl: "" }); setMessage("Karya ditambahkan."); load(); };
  const remove = async (kind: "resources" | "works", id: number) => { await adminRequest(`/api/admin/${kind}/${id}`, { method: "DELETE" }); setMessage("Item dihapus."); load(); };

  if (!token || loadError) return <AdminLogin value={tokenInput} error={loadError} onChange={setTokenInput} onSubmit={signIn} />;
  if (!data) return <LoadingState />;
  return <div className="admin-shell"><div className="admin-content"><div className="admin-header"><div><a href="/" className="admin-back-link">← Kembali ke situs</a><h1>Ruang pengelola</h1><p>Kelola tautan belajar dan karya untuk Lia Physics Hub.</p></div><Badge><span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-400" /> Terhubung ke SQLite</Badge></div>{message && <div className="admin-message"><Check size={16} /> {message}</div>}<div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Tambah sumber belajar</CardTitle><CardDescription>Tambahkan kartu menuju Drive, YouTube, Quizizz, atau platform lain.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={saveResource}><Input required placeholder="Judul sumber belajar" value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} /><Textarea required placeholder="Deskripsi singkat" value={resourceForm.description} onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })} /><div className="grid gap-4 sm:grid-cols-2"><Input placeholder="Kategori" value={resourceForm.category} onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })} /><Input required type="url" placeholder="https://..." value={resourceForm.url} onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} /></div><Button type="submit"><Clipboard size={16} /> Simpan sumber</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Tambah karya</CardTitle><CardDescription>Tampilkan praktik baik, media, atau proyek siswa.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={saveWork}><Input required placeholder="Judul karya" value={workForm.title} onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })} /><Textarea required placeholder="Deskripsi singkat" value={workForm.description} onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })} /><Input required type="url" placeholder="URL karya" value={workForm.url} onChange={(e) => setWorkForm({ ...workForm, url: e.target.value })} /><Input type="url" placeholder="URL thumbnail (opsional)" value={workForm.imageUrl} onChange={(e) => setWorkForm({ ...workForm, imageUrl: e.target.value })} /><Button type="submit"><Clipboard size={16} /> Simpan karya</Button></form></CardContent></Card></div><div className="mt-8 grid gap-6 lg:grid-cols-2"><AdminList title="Sumber belajar" items={data.resources.map((item) => ({ id: item.id, title: item.title, meta: item.category }))} onDelete={(id) => remove("resources", id)} /><AdminList title="Karya & inovasi" items={data.works.map((item) => ({ id: item.id, title: item.title, meta: "Karya" }))} onDelete={(id) => remove("works", id)} /></div><Card className="mt-6"><CardHeader><CardTitle>Infrastruktur</CardTitle><CardDescription>Media upload siap digunakan melalui RustFS S3-compatible storage.</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Status icon={Laptop} label="Hono API" /><Status icon={FolderOpen} label="SQLite + Drizzle" /><Status icon={CloudSun} label="RustFS object storage" /></div></CardContent></Card></div></div>;
}

function AdminLogin({ value, error, onChange, onSubmit }: { value: string; error: string; onChange: (value: string) => void; onSubmit: (event: React.FormEvent) => void }) {
  return <div className="admin-shell admin-auth"><Card className="w-full max-w-md"><CardHeader><span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300 text-slate-950"><FolderOpen size={22} /></span><CardTitle>Masuk ke ruang pengelola</CardTitle><CardDescription>Masukkan token admin dari environment aplikasi untuk mengelola isi profil.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={onSubmit}><Input required type="password" placeholder="Token admin" value={value} onChange={(event) => onChange(event.target.value)} />{error && <p className="text-sm text-rose-300">{error}</p>}<Button className="w-full" type="submit">Masuk ke dashboard</Button><a href="/" className="admin-back-link admin-back-center">Kembali ke situs publik</a></form></CardContent></Card></div>;
}

function AdminList({ title, items, onDelete }: { title: string; items: { id: number; title: string; meta: string }[]; onDelete: (id: number) => void }) { return <Card><CardHeader><CardTitle>{title} <span className="ml-2 text-sm font-normal text-slate-500">{items.length}</span></CardTitle></CardHeader><CardContent><div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/20 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{item.title}</p><p className="text-xs text-slate-500">{item.meta}</p></div><Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} aria-label={`Hapus ${item.title}`}><Trash2 size={15} className="text-rose-300" /></Button></div>)}</div></CardContent></Card>; }
function Status({ icon: Icon, label }: { icon: LucideIcon; label: string }) { return <div className="status-item flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4"><Icon size={17} className="text-cyan-200" /><span className="text-sm text-slate-300">{label}</span><Check size={15} className="ml-auto text-emerald-300" /></div>; }

export { App };
