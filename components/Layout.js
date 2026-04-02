import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getVehicles } from '../lib/db'

const navSections = [
  {
    items: [
      { label: 'Dashboard', icon: '📊', href: '/dashboard' },
      { label: 'Analytics', icon: '📈', href: '/analytics' },
    ]
  },
  {
    title: 'MANAGE',
    items: [
      { label: 'Vehicles',  icon: '🚗', href: '/vehicles' },
      { label: 'Fuel Logs', icon: '⛽', href: '/fuel' },
      { label: 'Expenses',  icon: '💸', href: '/expenses' },
      { label: 'Services',  icon: '🔧', href: '/services' },
      { label: 'Odometer',  icon: '🛞', href: '/odometer' },
    ]
  },
]

export default function Layout({ children, title, subtitle, actions }) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [vehicles, setVehicles] = useState([])

  useEffect(() => {
    if (!user) return
    getVehicles(user.uid).then(setVehicles).catch(() => {})
  }, [user, router.pathname])

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  const isActive = href => router.pathname === href || router.pathname.startsWith(href + '/')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '230px', flexShrink: 0,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 12px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '4px 8px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🚗</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>GarageLog</div>
            <div style={{ fontSize: '10px', color: 'var(--muted)' }}>v2.0</div>
          </div>
        </div>

        {/* My Vehicles */}
        <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-md)', padding: '10px', marginBottom: '20px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>My Vehicles</div>
          {vehicles.length === 0 && <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '4px 8px' }}>No vehicles yet</div>}
          {vehicles.map(v => (
            <button key={v.id} onClick={() => router.push(`/vehicles/${v.id}`)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '7px 8px', borderRadius: '8px',
              border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
              color: 'var(--text2)', fontSize: '13px', transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '16px' }}>{v.fuelType === 'Electric' ? '⚡' : '🚗'}</span>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{v.regNumber}</div>
              </div>
            </button>
          ))}
          <button onClick={() => router.push('/vehicles/new')} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            width: '100%', padding: '6px 8px', marginTop: '4px',
            borderRadius: '8px', border: '1px dashed var(--border2)',
            background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: '12px', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)' }}
          >＋ Add vehicle</button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {navSections.map((sec, si) => (
            <div key={si} style={{ marginBottom: '8px' }}>
              {sec.title && <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.8px', textTransform: 'uppercase', padding: '4px 12px 6px' }}>{sec.title}</div>}
              {sec.items.map(item => {
                const active = isActive(item.href)
                return (
                  <button key={item.href} onClick={() => router.push(item.href)} style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    width: '100%', padding: '9px 12px', marginBottom: '2px',
                    borderRadius: 'var(--radius-md)', border: 'none',
                    background: active ? 'rgba(232,255,71,0.1)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    fontSize: '13px', fontWeight: active ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
                  >
                    <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '4px 8px 12px' }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} />
                : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#0a0a0c', flexShrink: 0 }}>
                    {(user.displayName||user.email||'?')[0].toUpperCase()}
                  </div>
              }
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName || 'User'}</div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
          >🚪 Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {(title || actions) && (
          <header style={{
            borderBottom: '1px solid var(--border)', padding: '18px 32px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 50,
          }}>
            <div>
              {title && <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>{title}</h1>}
              {subtitle && <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '2px' }}>{subtitle}</p>}
            </div>
            {actions && <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>{actions}</div>}
          </header>
        )}
        <main style={{ flex: 1, padding: '28px 32px' }}>{children}</main>
      </div>
    </div>
  )
}
