import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import './seo.css'
import './workflow.css'
import './theme.css'
import { captureError } from './monitoring'
import { translations } from './i18n'
import type { Language } from './i18n'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const localizedKeywords: Record<Language, string> = {
  en: 'Instagram reel downloader, Instagram video downloader, Instagram photo downloader, Instagram story downloader, download public Instagram videos',
  hi: 'Instagram reel downloader Hindi, Instagram video download, Instagram photo download, Instagram story saver, public Instagram video download',
  es: 'descargador de reels Instagram, descargador de videos Instagram, descargar fotos Instagram, descargador de stories Instagram',
  ru: 'скачать reels Instagram, загрузчик видео Instagram, скачать фото Instagram, загрузчик историй Instagram',
  fr: 'téléchargeur reels Instagram, télécharger vidéos Instagram, télécharger photos Instagram, téléchargeur stories',
  pt: 'baixador de reels Instagram, baixar vídeos Instagram, baixar fotos Instagram, baixador de stories Instagram',
}

type PreviewData = {
  title: string
  creator: string
  thumbnail?: string
  media_type: 'video' | 'image' | 'carousel'
  duration?: number
  filesize?: number
  items: number
}

const seoPages: Record<string, { title: string; intro: string }> = {
  '/instagram-reel-downloader': { title: 'Instagram Reel Downloader', intro: 'Save public Instagram reels in the best available quality on your phone, tablet, or computer.' },
  '/instagram-video-downloader': { title: 'Instagram Video Downloader', intro: 'Download public Instagram videos from feed posts without an account or extra app.' },
  '/instagram-photo-downloader': { title: 'Instagram Photo Downloader', intro: 'Save public Instagram photos and carousel posts as image files or a convenient ZIP.' },
  '/instagram-story-downloader': { title: 'Instagram Story Downloader', intro: 'Keep public Instagram story media available for offline viewing while respecting creators.' },
  '/instagram-igtv-downloader': { title: 'IGTV Video Downloader', intro: 'Download publicly available Instagram TV videos directly from your browser.' },
}

const legalPages: Record<string, { title: string; body: string[] }> = {
  '/privacy': { title: 'Privacy Policy', body: ['ReelDownloaderNow does not ask for an Instagram password or require an account. Links submitted to the service are processed only to locate publicly available media and are not published.', 'Temporary download files are removed after the response is sent. Production deployments should configure access logs, retention, and hosting providers according to local privacy law.', 'For privacy questions, contact privacy@reeldownloadernow.com.'] },
  '/terms': { title: 'Terms of Use', body: ['Use ReelDownloaderNow only for public content that you are allowed to save. You are responsible for permission, copyright, trademarks, and compliance with Instagram terms and applicable law.', 'The service is provided as available. Private, deleted, age-restricted, or rate-limited content may not be accessible, and no availability guarantee is made.', 'Do not use the service to abuse, harass, impersonate, or redistribute content without permission.'] },
  '/dmca': { title: 'Copyright & DMCA', body: ['ReelDownloaderNow respects creator rights. We do not claim ownership of downloaded media and do not encourage unauthorized redistribution.', 'To report a copyright concern, email dmca@reeldownloadernow.com with the URL, your rights-holder details, and a clear description of the request. We will review valid notices promptly.', 'Instagram is a trademark of its respective owner. ReelDownloaderNow is an independent tool and is not affiliated with Instagram.'] },
}

