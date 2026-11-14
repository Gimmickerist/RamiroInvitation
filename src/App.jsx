import { useEffect, useRef, useState } from 'react'
import './App.css'

const RSVP_ENDPOINT = import.meta.env.VITE_RSVP_ENDPOINT?.trim()

const EVENT_MONTH = 11 // December (0-indexed)
const EVENT_DAY = 25
const EVENT_HOUR = 10
const SECTIONS = [
  { id: 'event', label: 'Event', icon: '🎄' },
  { id: 'rsvp', label: 'RSVP', icon: '✉️' },
  { id: 'family', label: 'Family message', icon: '💌' },
  { id: 'location', label: 'Location', icon: '📍' },
]
const SNOWFLAKES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  size: 6 + ((i * 17) % 12),
  dur: 8 + ((i * 13) % 12),
  delay: -((i * 7) % 20),
  drift: ((i * 29) % 80) - 40,
}))

function getTarget() {
  const now = new Date()
  let t = new Date(now.getFullYear(), EVENT_MONTH, EVENT_DAY, EVENT_HOUR, 0, 0)
  // keep showing the event for the rest of Christmas Day
  const endOfDay = new Date(now.getFullYear(), EVENT_MONTH, EVENT_DAY, 23, 59, 59)
  if (now > endOfDay) t = new Date(now.getFullYear() + 1, EVENT_MONTH, EVENT_DAY, EVENT_HOUR, 0, 0)
  return t
}

function getSectionFromHash() {
  const hash = window.location.hash.slice(1)
  if (hash === 'rsvp') return 'rsvp'
  if (hash === 'family' || hash === 'welcome-title') return 'family'
  if (hash === 'location' || hash === 'directions-title') return 'location'
  return 'event'
}

