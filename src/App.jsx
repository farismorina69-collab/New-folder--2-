import { Component, useEffect, useMemo, useRef, useState } from 'react'
import {
  BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate, useParams,
} from 'react-router-dom'
import {
  FaArrowDownWideShort as ArrowDownUp,
  FaArrowLeft as ArrowLeft,
  FaArrowRight as ArrowRight,
  FaBars as Menu,
  FaCheck as Check,
  FaCircleCheck as BadgeCheck,
  FaClipboardList as ClipboardList,
  FaClock as Clock3,
  FaComment as MessageCircle,
  FaEye as Eye,
  FaEyeSlash as EyeOff,
  FaFilter as Filter,
  FaHandshakeAngle as HeartHandshake,
  FaImage as ImagePlus,
  FaLocationDot as MapPin,
  FaMagnifyingGlass as Search,
  FaMoon as Moon,
  FaPlus as Plus,
  FaRightFromBracket as LogOut,
  FaRightToBracket as LogIn,
  FaShieldHalved as ShieldCheck,
  FaSun as Sun,
  FaThumbsUp as ThumbsUp,
  FaTriangleExclamation as AlertCircle,
  FaUsers as Users,
  FaXmark as X,
} from 'react-icons/fa6'
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup,
} from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { auth, db, firebaseConfigured } from './firebase'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import { LanguageProvider } from './LanguageContext'
import { useLanguage } from './useLanguage'
import {
  categories, demoReports, formatDate, municipalities, statusClass, statuses,
} from './data'
import {
  confirmReport, createProfile, createReport, fetchHistory, fetchReport, fetchReports,
  fetchUserReports, fetchUserStats, updateReportStatus, fetchStats,
} from './services'
import './App.css'

const center = [42.6026, 20.903]
const currentYear = new Date().getFullYear()
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })
const mapMarkers = Object.fromEntries(Object.entries(statusClass).map(([status, color]) => [
  status,
  L.divIcon({
    className: 'status-map-icon',
    html: `<span class="marker-pin marker-${color}"></span>`,
    iconSize: [27, 38],
    iconAnchor: [13, 35],
  }),
]))

function AppFrame() {
  const { user, profile, loading, profileError, logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [theme, setTheme] = useState(() => localStorage.getItem('civic-theme') || 'light')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState('')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('civic-theme', theme)
    document.documentElement.lang = language
  }, [theme, language])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 4200)
    return () => clearTimeout(timer)
  }, [toast])
  const notify = (message) => setToast(message)
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="nav-inner">
          <Link className="brand" to="/" aria-label="Civic - Ballina">
            <span className="brand-mark"><MapPin size={20} strokeWidth={2.7} /></span>
            <span>Civic<span className="brand-accent">KS</span><small>{t('Ndrysho vendin tënd')}</small></span>
          </Link>
          <button className="icon-btn mobile-toggle" aria-label="Hap menynë" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={mobileOpen ? 'main-nav is-open' : 'main-nav'}>
            <NavLink to="/" end onClick={() => setMobileOpen(false)}>{t('Ballina')}</NavLink>
            <NavLink to="/reports" onClick={() => setMobileOpen(false)}>{t('Raportimet')}</NavLink>
            <NavLink to="/map" onClick={() => setMobileOpen(false)}>{t('Harta')}</NavLink>
            {user && <NavLink to="/dashboard" onClick={() => setMobileOpen(false)}>{t('Paneli im')}</NavLink>}
            {user && <AdminLink onNavigate={() => setMobileOpen(false)} />}
            <button type="button" className="language-toggle" aria-label={language === 'sq' ? 'Switch language to English' : 'Ndrysho gjuhën në shqip'} onClick={() => setLanguage(language === 'sq' ? 'en' : 'sq')}>
              {language === 'sq' ? '🇽🇰 SQ / EN' : '🇬🇧 EN / SQ'}
            </button>
            <button className="icon-btn theme-toggle" aria-label="Ndrysho temën" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {user ? (
              <button className="btn btn-quiet nav-login" onClick={() => logout().catch(() => notify('Dalja dështoi. Provo përsëri.'))}>
                <LogOut size={16} /> {t('Dil')}
              </button>
            ) : <Link className="btn btn-quiet nav-login" to="/login"><LogIn size={16} /> {t('Kyçu')}</Link>}
            <Link className="btn btn-primary nav-report" to={user ? '/reports/new' : '/login'}>
              <Plus size={17} /> {t('Raporto problem')}
            </Link>
          </nav>
        </div>
      </header>
      {!firebaseConfigured && <div className="config-banner"><AlertCircle size={17} /> Firebase nuk është konfiguruar ende. Plotëso skedarin <code>.env</code> për të aktivizuar llogaritë dhe raportimet.</div>}
      {profileError && <div className="config-banner" role="alert"><AlertCircle size={17} /> {profileError}</div>}
      <main>
        <Routes>
          <Route path="/" element={<Home notify={notify} />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/reports/:reportId" element={<ReportDetails notify={notify} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" notify={notify} />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="signup" notify={notify} />} />
          <Route path="/dashboard" element={<Protected loading={loading}><Dashboard profile={profile} /></Protected>} />
          <Route path="/reports/new" element={<Protected loading={loading}><CreateReport notify={notify} /></Protected>} />
          <Route path="/profile" element={<Protected loading={loading}><Profile profile={profile} notify={notify} /></Protected>} />
          <Route path="/admin" element={<Protected loading={loading}><AdminDashboard notify={notify} /></Protected>} />
          <Route path="/privacy" element={<PolicyPage type="privacy" />} />
          <Route path="/terms" element={<PolicyPage type="terms" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      {toast && <div className="toast" role="status"><Check size={18} />{toast}<button className="toast-close" aria-label="Mbyll njoftimin" onClick={() => setToast('')}><X size={16} /></button></div>}
    </div>
  )
}

function Protected({ children, loading }) {
  const { user } = useAuth()
  if (loading) return <div className="page-loading"><span className="spinner" /> Po ngarkohet llogaria…</div>
  return user ? children : <Navigate to="/login" replace />
}