function App() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'error' | 'previewing' | 'ready' | 'downloading'>('idle')
  const [format, setFormat] = useState('1080p')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('reeldownloader-language') as Language) || 'en')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('reeldownloader-theme') !== 'light')
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt: () => Promise<void> } | null>(null)

  const seoPage = seoPages[window.location.pathname]
  const legalPage = legalPages[window.location.pathname]
  const copy = translations[language] || translations.en

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as Event & { prompt: () => Promise<void> })
    }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    return () => window.removeEventListener('beforeinstallprompt', capturePrompt)
  }, [])

  useEffect(() => {
    const title = seoPage?.title || legalPage?.title || 'ReelDownloaderNow | Free Instagram Reel & Video Downloader'
    document.title = `${title} | ReelDownloaderNow`
    const description = document.querySelector('meta[name="description"]')
    if (description && seoPage) description.setAttribute('content', seoPage.intro)
  }, [seoPage, legalPage])

  useEffect(() => {
    localStorage.setItem('reeldownloader-language', language)
    document.documentElement.lang = language
    document.title = `${copy.seoTitle} | ReelDownloaderNow`
    const description = document.querySelector('meta[name="description"]')
    description?.setAttribute('content', copy.seoDescription)
    document.querySelector('meta[name="keywords"]')?.setAttribute('content', localizedKeywords[language])
  }, [language, copy.seoDescription, copy.seoTitle])

  useEffect(() => {
    localStorage.setItem('reeldownloader-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  async function copyLink() {
    await navigator.clipboard?.writeText(url)
    setMessage(copy.copyDone)
  }

  async function sharePage() {
    if (navigator.share) await navigator.share({ title: 'ReelDownloaderNow', text: copy.shareText, url: window.location.href })
    else await copyLink()
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt()
      setInstallPrompt(null)
    } else window.alert(copy.installHelp)
  }

  if (legalPage) return <div className="app-shell legal-page"><header className="site-header"><a className="brand" href="/" aria-label="ReelDownloaderNow home"><img className="brand-logo brand-icon-only" src="/Icon.png" alt="" /><span>ReelDownloader<b>Now</b></span></a><a className="back-link" href="/">← Back to downloader</a></header><main><article className="legal-content"><p className="eyebrow">REELDOWNLOADERNOW</p><h1>{legalPage.title}</h1>{legalPage.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article></main></div>

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const isInstagramUrl = /instagram\.com\/(reel|p|tv|stories)\//i.test(url)
    if (!isInstagramUrl) {
      setStatus('error')
      setMessage(copy.invalidLink)
      return
    }
    setMessage('')
    setPreview(null)
    setStatus('previewing')
    try {
      const response = await fetch(`${API_BASE_URL}/api/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.detail || copy.previewFailed)
      }
      setPreview(await response.json())
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Preview failed. Please try again.')
      captureError(error)
    }
  }

  async function handleDownload() {
    setStatus('downloading')
    setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.detail || copy.downloadFailed)
      }
      const contentType = response.headers.get('content-type') || ''
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      const extension = contentType.includes('zip') ? 'zip' : contentType.includes('image') ? 'jpg' : 'mp4'
      anchor.download = `reeldownloadernow.${extension}`
      anchor.click()
      URL.revokeObjectURL(objectUrl)
      setStatus('ready')
      setMessage(copy.downloaded)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Download failed. Please try again.')
      captureError(error)
    }
  }

  return (
    <div className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
      <header className="site-header">
        <a className="brand" href="/" aria-label="ReelDownloaderNow home"><img className="brand-logo brand-logo-light brand-icon-only" src="/Icon.png" alt="" /><img className="brand-logo brand-logo-dark brand-icon-only" src="/LogoLight.png" alt="" /><span className="brand-name">ReelDownloader<b>Now</b></span></a>
        <nav aria-label="Main navigation"><a href="#how-it-works">{copy.navHow}</a><a href="#faq">{copy.navFaq}</a><label className="language-select-label" htmlFor="language-select"><span>Language</span><select id="language-select" value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Select language">{Object.entries(translations).map(([code, item]) => <option key={code} value={code}>{item.languageName}</option>)}</select></label><button className="theme-button" type="button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>{darkMode ? '☼' : '◐'}</button><button className="install-button" type="button" onClick={installApp}>{copy.install}</button></nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow"><span className="live-dot" /> {copy.eyebrow}</p>
            <h1>{seoPage ? <>{copy.seoTitle}<br /><em>{copy.heroAccent}</em></> : <>{copy.heroTitle}<br /><em>{copy.heroAccent}</em></>}</h1>
            <p className="hero-intro">{seoPage ? copy.seoDescription : copy.heroIntro}</p>
            <form className="download-form" onSubmit={handleSubmit}>
              <div className="field-heading"><label htmlFor="instagram-url">{copy.linkLabel}</label><div><button type="button" onClick={copyLink} disabled={!url}>{copy.copy}</button><button type="button" onClick={sharePage}>{copy.share}</button></div></div>
              <div className={`input-row ${status === 'error' ? 'has-error' : ''}`}>
                <span className="link-icon" aria-hidden="true">↗</span>
                <input id="instagram-url" type="url" placeholder={copy.linkPlaceholder} value={url} onChange={(event) => { setUrl(event.target.value); setStatus('idle'); setMessage('') }} />
                {url && <button type="button" className="clear-button" aria-label="Clear link" onClick={() => setUrl('')}>×</button>}
                <button className="download-button" type="submit" disabled={status === 'previewing' || status === 'downloading'}>{status === 'previewing' ? copy.checking : copy.preview} <span>→</span></button>
              </div>
              {status === 'error' && <p className="form-message error-message">{message}</p>}
              {status === 'error' && <button className="retry-button" type="button" onClick={() => { if (preview) void handleDownload(); else { setStatus('idle'); setMessage('') } }}>{copy.retry}</button>}
              {status === 'downloading' && <p className="form-message success-message">{copy.downloading}</p>}
              {status === 'ready' && message && <p className="form-message success-message">{message}</p>}
            </form>
            {preview && <div className="preview-panel"><div className="preview-thumb">{preview.thumbnail ? <img src={preview.thumbnail} alt="" /> : <span>✦</span>}</div><div className="preview-info"><strong>{preview.title}</strong><span>@{preview.creator} · {preview.media_type} {preview.items > 1 ? `· ${preview.items} items` : ''}</span><span>{preview.duration ? `${Math.round(preview.duration)} sec` : 'Ready to save'}{preview.filesize ? ` · ${(preview.filesize / 1024 / 1024).toFixed(1)} MB` : ''}</span></div><select aria-label="Download format" value={format} onChange={(event) => setFormat(event.target.value)}>{preview.media_type === 'video' && <><option value="360p">MP4 · 360p</option><option value="720p">MP4 · 720p</option><option value="1080p">MP4 · 1080p</option></>}{preview.media_type === 'image' && <option value="original">Original image</option>}{preview.media_type === 'carousel' && <option value="zip">ZIP carousel</option>}</select><button className="preview-download" type="button" onClick={handleDownload} disabled={status === 'downloading'}>{status === 'downloading' ? 'Downloading...' : 'Download'} <span>↓</span></button></div>}
            <div className="trust-row"><span>{copy.noLogin}</span><span>{copy.free}</span><span>{copy.publicOnly}</span></div>
          </div>
          <div className="hero-art" aria-label="Preview of a saved reel" role="img"><div className="sun-disc" /><div className="art-card back-card" /><div className="art-card main-card"><div className="reel-profile"><span className="profile-avatar">R</span><span><strong>{preview?.creator || 'reeldownloadernow'}</strong><small>Original audio</small></span><b>•••</b></div><div className="art-scene">{preview?.thumbnail ? <img src={preview.thumbnail} alt="Instagram media preview" /> : <div className="scene-placeholder"><span className="scene-spark">✦</span><span className="scene-word">stay<br />curious</span></div>}<span className="play-button">▶</span></div><div className="reel-actions"><span>♡</span><span>◌</span><span>↗</span><span>⋮</span></div><div className="art-bottom"><strong>{preview?.title || 'Make space for good things.'}</strong><small>♡ 2,481 likes · 2 hours ago</small></div></div><div className="format-pill"><span className="file-icon">↓</span><span><strong>{format === 'original' ? 'Original image' : format === 'zip' ? 'ZIP carousel' : `MP4 · ${format}`}</strong><small>choose after preview</small></span><button type="button" aria-label="Cycle format" onClick={() => setFormat(format === '1080p' ? '720p' : format === '720p' ? '360p' : '1080p')}>⌄</button></div><span className="scribble">made<br />for keeps</span></div>
        </section>

        <section className="stats-strip"><div><strong>{copy.stats[0]}</strong><span>{copy.stats[1]}</span></div><div><strong>{copy.stats[2]}</strong><span>{copy.stats[3]}</span></div><div><strong>{copy.stats[4]}</strong><span>{copy.stats[5]}</span></div></section>
        <section className="steps-section" id="how-it-works"><div className="section-heading"><p className="eyebrow">{copy.stepsEyebrow}</p><h2>{copy.stepsTitle}</h2></div><div className="steps-grid">{copy.steps.map(([title, description], index) => <article key={title}><span className="step-number">0{index + 1}</span><div className="step-icon">{index === 0 ? '↗' : index === 1 ? '✦' : '↓'}</div><h3>{title}</h3><p>{description}</p></article>)}</div></section>
        <section className="notice-section" id="responsible-use"><span className="notice-mark">i</span><p>{copy.responsible}</p><a href="#faq">{copy.responsibleLink} <span>→</span></a></section>
        <nav className="seo-links" aria-label="Downloader tools">{copy.seoLinks.map((link, index) => <a key={link} href={['/instagram-reel-downloader', '/instagram-video-downloader', '/instagram-photo-downloader', '/instagram-story-downloader', '/instagram-igtv-downloader'][index]}>{link}</a>)}</nav>
        <section className="content-section" aria-labelledby="about-title"><p className="eyebrow">{copy.aboutEyebrow}</p><h2 id="about-title">{copy.aboutTitle}</h2><p>{copy.aboutParagraphs[0]}</p><p>{copy.aboutParagraphs[1]}</p><div className="keyword-list">{copy.seoLinks.map((link) => <span key={link}>{link}</span>)}</div></section>
        <section className="faq-section" id="faq" aria-labelledby="faq-title"><div className="section-heading"><p className="eyebrow">{copy.faqEyebrow}</p><h2 id="faq-title">{copy.faqTitle}</h2></div><div className="faq-list">{copy.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
      </main>
      <footer><span>© 2024 ReelDownloaderNow</span><span>Fast, free & community trusted.</span><span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/dmca">Copyright</a></span></footer>
    </div>
  )
}

export default App
