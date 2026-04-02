import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { getVehicles, getServices, addService, deleteService, getLatestOdometer, SERVICE_TYPES } from '../../lib/db'
import Layout from '../../components/Layout'
import { Btn, Modal, Field, Input, Select, Textarea, fmtINR } from '../../components/ui'

export default function ServicesPage() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const { vid } = router.query
  const [vehicles, setVehicles] = useState([])
  const [selVid, setSelVid]     = useState('')
  const [services, setServices] = useState([])
  const [latestOdo, setLatestOdo] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [delId, setDelId]       = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [form, setForm] = useState({
    serviceType:'Oil Change', cost:'', date:new Date().toISOString().split('T')[0],
    odometer:'', intervalKm:'5000', notes:'',
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    getVehicles(user.uid).then(async vs => {
      setVehicles(vs)
      const init = vid || vs[0]?.id || ''
      setSelVid(init)
      if (init) {
        const [svcs, odo] = await Promise.all([getServices(user.uid, init), getLatestOdometer(user.uid, init)])
        setServices(svcs); setLatestOdo(odo)
        if (odo) setForm(f=>({...f, odometer: String(odo.reading)}))
      }
      setDataLoading(false)
    })
  }, [user, vid])

  async function changeVehicle(id) {
    setSelVid(id); setDataLoading(true)
    const [svcs, odo] = await Promise.all([getServices(user.uid, id), getLatestOdometer(user.uid, id)])
    setServices(svcs); setLatestOdo(odo)
    if (odo) setForm(f=>({...f, odometer: String(odo.reading)}))
    setDataLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault(); setBusy(true)
    await addService(user.uid, selVid, form)
    setServices(await getServices(user.uid, selVid))
    setShowAdd(false); setBusy(false)
    setForm({ serviceType:'Oil Change', cost:'', date:new Date().toISOString().split('T')[0], odometer: latestOdo ? String(latestOdo.reading) : '', intervalKm:'5000', notes:'' })
  }

  async function handleDelete(id) {
    await deleteService(user.uid, id)
    setServices(sv => sv.filter(s=>s.id!==id))
    setDelId(null)
  }

  if (loading || !user) return null

  const totalCost = services.reduce((s,sv)=>s+sv.cost, 0)

  // Next service calc for latest
  const latest = services[0]
  const currentOdo = latestOdo?.reading || 0
  const nextServiceIn = latest?.intervalKm ? (latest.odometer + latest.intervalKm) - currentOdo : null

  return (
    <Layout title="Services" subtitle={vehicles.find(v=>v.id===selVid)?.name||''}
      actions={
        <div style={{ display:'flex', gap:'8px' }}>
          {vehicles.length>0 && (
            <select value={selVid} onChange={e=>changeVehicle(e.target.value)} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-md)', padding:'8px 14px', color:'var(--text)', fontSize:'13px', cursor:'pointer' }}>
              {vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <Btn onClick={()=>setShowAdd(true)}>+ Log Service</Btn>
        </div>
      }
    >
      {/* Stats + next service alert */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'12px', marginBottom:'20px' }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'16px 18px' }}>
          <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'6px' }}>📋 Total Services</div>
          <div style={{ fontSize:'22px', fontWeight:700, fontFamily:'var(--font-display)' }}>{services.length}</div>
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'16px 18px' }}>
          <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'6px' }}>💰 Total Cost</div>
          <div style={{ fontSize:'22px', fontWeight:700, fontFamily:'var(--font-display)' }}>{fmtINR(totalCost)}</div>
        </div>
        {nextServiceIn !== null && (
          <div style={{
            background: nextServiceIn<=0 ? 'rgba(248,113,113,0.08)' : nextServiceIn<500 ? 'rgba(251,191,36,0.08)' : 'rgba(74,222,128,0.08)',
            border: `1px solid ${nextServiceIn<=0 ? 'rgba(248,113,113,0.3)' : nextServiceIn<500 ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}`,
            borderRadius:'var(--radius-md)', padding:'16px 18px',
          }}>
            <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'6px' }}>🔧 Next Service</div>
            <div style={{ fontSize:'18px', fontWeight:700, color: nextServiceIn<=0?'var(--danger)':nextServiceIn<500?'var(--warning)':'var(--success)' }}>
              {nextServiceIn<=0 ? `Overdue by ${Math.abs(nextServiceIn).toLocaleString('en-IN')} km` : `In ${nextServiceIn.toLocaleString('en-IN')} km`}
            </div>
            <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'4px' }}>{latest?.serviceType}</div>
          </div>
        )}
      </div>

      {/* Service list */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        {dataLoading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'var(--muted)' }}>Loading…</div>
        ) : services.length===0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'var(--muted)', fontSize:'14px' }}>
            No services logged yet.{' '}
            <button onClick={()=>setShowAdd(true)} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontFamily:'inherit', fontSize:'14px' }}>Log first service →</button>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Service Type','Date','Odometer','Interval','Cost','Notes',''].map(h=>(
                  <th key={h} style={{ padding:'12px 18px', textAlign:'left', color:'var(--muted)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.7px', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map((s,i)=>(
                <tr key={s.id} style={{ borderBottom:i<services.length-1?'1px solid var(--border)':'none' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <td style={{ padding:'12px 18px', fontWeight:600 }}>🔧 {s.serviceType}</td>
                  <td style={{ padding:'12px 18px', color:'var(--muted)' }}>{s.date}</td>
                  <td style={{ padding:'12px 18px', color:'var(--text2)' }}>{parseFloat(s.odometer||0).toLocaleString('en-IN')} km</td>
                  <td style={{ padding:'12px 18px', color:'var(--text2)' }}>{s.intervalKm ? `Every ${Number(s.intervalKm).toLocaleString('en-IN')} km` : '—'}</td>
                  <td style={{ padding:'12px 18px', fontWeight:700 }}>{fmtINR(s.cost)}</td>
                  <td style={{ padding:'12px 18px', color:'var(--text2)', maxWidth:'180px' }}><div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.notes||'—'}</div></td>
                  <td style={{ padding:'12px 18px' }}>
                    <button onClick={()=>setDelId(s.id)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'14px' }}
                      onMouseEnter={e=>e.currentTarget.style.color='var(--danger)'}
                      onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}
                    >🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Log Service" onClose={()=>setShowAdd(false)}>
          <form onSubmit={handleAdd}>
            <Field label="Service Type" required>
              <Select value={form.serviceType} onChange={e=>setForm(f=>({...f,serviceType:e.target.value}))}>
                {SERVICE_TYPES.map(t=><option key={t}>{t}</option>)}
              </Select>
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
              <Field label="Date" required><Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required /></Field>
              <Field label="Cost (₹)" required><Input type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} placeholder="e.g. 3500" required /></Field>
              <Field label="Odometer (km)" hint={latestOdo?`Current: ${latestOdo.reading.toLocaleString('en-IN')} km`:''}><Input type="number" min="0" value={form.odometer} onChange={e=>setForm(f=>({...f,odometer:e.target.value}))} placeholder="e.g. 25000" /></Field>
              <Field label="Service Interval (km)" hint="For next-service alerts"><Input type="number" min="0" value={form.intervalKm} onChange={e=>setForm(f=>({...f,intervalKm:e.target.value}))} placeholder="e.g. 5000" /></Field>
            </div>
            <Field label="Notes"><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Workshop, parts replaced…" rows={2} /></Field>
            <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
              <Btn type="button" variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
              <Btn type="submit" disabled={busy} style={{ flex:1 }}>{busy?'Saving…':'Save Service →'}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {delId && (
        <Modal title="Delete Service?" onClose={()=>setDelId(null)} width="360px">
          <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'22px' }}>This cannot be undone.</p>
          <div style={{ display:'flex', gap:'10px' }}>
            <Btn variant="ghost" onClick={()=>setDelId(null)} style={{ flex:1 }}>Cancel</Btn>
            <Btn variant="danger" onClick={()=>handleDelete(delId)} style={{ flex:1 }}>Delete</Btn>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