function AdminLink({ onNavigate }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    let active = true
    user.getIdTokenResult().then((token) => {
      if (active) setIsAdmin(token.claims.admin === true)
    }).catch((error) => console.error('Unable to verify the administrator navigation claim.', error))
    return () => { active = false }
  }, [user])
  return isAdmin ? <NavLink to="/admin" onClick={onNavigate}>{t('Administrimi')}</NavLink> : null
}

function Footer() {
  const { t } = useLanguage()
  return <footer className="footer"><div className="footer-inner">
    <Link className="brand footer-brand" to="/"><span className="brand-mark"><MapPin size={19} /></span><span>Civic<span className="brand-accent">KS</span><small>{t('Ndrysho vendin tënd')}</small></span></Link>
    <p>{t('Një komunitet më i mirë fillon me një raportim.')}</p>
    <div className="footer-links"><Link to="/reports">{t('Raportimet')}</Link><Link to="/map">{t('Harta')}</Link><Link to="/privacy">{t('Privatësia')}</Link><Link to="/terms">{t('Kushtet')}</Link><a href="mailto:hello@example.com">{t('Kontakti i demonstrimit')}</a></div>
    <span className="copyright">© {currentYear} Civic KS · {t('Projekt qytetar për Kosovën')}</span>
  </div></footer>
}

function Home() {
  const { t } = useLanguage()
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ total: null, reviewing: null, inProgress: null, resolved: null })
  const [error, setError] = useState('')
  useEffect(() => {
    if (!firebaseConfigured) return
    Promise.all([fetchReports({ count: 3 }), fetchStats()]).then(([recent, aggregate]) => {
      setReports(recent)
      setStats(aggregate)
    }).catch(() => setError('Statistikat nuk mund të ngarkoheshin. Provo përsëri më vonë.'))
  }, [])
  const galleryReports = [...reports, ...demoReports.slice(0, Math.max(0, 8 - reports.length))]
  return <>
    <section className="hero">
      <div className="hero-content">
        <div className="eyebrow"><span className="pulse-dot" /> {t('Qytetarë aktivë. Komunitete më të mira.')}</div>
        <h1>{t('Ndryshimi fillon')}<br /><span>{t('nga vendi yt.')}</span></h1>
        <p>{t('Raporto problemet në komunitetin tënd dhe ndihmo që Kosova të bëhet një vend më i pastër, më i sigurt dhe më i mirë për të gjithë.')}</p>
        <div className="hero-actions"><Link className="btn btn-primary btn-large" to="/reports/new">{t('Raporto një problem')} <ArrowRight size={18} /></Link><Link className="btn btn-outline btn-large" to="/map"><MapPin size={18} /> {t('Eksploro hartën')}</Link></div>
        <div className="hero-proof"><div className="avatar-stack"><span>F</span><span>A</span><span>L</span><b>+</b></div><span>{t('Komuniteti yt ka rëndësi')}</span></div>
      </div>
      <div className="hero-visual">
        <div className="map-visual">
          <div className="map-grid" />
          <div className="map-river" />
          <span className="map-label label-prishtina">Prishtinë</span><span className="map-label label-ferizaj">Ferizaj</span><span className="map-label label-peja">Pejë</span>
          <span className="map-pin pin-one"><MapPin size={22} fill="currentColor" /></span><span className="map-pin pin-two"><MapPin size={22} fill="currentColor" /></span>
          <div className="map-float-card"><span className="float-icon"><BadgeCheck size={18} /></span><span><b>Një raportim u zgjidh!</b><small>Ndriçim publik · Prishtinë</small></span><span className="float-time">sot</span></div>
          <div className="map-location"><span /> Kosova</div>
        </div>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-sticker"><HeartHandshake size={18} /><span>Së bashku<br /><b>për komunitetin</b></span></div>
      </div>
    </section>
    <section className="stats-strip"><div className="stats-intro"><span className="section-kicker">{t('NDIKIMI YNË')}</span><h2>{t('Çdo raportim')}<br />{t('ka rëndësi.')}</h2></div>
      <Stat value={stats.total} label={t('Raportime gjithsej')} icon={<ClipboardList />} />
      <Stat value={stats.reviewing} label={t('Në shqyrtim')} icon={<Search />} />
      <Stat value={stats.inProgress} label={t('Në proces')} icon={<Clock3 />} />
      <Stat value={stats.resolved} label={t('Të zgjidhura')} icon={<BadgeCheck />} />
      {error && <span className="stats-error">{error}</span>}
    </section>
    <section className="section recent-section"><div className="section-heading"><div><span className="section-kicker">{t('NGA KOMUNITETI')}</span><h2>{t('Raportimet e fundit')}</h2><p>{t('Shiko çfarë po ndodh në qytetet tona.')}</p></div><Link className="text-link" to="/reports">{t('Shiko të gjitha')} <ArrowRight size={17} /></Link></div>
      {galleryReports.some((report) => report.isDemo) && <DemoNotice />}
      <div className="report-grid">{galleryReports.map((report) => <ReportCard key={report.id} report={report} />)}</div>
    </section>
    <section className="how-section"><div className="how-heading"><span className="section-kicker">{t('SI FUNKSIONON')}</span><h2>{t('Një hap i vogël,')}<br />{t('një ndryshim i madh.')}</h2><p>{t('Raporto, ndiq progresin dhe konfirmo çështjet që prekin komunitetin tënd.')}</p><Link className="btn btn-primary" to="/reports/new">{t('Fillo tani')} <ArrowRight size={17} /></Link></div>
      <div className="how-steps"><Step number="01" title={t('Vëre problemin')} text={t('Një rrugë e dëmtuar, mbeturina apo ndriçim që mungon? Çdo problem meriton vëmendje.')} icon={<Eye />} /><Step number="02" title={t('Raporto me lehtësi')} text={t('Shto një përshkrim, fotografi dhe vendndodhjen në hartë. Duhen vetëm pak minuta.')} icon={<ImagePlus />} /><Step number="03" title={t('Ndiq ndryshimin')} text={t('Merr përditësime për statusin dhe konfirmo raportimet që ndikojnë në zonën tënde.')} icon={<BadgeCheck />} /></div>
    </section>
    <section className="bottom-cta"><div className="cta-symbol"><MapPin size={26} /></div><div><h2>{t('Qyteti yt. Zëri yt.')}</h2><p>{t('Ndihmo ta bëjmë komunitetin tënd një vend më të mirë.')}</p></div><Link className="btn btn-white" to="/reports/new">{t('Raporto një problem')} <ArrowRight size={17} /></Link></section>
  </>
}

