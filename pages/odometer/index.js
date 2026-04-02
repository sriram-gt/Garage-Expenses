import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { getVehicles, getOdometerLogs, addOdometerLog, getLatestOdometer } from '../../lib/db'
import Layout from '../../components/Layout'
import { Btn, Modal, Field, Input, Textarea, fmtKm } from '../../components/ui'

export default function OdometerPage() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const { vid } = router.query
  const [vehicles, setVehicles] = useState([])
  const [selVid, setSelVid]     = useState('')
  const [logs, setLogs]         = useState([])
  const [latestOdo, setLatestOdo] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [form, setForm] = useState({ reading:'', date:new Date().toISOString().split('T')[0], note:'' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  useEffect(() => {
    if (!user) return
    getVehicles(user.uid).then(async vs => {
      setVehicles(vs)
      const init = vid || vs[0]?.id || ''
      setSelVid(init)
      if (init) await loadLogs(init)
      setDataLoading(false)
    })
  }, [user, vid])

  async function loadLogs(id) {
    const [allLogs, latest] = await Promise.all([getOdometerLogs(user.uid, id), getLatestOdometer(user.uid, id)])
    setLogs([...allLogs].reverse())
    setLatestOdo(latest)
  }

  async function changeVehicle(id) {
    setSelVid(id); setDataLoading(true)
    await loadLogs(id)
    setDataLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault(); setError('')
    const reading = parseFloat(form.reading)
    if (latestOdo && reading < latestOdo.reading) return setError(`Reading must be ≥ current (${latestOdo.reading.toLocaleString('en-IN')} km).`)
    if (latestOdo && (reading - latestOdo.reading) > 3000) {
      const days = Math.max(1, Math.round((new Date(form.date)-new Date(latestOdo.date))/86400000))
      if ((reading-latestOdo.reading)/days > 1500) return setError(`⚠️ Unrealistic jump detected. Please verify your reading.`)
    }
    setBusy(true)
    try {
      await addOdometerLog(user.uid, selVid, { ...form, reading })
      await loadLogs(selVid)
      setShowAdd(false); setBusy(false)
      setForm({ reading:'', date:new Date().toISOString().split('T')[0], note:'' })
    } catch { setError('Failed to save.'); setBusy(false) }
  }

  if (loading || !user) return null

  // Driving stats
  const totalKm = logs.length>=2 ? logs[0].reading - logs[logs.length-1].reading : 0
  const avgDailyKm = (() => {
    if (logs.length < 2) return 0
    const days = Math.max(1, Math.round((new Date(logs[0].date)-new Date(logs[logs.length-1].date))/86400000))
    return (totalKm/days).toFixed(1)
  })()

  return (
    <Layout title="Odometer" subtitle={vehicles.find(v=>v.id===selVid)?.name||''}
      actions={
        <div style={{ display:'flex', gap:'8px' }}>
          {vehicles.length>0 && (
            <select value={selVid} onChange={e=>changeVehicle(e.target.value)} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-md)', padding:'8px 14px', color:'var(--text)', fontSize:'13px', cursor:'pointer' }}>
              {vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <Btn onClick={()=>setShowAdd(true)}>+ Update Odometer</Btn>
        </div>
      }
    >
      {/* Current + stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'12px', marginBottom:'24px' }}>
        {[
          { label:'Current Reading', value: latestOdo ? `${latestOdo.reading.toLocaleString('en-IN')} km` : '—', icon:'🛞', accent:'var(--accent)' },
          { label:'Total Logged',    value: logs.length,                                                               icon:'📋', accent:'var(--accent3)' },
          { label:'Distance Driven', value: totalKm ? `${totalKm.toLocaleString('en-IN')} km` : '—',                 icon:'🗺️', accent:'var(--accent2)' },
          { label:'Avg Daily km',    value: avgDailyKm ? `${avgDailyKm} km/day` : '—',                               icon:'📅', accent:'var(--success)' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:s.accent }} />
            <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'8px' }}>{s.icon} {s.label}</div>
            <div style={{ fontSize:'22px', fontWeight:700, fontFamily:'var(--font-display)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px' }}>
        <h3 style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)', marginBottom:'20px' }}>Odometer History</h3>
        {dataLoading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--muted)' }}>Loading…</div>
        ) : logs.length===0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--muted)', fontSize:'14px' }}>
            No readings yet.{' '}
            <button onClick={()=>setShowAdd(true)} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontFamily:'inherit', fontSize:'14px' }}>Add first reading →</button>
          </div>
        ) : (
          <div style={{ position:'relative' }}>
            {/* Vertical line */}
            <div style={{ position:'absolute', left:'20px', top:'8px', bottom:'8px', width:'2px', background:'var(--border)', borderRadius:'1px' }} />
            <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
              {logs.map((log, i) => {
                const prev = logs[i+1]
                const kmDiff = prev ? log.reading - prev.reading : null
                const isUnusual = kmDiff && kmDiff > 800
                return (
                  <div key={log.id} className="animate-fadeUp" style={{ display:'flex', gap:'16px', alignItems:'flex-start', paddingBottom:'20px', animationDelay:`${i*40}ms`, opacity:0 }}>
                    {/* Dot */}
                    <div style={{ position:'relative', zIndex:1, flexShrink:0 }}>
                      <div style={{
                        width:'16px', height:'16px', borderRadius:'50%', marginTop:'2px',
                        background: i===0 ? 'var(--accent)' : 'var(--bg3)',
                        border: `2px solid ${i===0 ? 'var(--accent)' : 'var(--border2)'}`,
                        boxShadow: i===0 ? '0 0 0 4px rgba(232,255,71,0.15)' : 'none',
                        marginLeft:'13px',
                      }} />
                    </div>
                    {/* Content */}
                    <div style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'12px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <span style={{ fontSize:'18px', fontWeight:800, fontFamily:'var(--font-display)', color: i===0?'var(--accent)':'var(--text)' }}>
                            {log.reading.toLocaleString('en-IN')} km
                          </span>
                          {i===0 && <span style={{ fontSize:'10px', background:'rgba(232,255,71,0.15)', color:'var(--accent)', padding:'2px 8px', borderRadius:'100px', marginLeft:'10px', fontWeight:600 }}>CURRENT</span>}
                        </div>
                        <span style={{ fontSize:'12px', color:'var(--muted)' }}>{log.date}</span>
                      </div>
                      {log.note && <div style={{ fontSize:'12px', color:'var(--text2)', marginTop:'4px' }}>📝 {log.note}</div>}
                      {kmDiff !== null && (
                        <div style={{ marginTop:'6px', display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'11px', color: isUnusual ? 'var(--warning)' : 'var(--text2)', background: isUnusual ? 'rgba(251,191,36,0.1)' : 'var(--bg4)', padding:'2px 10px', borderRadius:'100px' }}>
                          {isUnusual ? '⚠️' : '↑'} +{kmDiff.toLocaleString('en-IN')} km from previous
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Update Odometer" onClose={()=>setShowAdd(false)} width="420px">
          {latestOdo && (
            <div style={{ background:'rgba(78,205,196,0.08)', border:'1px solid rgba(78,205,196,0.2)', borderRadius:'var(--radius-md)', padding:'11px 14px', fontSize:'12px', color:'var(--accent3)', marginBottom:'20px' }}>
              📍 Current reading: <strong>{latestOdo.reading.toLocaleString('en-IN')} km</strong> on {latestOdo.date}
            </div>
          )}
          {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'var(--radius-md)', padding:'11px 14px', color:'var(--danger)', fontSize:'13px', marginBottom:'16px' }}>{error}</div>}
          <form onSubmit={handleAdd}>
            <Field label="New Odometer Reading (km)" required>
              <Input type="number" min="0" value={form.reading} onChange={e=>setForm(f=>({...f,reading:e.target.value}))} placeholder={latestOdo?`> ${latestOdo.reading}`:'e.g. 25000'} required autoFocus />
            </Field>
            <Field label="Date" required>
              <Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required />
            </Field>
            <Field label="Note">
              <Input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="e.g. After long trip to Ooty" />
            </Field>
            <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
              <Btn type="button" variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
              <Btn type="submit" disabled={busy} style={{ flex:1 }}>{busy?'Saving…':'Update →'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  )
}
