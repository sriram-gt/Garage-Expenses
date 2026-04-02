import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

const IS = {
  width: '100%',
  background: '#18181d',
  border: '1px solid #252530',
  borderRadius: '10px',
  padding: '12px 16px',
  color: '#ededf0',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
}
const focus = e => e.target.style.borderColor = '#e8ff47'
const blur  = e => e.target.style.borderColor = '#252530'

export default function AuthPage() {
  const router         = useRouter()
  const { user, loading } = useAuth()
  const [tab, setTab]  = useState('signin')   // 'signin' | 'signup'
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  // Already signed in → go to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0a0a0c' }}>
      <div className="animate-pulse" style={{ color:'#5c5c70', fontSize:'14px' }}>Loading…</div>
    </div>
  )
  if (user) return null

  function setField(k, v) { setForm(f=>({...f,[k]:v})); setError('') }

  function friendlyError(code) {
    const map = {
      'auth/invalid-credential':       'Invalid email or password.',
      'auth/user-not-found':           'No account found with this email.',
      'auth/wrong-password':           'Incorrect password.',
      'auth/email-already-in-use':     'An account with this email already exists.',
      'auth/weak-password':            'Password must be at least 6 characters.',
      'auth/invalid-email':            'Please enter a valid email address.',
      'auth/popup-closed-by-user':     'Google sign-in was cancelled.',
      'auth/network-request-failed':   'Network error. Check your connection.',
    }
    return map[code] || 'Something went wrong. Please try again.'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (tab === 'signup') {
      if (!form.name.trim())           return setError('Please enter your name.')
      if (form.password !== form.confirm) return setError('Passwords do not match.')
      if (form.password.length < 6)    return setError('Password must be at least 6 characters.')
    }
    setBusy(true)
    try {
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, form.email, form.password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
        await updateProfile(cred.user, { displayName: form.name.trim() })
      }
      router.push('/dashboard')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleBusy(true)
    try {
      await signInWithPopup(auth, googleProvider)
      router.push('/dashboard')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#0a0a0c' }}>
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div style={{
        flex: '0 0 420px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px',
        borderRight: '1px solid #1f1f26',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow blobs */}
        <div style={{ position:'absolute', top:'-80px', left:'-80px', width:'320px', height:'320px', background:'radial-gradient(circle, rgba(232,255,71,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-60px', right:'-60px', width:'260px', height:'260px', background:'radial-gradient(circle, rgba(255,107,53,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div className="animate-fadeUp" style={{ width:'100%', maxWidth:'340px' }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'40px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'#e8ff47', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>🚗</div>
            <div>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:'22px', fontWeight:800, letterSpacing:'0.3px', color:'#ededf0' }}>GarageLog</div>
              <div style={{ fontSize:'11px', color:'#5c5c70' }}>Your personal car finance tracker</div>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display:'flex', background:'#18181d', borderRadius:'12px', padding:'4px', marginBottom:'28px', border:'1px solid #252530' }}>
            {[['signin','Sign In'],['signup','Create Account']].map(([key,label]) => (
              <button key={key} onClick={() => { setTab(key); setError('') }} style={{
                flex:1, padding:'9px', borderRadius:'9px', border:'none',
                background: tab===key ? '#e8ff47' : 'transparent',
                color: tab===key ? '#0a0a0c' : '#5c5c70',
                fontSize:'13px', fontWeight:700, cursor:'pointer',
                fontFamily:'inherit', transition:'all 0.2s',
              }}>{label}</button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'10px', padding:'11px 14px', color:'#f87171', fontSize:'13px', marginBottom:'18px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <div style={{ marginBottom:'14px' }}>
                <label style={LS}>Full Name</label>
                <input style={IS} onFocus={focus} onBlur={blur} value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="Arjun Sharma" required={tab==='signup'} />
              </div>
            )}
            <div style={{ marginBottom:'14px' }}>
              <label style={LS}>Email</label>
              <input style={IS} onFocus={focus} onBlur={blur} type="email" value={form.email} onChange={e=>setField('email',e.target.value)} placeholder="you@example.com" required />
            </div>
            <div style={{ marginBottom: tab==='signup'?'14px':'22px' }}>
              <label style={LS}>Password</label>
              <input style={IS} onFocus={focus} onBlur={blur} type="password" value={form.password} onChange={e=>setField('password',e.target.value)} placeholder="••••••••" required />
            </div>
            {tab === 'signup' && (
              <div style={{ marginBottom:'22px' }}>
                <label style={LS}>Confirm Password</label>
                <input style={IS} onFocus={focus} onBlur={blur} type="password" value={form.confirm} onChange={e=>setField('confirm',e.target.value)} placeholder="••••••••" required />
              </div>
            )}

            <button type="submit" disabled={busy} style={{
              width:'100%', background: busy?'#252530':'#e8ff47', color:'#0a0a0c',
              border:'none', borderRadius:'10px', padding:'13px',
              fontSize:'14px', fontWeight:800, cursor: busy?'not-allowed':'pointer',
              fontFamily:'inherit', transition:'all 0.15s', letterSpacing:'0.2px',
            }}>
              {busy ? (tab==='signin'?'Signing in…':'Creating account…') : (tab==='signin'?'Sign In →':'Create Account →')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'20px 0' }}>
            <div style={{ flex:1, height:'1px', background:'#252530' }} />
            <span style={{ fontSize:'12px', color:'#5c5c70' }}>or continue with</span>
            <div style={{ flex:1, height:'1px', background:'#252530' }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={googleBusy} style={{
            width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
            padding:'12px', borderRadius:'10px', border:'1px solid #32323f',
            background: googleBusy?'#18181d':'#1f1f26', color:'#ededf0',
            fontSize:'14px', fontWeight:600, cursor: googleBusy?'not-allowed':'pointer',
            fontFamily:'inherit', transition:'all 0.15s',
          }}
            onMouseEnter={e=>{ if(!googleBusy) e.currentTarget.style.borderColor='#e8ff47' }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='#32323f' }}
          >
            <GoogleIcon />
            {googleBusy ? 'Signing in with Google…' : 'Continue with Google'}
          </button>

          <p style={{ marginTop:'24px', fontSize:'12px', color:'#5c5c70', textAlign:'center', lineHeight:1.6 }}>
            By continuing, you agree that your vehicle data is stored securely in your personal account and is not shared with anyone.
          </p>
        </div>
      </div>

      {/* ── Right panel — hero ──────────────────────────────────── */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'60px 48px', position:'relative', overflow:'hidden',
      }}>
        {/* Background grid */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'linear-gradient(#1f1f26 1px, transparent 1px), linear-gradient(90deg, #1f1f26 1px, transparent 1px)',
          backgroundSize:'40px 40px', opacity:0.4,
        }} />
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 60% 40%, rgba(232,255,71,0.05) 0%, transparent 60%)', pointerEvents:'none' }} />

        <div className="animate-fadeUp" style={{ position:'relative', maxWidth:'500px', textAlign:'center' }}>
          <div style={{ fontSize:'56px', marginBottom:'24px' }}>🚗</div>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:'38px', fontWeight:800, lineHeight:1.15, marginBottom:'20px', color:'#ededf0' }}>
            Track every rupee your car spends
          </h2>
          <p style={{ color:'#a0a0b0', fontSize:'15px', lineHeight:1.7, marginBottom:'40px' }}>
            Multi-vehicle support, fuel mileage tracking, smart insights, provider comparison, service reminders — all in one dashboard.
          </p>

          {/* Feature pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', justifyContent:'center', marginBottom:'40px' }}>
            {['⛽ Fuel Logs','📊 Analytics','🔧 Services','💸 Expenses','📈 Mileage Trends','⚡ Smart Insights'].map(f => (
              <div key={f} style={{ padding:'7px 16px', borderRadius:'100px', background:'#18181d', border:'1px solid #252530', fontSize:'13px', color:'#a0a0b0' }}>{f}</div>
            ))}
          </div>

          {/* Mock stat row */}
          <div style={{ display:'flex', gap:'16px', justifyContent:'center' }}>
            {[['₹1.2L','Annual spend tracked'],['12.4 km/L','Avg mileage tracked'],['3 vehicles','Per account'],].map(([v,l])=>(
              <div key={l} style={{ background:'#111114', border:'1px solid #252530', borderRadius:'14px', padding:'16px 20px', textAlign:'center' }}>
                <div style={{ fontSize:'20px', fontWeight:800, color:'#e8ff47', fontFamily:'Syne, sans-serif' }}>{v}</div>
                <div style={{ fontSize:'11px', color:'#5c5c70', marginTop:'4px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
    </svg>
  )
}

const LS = {
  display:'block', fontSize:'11px', fontWeight:600, color:'#5c5c70',
  textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'7px',
}