function Stat({ value, label, icon }) {
  return <div className="stat-item"><span className="stat-icon">{icon}</span><b>{value === null ? '—' : value}</b><span>{label}</span></div>
}

function Step({ number, title, text, icon }) {
  return <article className="how-step"><span className="step-number">{number}</span><span className="step-icon">{icon}</span><h3>{title}</h3><p>{text}</p></article>
}

function DemoNotice() {
  const { t } = useLanguage()
  return <div className="demo-notice">{t('Shembuj ilustrues — nuk janë raportime reale dhe nuk ruhen në Firebase.')}</div>
}

function ReportsPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(firebaseConfigured)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('newest')
  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    if (sort === 'oldest') return dateValue(a.createdAt) - dateValue(b.createdAt)
    if (sort === 'confirmed') return (b.confirmationCount || 0) - (a.confirmationCount || 0)
    return dateValue(b.createdAt) - dateValue(a.createdAt)
  }), [items, sort])
  const hasActiveFilters = Boolean(search.trim() || municipality || category || status)
  const galleryItems = [...(!hasActiveFilters && sortedItems.length < 8
    ? [...sortedItems, ...demoReports.slice(0, 8 - sortedItems.length)]
    : sortedItems)].sort((a, b) => {
    if (sort === 'oldest') return dateValue(a.createdAt) - dateValue(b.createdAt)
    if (sort === 'confirmed') return (b.confirmationCount || 0) - (a.confirmationCount || 0)
    return dateValue(b.createdAt) - dateValue(a.createdAt)
  })
  useEffect(() => {
    if (!firebaseConfigured) return
    let active = true
    fetchReports({ search, municipality, category, status })
      .then((result) => { if (active) { setItems(result); setError('') } })
      .catch(() => { if (active) setError('Raportimet nuk mund të ngarkoheshin. Kontrollo lidhjen dhe provo përsëri.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [search, municipality, category, status])
  return <section className="page-wrap">
    <PageTitle kicker={t('ZËRI I KOMUNITETIT')} title={t('Raportimet')} subtitle={t('Gjej raportimet publike dhe ndiq përmirësimet në komunitetin tënd.')} />
    <div className="filters-panel"><label className="search-field"><Search size={18} /><input placeholder={t('Kërko raportime…')} value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="filter-field"><MapPin size={16} /><select aria-label={t('Komuna')} value={municipality} onChange={(event) => setMunicipality(event.target.value)}><option value="">{t('Të gjitha komunat')}</option>{municipalities.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label><label className="filter-field"><Filter size={16} /><select aria-label={t('Kategoria')} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t('Të gjitha kategoritë')}</option>{categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label><label className="filter-field"><ArrowDownUp size={16} /><select aria-label={t('Statusi')} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t('Të gjitha statuset')}</option>{Object.entries(statuses).map(([key, text]) => <option value={key} key={key}>{t(text)}</option>)}</select></label><label className="filter-field"><ArrowDownUp size={16} /><select aria-label={t('Rendit raportimet')} value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">{t('Më të rejat')}</option><option value="oldest">{t('Më të vjetrat')}</option><option value="confirmed">{t('Më të konfirmuarat')}</option></select></label></div>
    {error && <ErrorMessage text={error} />}
    {loading ? <LoadingGrid /> : galleryItems.length ? <>{galleryItems.some((report) => report.isDemo) && <DemoNotice />}<div className="report-grid">{galleryItems.map((report) => <ReportCard key={report.id} report={report} />)}</div></> : <EmptyState icon={<Search />} title="Nuk u gjet asnjë raportim" text="Ndrysho filtrat ose kërko me fjalë të tjera." />}
  </section>
}

function ReportCard({ report }) {
  const { t } = useLanguage()
  const contents = <>
    <div className="report-image">{report.imageUrls?.[0] ? <img src={report.imageUrls[0]} alt="" loading="lazy" /> : <div className="image-placeholder"><MapPin size={25} /><span>{t('Raportim nga komuniteti')}</span></div>}<StatusBadge status={report.status} /></div>
    <div className="report-card-body"><div className="report-category">{t(report.category || 'Tjetër')} <span>·</span> {t(report.municipality)}</div><h3>{t(report.title)}</h3><p>{t(report.description)}</p><div className="report-meta"><span><Clock3 size={14} />{formatDate(report.createdAt)}</span><span><ThumbsUp size={14} />{report.confirmationCount || 0}</span></div>{report.isDemo && <span className="demo-card-label">{t('Shembull')}</span>}</div>
  </>
  return report.isDemo
    ? <article className="report-card report-card-demo">{contents}</article>
    : <Link className="report-card" to={`/reports/${report.id}`}>{contents}</Link>
}

function StatusBadge({ status }) {
  const { t } = useLanguage()
  return <span className={`status-badge ${statusClass[status] || 'blue'}`}><span />{t(statuses[status] || 'I panjohur')}</span>
}

function MapPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState([])
  const [municipality, setMunicipality] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!firebaseConfigured) return
    fetchReports({ count: 100 }).then(setItems).catch(() => setError('Harta nuk mundi t’i ngarkonte raportimet.'))
  }, [])
  const markers = useMemo(() => items.filter((item) => item.latitude && item.longitude && (!municipality || item.municipality === municipality) && (!category || item.category === category) && (!status || item.status === status)), [items, municipality, category, status])
  return <section className="page-wrap map-page"><PageTitle kicker={t('NË HARTË')} title={t('Shiko çfarë po ndodh')} subtitle={t('Eksploro raportimet në Kosovë dhe zbulo çështjet pranë komunitetit tënd.')} />
    <div className="map-toolbar"><label className="filter-field"><MapPin size={16} /><select value={municipality} onChange={(event) => setMunicipality(event.target.value)}><option value="">{t('Të gjitha komunat')}</option>{municipalities.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label><label className="filter-field"><Filter size={16} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t('Të gjitha kategoritë')}</option>{categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label><label className="filter-field"><Filter size={16} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t('Të gjitha statuset')}</option>{Object.entries(statuses).map(([key, text]) => <option value={key} key={key}>{t(text)}</option>)}</select></label><span className="map-count">{markers.length} {t('raportime të shfaqura')}</span></div>
    {error && <ErrorMessage text={error} />}
    <MapContainer center={center} zoom={8} scrollWheelZoom className="leaflet-map" aria-label="Harta e raportimeve publike">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setError('Hartat OpenStreetMap nuk mund të ngarkoheshin. Kontrollo lidhjen e internetit.') }} />
      {markers.map((item) => <Marker key={item.id} position={[item.latitude, item.longitude]} icon={mapMarkers[item.status] || mapMarkers.reported}><Popup><div className="map-popup"><strong>{item.title}</strong><span>{item.category} · {item.municipality}</span><StatusBadge status={item.status} /><Link to={`/reports/${item.id}`}>Shiko raportimin →</Link></div></Popup></Marker>)}
    </MapContainer>
    <div className="map-legend"><b>{t('Legjenda')}</b>{Object.entries(statuses).map(([key, label]) => <span key={key}><i className={`legend-dot ${statusClass[key]}`} />{t(label)}</span>)}<span className="map-disclaimer">{t('Shfaqen vetëm raportimet me koordinata të zgjedhura publikisht.')}</span></div>
    {!firebaseConfigured && <EmptyState icon={<MapPin />} title="Harta po pret konfigurimin" text="Lidh Firebase-in për të shfaqur raportimet publike." />}
  </section>
}

