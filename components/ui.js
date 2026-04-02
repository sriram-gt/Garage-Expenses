// ─── Shared UI primitives ────────────────────────────────────────────────────

export const C = '₹' // currency symbol

// ── Button ──────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', style: extra = {}, type = 'button', disabled }) {
  const sizes = { sm: '7px 14px', md: '10px 20px', lg: '13px 28px' }
  const fonts = { sm: '12px', md: '14px', lg: '15px' }
  const vars = {
    primary:  { bg: 'var(--accent)',  color: '#0a0a0c', border: 'none' },
    secondary:{ bg: 'var(--bg3)',     color: 'var(--text)', border: '1px solid var(--border2)' },
    danger:   { bg: 'rgba(248,113,113,0.15)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.3)' },
    ghost:    { bg: 'transparent',    color: 'var(--text2)', border: '1px solid var(--border)' },
    success:  { bg: 'rgba(74,222,128,0.15)', color: 'var(--success)', border: '1px solid rgba(74,222,128,0.3)' },
  }
  const v = vars[variant] || vars.primary
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: sizes[size], fontSize: fonts[size], fontWeight: 600,
        borderRadius: 'var(--radius-md)', border: v.border,
        background: disabled ? 'var(--bg3)' : v.bg,
        color: disabled ? 'var(--muted)' : v.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
        ...extra,
      }}
      onMouseEnter={e => { if (!disabled && variant !== 'primary') e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      {children}
    </button>
  )
}

// ── Input field ─────────────────────────────────────────────────────────────
export function Field({ label, hint, children, required }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '7px' }}>
          {label}{required && <span style={{ color: 'var(--danger)', marginLeft: '3px' }}>*</span>}
        </label>
      )}
      {children}
      {hint && <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '5px' }}>{hint}</p>}
    </div>
  )
}

export const inputStyle = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '10px 14px',
  color: 'var(--text)', fontSize: '14px', outline: 'none',
  transition: 'border-color 0.2s',
}
export function focusAccent(e) { e.target.style.borderColor = 'var(--accent)' }
export function blurReset(e)   { e.target.style.borderColor = 'var(--border)' }

export function Input(props) {
  return <input style={inputStyle} onFocus={focusAccent} onBlur={blurReset} {...props} />
}
export function Select({ children, ...props }) {
  return (
    <select style={{ ...inputStyle, cursor: 'pointer' }} onFocus={focusAccent} onBlur={blurReset} {...props}>
      {children}
    </select>
  )
}
export function Textarea(props) {
  return <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} onFocus={focusAccent} onBlur={blurReset} {...props} />
}

// ── Stat card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = 'var(--accent)', icon, delay = 0, onClick }) {
  return (
    <div
      className="animate-fadeUp"
      onClick={onClick}
      style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 22px',
        animationDelay: `${delay}ms`, opacity: 0,
        position: 'relative', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = accent }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</span>
        {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '5px' }}>{sub}</div>}
    </div>
  )
}

// ── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = '500px' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-fadeUp" style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-xl)', padding: '28px',
        width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Badge / chip ─────────────────────────────────────────────────────────────
export function Badge({ children, color = 'var(--text2)', bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600,
      background: bg || `${color}18`, color,
    }}>{children}</span>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon = '📭', title, body, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>{title}</h3>
      {body && <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '20px' }}>{body}</p>}
      {action}
    </div>
  )
}

// ── Section title ──────────────────────────────────────────────────────────
export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)' }}>{children}</h3>
      {action}
    </div>
  )
}

// ── Alert / insight card ──────────────────────────────────────────────────
export function InsightCard({ icon, text, type = 'info', delay = 0 }) {
  const colors = {
    info:    { bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.2)',   color: 'var(--info)' },
    warning: { bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.25)',  color: 'var(--warning)' },
    success: { bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.2)',   color: 'var(--success)' },
    danger:  { bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.25)', color: 'var(--danger)' },
  }
  const c = colors[type] || colors.info
  return (
    <div className="animate-fadeUp" style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-md)', padding: '13px 16px',
      animationDelay: `${delay}ms`, opacity: 0,
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}

// ── Tooltip for charts ────────────────────────────────────────────────────
export function ChartTooltip({ active, payload, label, format = v => `${C}${Number(v).toLocaleString('en-IN',{maximumFractionDigits:0})}` }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border2)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '13px',
    }}>
      {label && <div style={{ color: 'var(--muted)', marginBottom: '6px', fontSize: '11px' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: i > 0 ? '4px' : 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ color: 'var(--text2)' }}>{p.name || ''}</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{format(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function fmtINR(v) {
  return `${C}${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`
}
export function fmtKm(v) {
  return `${Number(v||0).toLocaleString('en-IN')} km`
}