function useCountdown() {
  const [target] = useState(getTarget)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, target.getTime() - now)
  return {
    target,
    done: diff === 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function Snow() {
  return (
    <div className="snow" aria-hidden="true">
      {SNOWFLAKES.map((f) => (
        <span
          key={f.id}
          style={{
            left: `${f.left}%`,
            fontSize: f.size,
            animationDuration: `${f.dur}s`,
            animationDelay: `${f.delay}s`,
            '--drift': `${f.drift}px`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  )
}

function Lights() {
  return (
    <div className="lights" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 6) * 0.25}s` }} />
      ))}
    </div>
  )
}

function downloadCalendar() {
  const t = getTarget()
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const end = new Date(t.getTime() + 4 * 3600000)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ramiro Reunion//EN',
    'BEGIN:VEVENT',
    `UID:ramiro-reunion-${t.getFullYear()}@invite`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(t)}`,
    `DTEND:${fmt(end)}`,
    'SUMMARY:Have a Holly Jolly Ramiro Reunion Christmas',
    'DESCRIPTION:Ramiro family reunion Christmas celebration!',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'ramiro-reunion-christmas.ics'
  a.click()
  URL.revokeObjectURL(url)
}

function App() {
  const c = useCountdown()
  const [activeSection, setActiveSection] = useState(getSectionFromHash)
  const tabRefs = useRef([])
  const [rsvpName, setRsvpName] = useState('')
  const [attendingCount, setAttendingCount] = useState('1')
  const [rsvpStatus, setRsvpStatus] = useState('attending')
  const [rsvpNote, setRsvpNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const units = [
    ['Days', c.days],
    ['Hours', c.hours],
    ['Minutes', c.minutes],
    ['Seconds', c.seconds],
  ]

  const selectSection = (section) => {
    setActiveSection(section)
  }

  const handleTabKeyDown = (event, currentIndex) => {
    let nextIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % SECTIONS.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + SECTIONS.length) % SECTIONS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = SECTIONS.length - 1
    else return

    event.preventDefault()
    tabRefs.current[nextIndex]?.focus()
    selectSection(SECTIONS[nextIndex].id)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const name = rsvpName.trim()
    if (!RSVP_ENDPOINT) {
      setSubmitError('RSVP is not connected yet. Please try again later.')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    setSubmitted(false)
    try {
      await fetch(RSVP_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          name,
          attendingCount: Number(attendingCount),
          status: rsvpStatus,
          message: rsvpNote.trim(),
        }),
      })

      setSubmitted(true)
      setRsvpName('')
      setAttendingCount('1')
      setRsvpStatus('attending')
      setRsvpNote('')
    } catch (error) {
      console.error('Unable to submit RSVP:', error)
      setSubmitError('We could not submit your RSVP. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <Snow />
      <Lights />

      <header className="hero">
        <div className="hero-content">
          <p className="eyebrow">🎄 You're Invited 🎄</p>
          <h1>
            Have a <span className="holly">Holly Jolly</span> Ramiro Reunion Christmas
          </h1>
          <p className="date-pill">📅 December 25 &nbsp;•&nbsp; 🕙 10:00 AM</p>
          <button className="btn hero-rsvp" onClick={() => selectSection('rsvp')}>
            RSVP now <span aria-hidden="true">↓</span>
          </button>
        </div>
      </header>

      <nav className="section-tabs" role="tablist" aria-label="Invitation sections">
        {SECTIONS.map(({ id, label, icon }, index) => (
          <button
            key={id}
            ref={(element) => { tabRefs.current[index] = element }}
            id={`tab-${id}`}
            className="section-tab"
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            aria-controls="invitation-panel"
            tabIndex={activeSection === id ? 0 : -1}
            onClick={() => selectSection(id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main
        id="invitation-panel"
        className="invitation-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeSection}`}
        tabIndex={0}
      >
        {activeSection === 'event' && (
          <>
            <section className="countdown card" aria-labelledby="countdown-title">
              <div className="section-heading">
                <p className="section-kicker">The celebration begins in</p>
                <h2 id="countdown-title">{c.done ? '🎉 Merry Christmas! 🎉' : 'Our Christmas countdown'}</h2>
              </div>
              <div className="timer" aria-label="Time remaining until Christmas Day">
                {units.map(([label, val]) => (
                  <div key={label} className="tile">
                    <strong>{String(val).padStart(2, '0')}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary" onClick={downloadCalendar}>
                <span aria-hidden="true">＋</span> Add to my calendar
              </button>
            </section>

            <section className="details-section" aria-labelledby="details-title">
              <div className="section-heading">
                <p className="section-kicker">Everything you need to know</p>
                <h2 id="details-title">A few festive details</h2>
              </div>
              <div className="grid">
                <article className="card info">
                  <div className="icon" aria-hidden="true">🎨</div>
                  <h3>Theme</h3>
                  <p>Placeholder</p>
                </article>
                <article className="card info">
                  <div className="icon" aria-hidden="true">🗓️</div>
                  <h3>When</h3>
                  <p>December 25, 10:00 AM</p>
                </article>
                <article className="card info">
                  <div className="icon" aria-hidden="true">🎁</div>
                  <h3>What to Bring</h3>
                  <p>Placeholder</p>
                </article>
                <article className="card info">
                  <div className="icon" aria-hidden="true">👗</div>
                  <h3>What to Wear</h3>
                  <p>To be announced</p>
                </article>
              </div>
            </section>
          </>
        )}

        {activeSection === 'rsvp' && (
          <section className="card rsvp" aria-labelledby="rsvp-title">
            <div className="section-heading">
              <p className="section-kicker">Let us know</p>
              <h2 id="rsvp-title">RSVP</h2>
            </div>
            <form className="rsvp-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={rsvpName}
                  onChange={(event) => setRsvpName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </label>
              <label className="field">
                <span>How many will attend?</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={attendingCount}
                  onChange={(event) => setAttendingCount(event.target.value)}
                  placeholder="1"
                  required
                />
              </label>
              <fieldset className="field rsvp-fieldset">
                <legend>Will you be joining us?</legend>
                <div className="rsvp-options">
                  <label className="choice">
                    <input
                      type="radio"
                      name="rsvp-status"
                      checked={rsvpStatus === 'attending'}
                      onChange={() => setRsvpStatus('attending')}
                    />
                    Yes
                  </label>
                  <label className="choice">
                    <input
                      type="radio"
                      name="rsvp-status"
                      checked={rsvpStatus === 'declined'}
                      onChange={() => setRsvpStatus('declined')}
                    />
                    No
                  </label>
                </div>
              </fieldset>
              <label className="field">
                <span>Message (optional)</span>
                <textarea
                  rows="4"
                  value={rsvpNote}
                  onChange={(event) => setRsvpNote(event.target.value)}
                  placeholder="Add a note for the family"
                />
              </label>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send RSVP'}
              </button>
              {submitted && (
                <p className="success" role="status">
                  Thanks! Your RSVP request was sent. The page cannot confirm Google’s response, so contact the family if you need confirmation.
                </p>
              )}
              {submitError && (
                <p className="rsvp-error" role="alert">
                  {submitError}
                </p>
              )}
            </form>
          </section>
        )}

        {activeSection === 'family' && (
          <section className="card welcome" aria-labelledby="welcome-title">
            <div className="welcome-mark" aria-hidden="true">❝</div>
            <p className="section-kicker">A message from our family</p>
            <h2 id="welcome-title">Maligayang Pasko!</h2>
            <p className="welcome-copy">
              Maligayang pasko sa inyong lahat! Malugod naming ipagpapatuloy ang tradisyon ng pagkakaroon ng reunion tuwing ika 25 ng Disyembre. Kaya't inaanyayahan namin kayong lahat na makisaya sa aming Christmas Reunion. Huwag kalimutang magdala ng inyong mga regalo at maghanda para sa isang masayang pagtitipon kasama ang buong pamilya.
            </p>
          </section>
        )}

        {activeSection === 'location' && (
          <section className="card directions" aria-labelledby="directions-title">
            <div className="section-heading">
              <p className="section-kicker">We can't wait to see you</p>
              <h2 id="directions-title">Find your way to the festivities</h2>
            </div>
            <div className="directions-layout">
              <div className="directions-copy">
                <span className="location-icon" aria-hidden="true">📍</span>
                <h3>Talipan, Pagbilao, Quezon</h3>
                <p>Plan your trip and get directions with Google Maps.</p>
                <a
                  className="btn"
                  href="https://maps.app.goo.gl/FhYwRRE13xaUVpXr9"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="map-frame">
                <iframe
                  title="Google Maps Street View for the reunion location"
                  src="https://www.google.com/maps/embed?pb=!4v1794662950201!6m8!1m7!1s55n1VWzkVF2Ij2F7drRb6A!2m2!1d13.96345277790822!2d121.652011909449!3f310.76616545764193!4f19.336956330118213!5f0.7820865974627469"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <span aria-hidden="true">✦</span>
        <p>Made with love for the holidays</p>
        <strong>From the Ramiro Family</strong>
        <span aria-hidden="true">✦</span>
      </footer>
    </div>
  )
}

export default App