function MapPicker({ position, setPosition }) {
  useMapEvents({ click(event) { setPosition([event.latlng.lat, event.latlng.lng]) } })
  return position ? <Marker position={position} /> : null
}

function CreateReport({ notify }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [position, setPosition] = useState(null)
  const [image, setImage] = useState(null)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!firebaseConfigured) return setError('Konfiguro Firebase-in para se të krijosh ose të hysh në llogari.')
    const form = new FormData(event.currentTarget)
    const values = {
      title: form.get('title').trim(), description: form.get('description').trim(),
      municipality: form.get('municipality'), category: form.get('category'),
      address: form.get('address').trim(),
      latitude: position ? position[0] : null, longitude: position ? position[1] : null,
    }
    if (!values.title || !values.description || !values.municipality || !values.category) return setError('Plotëso të gjitha fushat e detyrueshme.')
    if (values.title.length < 4) return setError('Titulli duhet të ketë të paktën 4 karaktere.')
    if (values.description.length < 10) return setError('Përshkrimi duhet të ketë të paktën 10 karaktere.')
    setBusy(true)
    try {
      const id = await createReport(values, image, user.uid, setProgress)
      notify('Raportimi u dërgua me sukses.')
      navigate(`/reports/${id}`)
    } catch (issue) {
      setError(issue.code === 'storage/unauthorized' ? 'Nuk u lejua ngarkimi i fotografisë. Kontrollo konfigurimin e Storage Rules.' : `Raportimi nuk u dërgua: ${errorMessage(issue)}`)
    } finally { setBusy(false) }
  }
  function chooseImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Lejohen vetëm fotografitë JPG, PNG ose WebP.')
    if (file.size > 5 * 1024 * 1024) return setError('Fotografia duhet të jetë më e vogël se 5 MB.')
    setError(''); setImage(file)
  }
  return <section className="page-wrap narrow-page"><Link to="/reports" className="back-link"><ArrowLeft size={16} /> {t('Kthehu te raportimet')}</Link><PageTitle kicker={t('BËHU PJESË E NDRYSHIMIT')} title={t('Raporto një problem')} subtitle={t('Na ndihmo ta kuptojmë më mirë çështjen dhe vendndodhjen e saj.')} />
    <form className="form-card create-form" onSubmit={submit}>
      <div className="form-section-title"><span>01</span><div><h2>{t('Detajet e raportimit')}</h2><p>{t('Shkruaj qartë që institucionet ta kuptojnë problemin.')}</p></div></div>
      <Field label={t('Titulli')} required><input name="title" minLength="4" maxLength="100" required placeholder={t('p.sh. Ndriçimi publik nuk funksionon')} /></Field>
      <div className="form-row"><Field label={t('Komuna')} required><select name="municipality" required defaultValue=""><option value="" disabled>{t('Zgjidh komunën')}</option>{municipalities.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></Field><Field label={t('Kategoria')} required><select name="category" required defaultValue=""><option value="" disabled>{t('Zgjidh kategorinë')}</option>{categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></Field></div>
      <Field label={t('Përshkrimi')} required hint={t('10–1,500 karaktere')}><textarea name="description" rows="5" minLength="10" maxLength="1500" required placeholder={t('Përshkruaj problemin, kur e vure re dhe si ndikon te komuniteti…')} /></Field>
      <Field label={t('Adresa')} hint={t('Opsionale')}><input name="address" maxLength="180" placeholder={t('Rruga, lagjja ose një pikë referimi')} /></Field>
      <div className="form-section-title section-spacer"><span>02</span><div><h2>{t('Vendndodhja')}</h2><p>{t('Zgjidh pikën në hartë për të treguar ku ndodhet problemi.')}</p></div></div>
      <MapContainer center={center} zoom={8} className="picker-map">      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setError('Hartat OpenStreetMap nuk mund të ngarkoheshin. Kontrollo lidhjen e internetit.') }} /><MapPicker position={position} setPosition={setPosition} /></MapContainer>
      <div className="coordinate-note"><MapPin size={15} />{position ? `${t('Koordinatat')}: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : t('Kliko në hartë për të zgjedhur vendndodhjen (opsionale).')}</div>
      <div className="form-section-title section-spacer"><span>03</span><div><h2>{t('Shto fotografi')}</h2><p>{t('Fotografia ndihmon në verifikimin e raportimit.')}</p></div></div>
      <label className="upload-zone"><ImagePlus size={24} /><b>{image ? image.name : t('Zgjidh një fotografi')}</b><span>JPG, PNG ose WebP · {t('maksimumi 5 MB')}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /></label>
      {busy && image && <div className="progress-wrap"><div className="progress-label"><span>{t('Po ngarkohet fotografia…')}</span><b>{progress}%</b></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>}
      {error && <ErrorMessage text={error} />}
      <div className="form-submit-row"><span><ShieldCheck size={16} /> {t('Raportimi yt do të jetë publik.')}</span><button className="btn btn-primary btn-large" disabled={busy}>{busy ? <><span className="button-spinner" /> {t('Po dërgohet…')}</> : <>{t('Dërgo raportimin')} <ArrowRight size={17} /></>}</button></div>
    </form>
  </section>
}

function ReportDetails({ notify }) {
  const { reportId } = useParams()
  const { user } = useAuth()
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(firebaseConfigured)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!firebaseConfigured) return
    Promise.all([fetchReport(reportId), fetchHistory(reportId)]).then(([item, events]) => {
      setReport(item); setHistory(events)
    }).catch(() => setError('Detajet nuk mund të ngarkoheshin.')).finally(() => setLoading(false))
  }, [reportId])
  async function confirm() {
    if (!user) return
    setBusy(true)
    try { await confirmReport(reportId, user.uid); setReport({ ...report, confirmationCount: (report.confirmationCount || 0) + 1 }); notify('Konfirmimi yt u regjistrua.') }
    catch (issue) { setError(errorMessage(issue)) }
    finally { setBusy(false) }
  }
  if (loading) return <div className="page-loading"><span className="spinner" /> Po ngarkohet raportimi…</div>
  if (!report) return <section className="page-wrap"><EmptyState icon={<AlertCircle />} title="Raportimi nuk u gjet" text={error || 'Mund të jetë fshirë ose lidhja është e pavlefshme.'} /></section>
  return <section className="page-wrap narrow-page detail-page"><Link to="/reports" className="back-link"><ArrowLeft size={16} /> Të gjitha raportimet</Link>
    {error && <ErrorMessage text={error} />}
    <div className="detail-topline"><span className="report-category">{report.category} · {report.municipality}</span><StatusBadge status={report.status} /></div>
    <h1 className="detail-title">{report.title}</h1><p className="detail-subtitle">Raportuar më {formatDate(report.createdAt)} {report.address ? `· ${report.address}` : ''}</p>
    {report.imageUrls?.length > 0 && <img className="detail-image" src={report.imageUrls[0]} alt={`Fotografi për ${report.title}`} />}
    <div className="detail-columns"><article className="detail-content"><h2>Përshkrimi i problemit</h2><p>{report.description}</p>{report.latitude && report.longitude && <><h2>Vendndodhja</h2><div className="detail-map"><MapContainer center={[report.latitude, report.longitude]} zoom={14} className="detail-leaflet"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={[report.latitude, report.longitude]} /></MapContainer></div></>}</article>
      <aside className="detail-aside"><div className="confirm-card"><span className="confirm-icon"><Users size={20} /></span><b>{report.confirmationCount || 0}</b><span>persona e konfirmuan këtë problem</span><button className="btn btn-primary" onClick={confirm} disabled={!user || busy}>{busy ? 'Po ruhet…' : <><ThumbsUp size={16} /> Edhe mua më prek</>}</button>{!user && <small><Link to="/login">Kyçu</Link> për ta konfirmuar.</small>}</div>
        <div className="history-card"><h3><Clock3 size={17} /> Historia e statusit</h3>{history.length ? history.map((entry) => <div className="history-entry" key={entry.id}><span className="history-dot" /><div><b>{statuses[entry.newStatus] || entry.newStatus}</b>{entry.note && <p>{entry.note}</p>}<small>{formatDate(entry.createdAt)}</small></div></div>) : <p className="muted-copy">Nuk ka ende përditësime zyrtare.</p>}</div></aside></div>
  </section>
}

function AuthPage({ mode, notify }) {
  const { t } = useLanguage()
  const signup = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const emailInput = useRef(null)
  const navigate = useNavigate()

  async function requestPasswordReset() {
    setError('')
    if (!firebaseConfigured) return setError('Konfiguro Firebase-in para se të përdorësh këtë funksion.')
    const email = emailInput.current?.value.trim()
    if (!email) return setError('Shkruaj email-in fillimisht.')
    setResetBusy(true)
    try {
      await sendPasswordResetEmail(auth, email)
      notify('Nëse email-i është i regjistruar, do të marrësh një lidhje për rivendosjen e fjalëkalimit.')
    } catch (issue) {
      setError(authError(issue.code))
    } finally {
      setResetBusy(false)
    }
  }

  async function signInWithGoogle() {
    if (!firebaseConfigured) return setError('Konfiguro Firebase-in para se të krijosh ose të hysh në llogari.')
    if (signup && !termsAccepted) return setError('Duhet të pranosh kushtet dhe politikën e privatësisë.')
    setError('')
    setBusy(true)
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider())
      const profileSnapshot = await getDoc(doc(db, 'users', credential.user.uid))
      if (!profileSnapshot.exists()) {
        await createProfile(credential.user, credential.user.displayName || credential.user.email.split('@')[0])
      }
      navigate('/dashboard')
    } catch (issue) {
      setError(authError(issue.code))
    } finally {
      setBusy(false)
    }
  }

  async function submit(event) {
    event.preventDefault(); setError('')
    if (!firebaseConfigured) return setError('Konfiguro Firebase-in para se të krijosh ose të hysh në llogari.')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    const displayName = String(form.get('displayName') || '').trim()
    if (signup && displayName.length < 2) return setError('Shkruaj emrin dhe mbiemrin.')
    if (signup && password.length < 8) return setError('Fjalëkalimi duhet të ketë të paktën 8 karaktere.')
    if (signup && password !== form.get('confirmPassword')) return setError('Fjalëkalimet nuk përputhen.')
    if (signup && !form.get('terms')) return setError('Duhet të pranosh kushtet dhe politikën e privatësisë.')
    setBusy(true)
    try {
      if (signup) {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        try {
          await createProfile(credential.user, displayName)
          await sendEmailVerification(credential.user)
          notify('Llogaria u krijua. Kontrollo email-in për verifikim.')
          navigate('/dashboard')
        } catch {
          setError('Llogaria u krijua, por profili ose email-i i verifikimit nuk u ruajt. Kyçu përsëri për të provuar sërish.')
        }
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password)
        const profileSnapshot = await getDoc(doc(db, 'users', credential.user.uid))
        if (!profileSnapshot.exists()) {
          await createProfile(credential.user, credential.user.displayName || email.split('@')[0])
        }
        navigate('/dashboard')
      }
    } catch (issue) { setError(authError(issue.code)) }
    finally { setBusy(false) }
  }
  return <section className="auth-page"><div className="auth-decoration"><span className="auth-glow" /><div className="auth-brand"><span className="brand-mark"><MapPin size={21} /></span><span>Civic<span className="brand-accent">KS</span></span></div><div className="auth-message"><span className="section-kicker">{t('KOMUNITETI YT KA RËNDËSI')}</span><h2>{t('Një vend më i mirë')}<br />{t('fillon me ty.')}</h2><p>{t('Çdo problem i raportuar është një hap drejt ndryshimit.')}</p><div className="auth-quote"><MessageCircle size={18} /><span>“{t('Ndryshimi fillon nga vendi yt.')}”</span></div></div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><Link to="/" className="back-link"><ArrowLeft size={16} /> {t('Ballina')}</Link><span className="section-kicker">{t(signup ? 'BASHKOHU ME KOMUNITETIN' : 'MIRË SE U KTHYET')}</span><h1>{t(signup ? 'Krijo llogarinë' : 'Kyçu në llogari')}</h1><p className="auth-intro">{t(signup ? 'Fillo të raportosh dhe të ndjekësh përmirësimet.' : 'Vazhdo të ndihmosh komunitetin tënd.')}</p>
      <form className="auth-form" onSubmit={submit}>
        {signup && <Field label={t('Emri dhe mbiemri')}><input name="displayName" required autoComplete="name" placeholder={t('Emri juaj')} /></Field>}
        <Field label={t('Email')}><input ref={emailInput} name="email" type="email" required autoComplete="email" placeholder="name@email.com" /></Field>
        <Field label={t('Fjalëkalimi')}><div className="password-wrap"><input name="password" type={showPassword ? 'text' : 'password'} required minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={t('Të paktën 8 karaktere')} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
        {signup ? <Field label={t('Konfirmo fjalëkalimin')}><input name="confirmPassword" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" placeholder={t('Shkruaj përsëri fjalëkalimin')} /></Field> : <button className="forgot-link" type="button" onClick={requestPasswordReset} disabled={resetBusy}>{resetBusy ? t('Po dërgohet…') : t('Ke harruar fjalëkalimin?')}</button>}
        {signup && <label className="checkbox-row"><input type="checkbox" name="terms" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /> <span>{t('Pranoj')} <Link to="/terms">{t('kushtet e përdorimit')}</Link> {t('dhe')} <Link to="/privacy">{t('politikën e privatësisë')}</Link>.</span></label>}
        {error && <ErrorMessage text={error} />}
        <button className="btn btn-primary auth-submit" disabled={busy || !firebaseConfigured}>{busy ? <><span className="button-spinner" /> {t('Po përpunohet…')}</> : t(signup ? 'Krijo llogari' : 'Kyçu')} {!busy && <ArrowRight size={17} />}</button>
      </form>
      <div className="auth-divider"><span>{t('ose vazhdo me')}</span></div>
      <button type="button" className="google-signin" onClick={signInWithGoogle} disabled={busy || !firebaseConfigured}><GoogleMark />{t('Vazhdo me Google')}</button>
      <p className="auth-switch">{t(signup ? 'Ke tashmë llogari?' : 'Nuk ke llogari?')} <Link to={signup ? '/login' : '/signup'}>{t(signup ? 'Kyçu' : 'Regjistrohu')}</Link></p>
    </div></div></section>
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.24l7.73 6C44.38 38.05 46.98 31.92 46.98 24.55Z" /><path fill="#FBBC05" d="M10.53 28.41a14.4 14.4 0 0 1-.75-4.41c0-1.53.27-3.01.75-4.41l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.84.92 7.47 2.55 10.6l7.98-6.19Z" transform="translate(0 4)" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.74-6c-2.14 1.44-4.88 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -3)" /></svg>
}

function Dashboard({ profile }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 })
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([fetchUserReports(user.uid), fetchUserStats(user.uid)])
      .then(([page, aggregate]) => {
        if (active) {
          setItems(page.reports)
          setCursor(page.nextCursor)
          setStats(aggregate)
        }
      })
      .catch(() => { if (active) setError('Raportimet e tua nuk mund të ngarkoheshin.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.uid])
  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await fetchUserReports(user.uid, cursor)
      setItems((current) => [...current, ...page.reports])
      setCursor(page.nextCursor)
    } catch {
      setError('Raportimet e mëtejshme nuk mund të ngarkoheshin.')
    } finally { setLoadingMore(false) }
  }
  const displayName = profile?.displayName || user.displayName || 'Faris'
  return <section className="page-wrap dashboard-page"><div className="dashboard-welcome"><div><span className="section-kicker">{t('PANELI YT PERSONAL')}</span><h1>{t('Përshëndetje,')} {displayName.split(' ')[0]} <span>👋</span></h1><p>{t('Faleminderit që po ndihmon komunitetin tënd të përmirësohet.')}</p></div><Link to="/reports/new" className="btn btn-primary"><Plus size={17} /> {t('Raporto një problem')}</Link></div>
    <div className="dashboard-stats"><MiniStat icon={<ClipboardList />} label={t('Raportimet e mia')} value={stats.total} /><MiniStat icon={<Clock3 />} label={t('Në proces')} value={stats.active} /><MiniStat icon={<BadgeCheck />} label={t('Të zgjidhura')} value={stats.resolved} /></div>
    <div className="dashboard-section-heading"><div><h2>{t('Raportimet e mia')}</h2><p>{t('Ndiq statusin dhe aktivitetin e raportimeve të tua.')}</p></div><Link to="/profile" className="btn btn-outline">{t('Profili im')} <ArrowRight size={16} /></Link></div>
    {error && <ErrorMessage text={error} />}
    {loading ? (
      <LoadingGrid />
    ) : items.length ? (
      <>
        <div className="report-grid">{items.map((report) => <ReportCard key={report.id} report={report} />)}</div>
        {cursor && <div className="load-more"><button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>{loadingMore ? t('Po ngarkohen…') : t('Ngarko raportime më të vjetra')}</button></div>}
      </>
    ) : (
      <EmptyState icon={<ClipboardList />} title="Ende nuk ke raportuar asnjë problem" text="Raportimi yt i parë mund të nisë një ndryshim të rëndësishëm." action={<Link className="btn btn-primary" to="/reports/new">{t('Raporto tani')} <ArrowRight size={16} /></Link>} />
    )}
  </section>
}

function MiniStat({ icon, label, value }) {
  return <div className="mini-stat"><span className="stat-icon">{icon}</span><div><b>{value}</b><span>{label}</span></div></div>
}

function Profile({ profile, notify }) {
  const { user, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: String(data.get('displayName')).trim(),
        preferredMunicipality: String(data.get('preferredMunicipality')),
      })
      await refreshProfile(); notify('Profili u përditësua.')
    } catch (issue) { setError(`Profili nuk u ruajt: ${errorMessage(issue)}`) }
    finally { setBusy(false) }
  }
  return <section className="page-wrap narrow-page"><Link to="/dashboard" className="back-link"><ArrowLeft size={16} /> Paneli im</Link><PageTitle kicker="LLOGARIA JOTE" title="Profili im" subtitle="Përditëso informacionin e llogarisë dhe komunën e preferuar." />
    <form className="form-card profile-form" onSubmit={save}><Field label="Emri dhe mbiemri"><input name="displayName" defaultValue={profile?.displayName || user.displayName || ''} required minLength="2" maxLength="80" /></Field><Field label="Email"><input value={user.email || ''} disabled /><small>Email-i i llogarisë nuk mund të ndryshohet këtu.</small></Field><Field label="Komuna e preferuar"><select name="preferredMunicipality" defaultValue={profile?.preferredMunicipality || ''}><option value="">Zgjidh komunën (opsionale)</option>{municipalities.map((item) => <option key={item}>{item}</option>)}</select></Field>{error && <ErrorMessage text={error} />}<button className="btn btn-primary" disabled={busy}>{busy ? 'Po ruhet…' : 'Ruaj ndryshimet'}</button></form>
  </section>
}

function AdminDashboard() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [note, setNote] = useState({})
  useEffect(() => {
    user.getIdTokenResult(true).then((token) => {
      setIsAdmin(token.claims.admin === true)
      if (token.claims.admin === true) return fetchReports({ count: 100 }).then(setItems)
    }).catch(() => setError('Nuk mund të verifikohej privilegji i administratorit.')).finally(() => setChecking(false))
  }, [user])
  async function changeStatus(item, nextStatus) {
    try {
      await updateReportStatus(item.id, nextStatus, note[item.id] || '', user.uid)
      setItems((current) => current.map((report) => report.id === item.id ? { ...report, status: nextStatus } : report))
      setError('')
    } catch (issue) { setError(`Ndryshimi nuk u ruajt: ${errorMessage(issue)}`) }
  }
  if (checking) return <div className="page-loading"><span className="spinner" /> Po verifikohet qasja…</div>
  if (!isAdmin) return <section className="page-wrap"><EmptyState icon={<ShieldCheck />} title="Qasje vetëm për administratorë" text="Privilegji admin jepet në mënyrë të sigurt përmes Firebase Admin SDK dhe custom claims." /></section>
  return <section className="page-wrap admin-page"><PageTitle kicker="MENAXHIMI I RAPORTIMEVE" title="Paneli i administratorit" subtitle="Shqyrto raportimet dhe publiko përditësime zyrtare të statusit." />{error && <ErrorMessage text={error} />}
    <div className="admin-list">{items.map((item) => <article className="admin-row" key={item.id}><div className="admin-report"><Link to={`/reports/${item.id}`}><b>{item.title}</b></Link><span>{item.municipality} · {item.category} · {formatDate(item.createdAt)}</span></div><label className="admin-note"><span>Shënimi zyrtar</span><input value={note[item.id] ?? ''} maxLength="500" onChange={(event) => setNote({ ...note, [item.id]: event.target.value })} placeholder="Shkruaj përditësimin…" /></label><select value={item.status} onChange={(event) => changeStatus(item, event.target.value)} aria-label={`Ndrysho statusin: ${item.title}`}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></article>)}</div>
  </section>
}

function PageTitle({ kicker, title, subtitle }) {
  const { t } = useLanguage()
  return <div className="page-title"><span className="section-kicker">{t(kicker)}</span><h1>{t(title)}</h1><p>{t(subtitle)}</p></div>
}

function Field({ label, required, hint, children }) {
  const { t } = useLanguage()
  return <label className="field"><span className="field-label">{t(label)}{required && <i> *</i>}</span>{children}{hint && <small>{t(hint)}</small>}</label>
}

function ErrorMessage({ text }) {
  const { t } = useLanguage()
  return <div className="error-message" role="alert"><AlertCircle size={17} />{t(text)}</div>
}

function EmptyState({ icon, title, text, action }) {
  const { t } = useLanguage()
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{t(title)}</h3><p>{t(text)}</p>{action}</div>
}

function LoadingGrid() {
  return <div className="report-grid">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><span /><div><i /><i /><i /></div></div>)}</div>
}

function NotFound() {
  const { t } = useLanguage()
  return <section className="page-wrap not-found"><div className="not-found-code">404</div><h1>{t('Kjo faqe nuk u gjet')}</h1><p>{t('Lidhja mund të jetë e gabuar ose faqja është zhvendosur.')}</p><Link className="btn btn-primary" to="/">{t('Kthehu në ballinë')}</Link></section>
}

function PolicyPage({ type }) {
  const { t } = useLanguage()
  const privacy = type === 'privacy'
  return <section className="page-wrap narrow-page"><Link to="/" className="back-link"><ArrowLeft size={16} /> {t('Ballina')}</Link><PageTitle kicker={t('INFORMACION')} title={t(privacy ? 'Politika e privatësisë' : 'Kushtet e përdorimit')} subtitle={t('Informacion i shkurtër për përdorimin e demonstrimit Civic KS.')} />
    <article className="policy-card">
      {privacy ? <>
        <h2>Çfarë informacioni ruhet?</h2><p>Llogaria ruan emrin publik, email-in dhe komunën e preferuar. Raportimet publike përmbajnë titullin, përshkrimin, komunën, kategorinë, adresën e dhënë, fotografitë, statusin dhe koordinatat që ti zgjedh vetë në hartë.</p>
        <h2>Çfarë bëhet publike?</h2><p>Raportimet dhe fotografitë e ngarkuara janë të dukshme publikisht. Mos përfshi në përshkrime ose fotografi të dhëna personale, fytyra të identifikueshme apo vendndodhje private të personave pa pëlqimin e tyre. Aplikacioni nuk përdor GPS dhe nuk mbledh vendndodhjen e pajisjes.</p>
        <h2>Ruajtja dhe qasja</h2><p>Të dhënat ruhen në Firebase të projektit të konfiguruar nga operatori. Email-i i llogarisë është i kufizuar sipas rregullave Firestore; raportimet publike janë të lexueshme nga të gjithë. Ky tekst është informacion demonstrues, jo këshillë ligjore. Para publikimit, pronari duhet ta përshtatë sipas ligjeve, afateve të ruajtjes dhe procedurave të projektit.</p>
      </> : <>
        <h2>Përdorimi i përgjegjshëm</h2><p>Raporto çështje reale publike me përshkrime të sakta, respektuese dhe të dobishme. Mos përdor platformën për përmbajtje të paligjshme, kërcënuese, abuzive, shpifëse ose për publikimin e të dhënave personale të të tjerëve.</p>
        <h2>Publikimi dhe statuset</h2><p>Raportimet, fotografitë dhe vendndodhjet e zgjedhura publikohen. Statuset zyrtare mund të ndryshohen vetëm nga administratorët e autorizuar. Përdoruesit janë përgjegjës për përmbajtjen që dërgojnë dhe duhet të kenë të drejtë të përdorin materialet e ngarkuara.</p>
        <h2>Disponueshmëria</h2><p>Civic KS është demonstrim software-i dhe nuk garanton se një institucion do të pranojë apo zgjidhë raportimin. Kontakti dhe ky tekst janë shembuj që duhet të rishikohen nga operatori para publikimit.</p>
      </>}
    </article>
  </section>
}

class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error) { console.error('The application encountered an unexpected rendering error.', error) }
  render() {
    if (this.state.hasError) return <div className="page-wrap"><EmptyState icon={<AlertCircle />} title="Ndodhi një gabim i papritur" text="Rifresko faqen. Nëse problemi vazhdon, provo përsëri më vonë." action={<button className="btn btn-primary" onClick={() => window.location.reload()}>Rifresko faqen</button>} /></div>
    return this.props.children
  }
}

function errorMessage(issue) {
  return issue?.message || 'Ndodhi një gabim i papritur.'
}

function dateValue(value) {
  if (!value) return 0
  return value.toDate ? value.toDate().getTime() : new Date(value).getTime()
}

function authError(code) {
  const messages = {
    'auth/email-already-in-use': 'Ky email është i regjistruar tashmë. Kyçu ose përdor një email tjetër.',
    'auth/invalid-email': 'Email-i nuk është në format të vlefshëm.',
    'auth/weak-password': 'Fjalëkalimi është shumë i dobët. Përdor të paktën 8 karaktere.',
    'auth/invalid-credential': 'Email-i ose fjalëkalimi është i pasaktë.',
    'auth/user-not-found': 'Nuk u gjet llogari me këtë email.',
    'auth/wrong-password': 'Fjalëkalimi është i pasaktë.',
    'auth/too-many-requests': 'Shumë përpjekje. Prit pak dhe provo përsëri.',
    'auth/network-request-failed': 'Problem me lidhjen e internetit. Provo përsëri.',
    'auth/operation-not-allowed': 'Aktivizo Email/Password në Firebase Authentication.',
    'auth/popup-closed-by-user': 'Dritarja e Google u mbyll para përfundimit të hyrjes.',
    'auth/popup-blocked': 'Shfletuesi bllokoi dritaren e Google. Lejo dritaret kërcyese dhe provo përsëri.',
    'auth/account-exists-with-different-credential': 'Ekziston një llogari me këtë email. Kyçu me metodën që ke përdorur më parë.',
  }
  return messages[code] || `Autentikimi dështoi: ${code || 'gabim i panjohur'}.`
}

export default function App() {
  return <BrowserRouter><AuthProvider><LanguageProvider><ErrorBoundary><AppFrame /></ErrorBoundary></LanguageProvider></AuthProvider></BrowserRouter>
}
