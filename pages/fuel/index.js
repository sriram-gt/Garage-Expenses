import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { getVehicles, getFuelLogs, deleteFuelLog, FUEL_PROVIDERS } from '../../lib/db'
import Layout from '../../components/Layout'
import { Btn, Badge, fmtINR, C } from '../../components/ui'

export default function FuelPage() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const { vid } = router.query
  const [vehicles, setVehicles]   = useState([])
  const [selVid, setSelVid]       = useState('')
  const [logs, setLogs]           = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getVehicles(user.uid).then(async vs => {
      setVehicles(vs)
      const init = vid || vs[0]?.id || ''
      setSelVid(init)
      if (init) setLogs([...(await getFuelLogs(user.uid, init))].reverse())
      setDataLoading(false)
    })
  }, [user, vid])

  async function changeVehicle(id) {
    setSelVid(id); setDataLoading(true)
    setLogs([...(await getFuelLogs(user.uid, id))].reverse())
    setDataLoading(false)
  }

  async function handleDelete(id) {
    await deleteFuelLog(user.uid, id)
    setLogs(l => l.filter(x => x.id !== id))
  }

  if (loading || !user) return null

  const totalLitres = logs.reduce((s,l)=>s+l.litres, 0)
  const totalCost   = logs.reduce((s,l)=>s+l.cost,   0)
  const mileages    = logs.filter(l=>l.mileage).map(l=>l.mileage)
  const avgMileage  = mileages.length ? mileages.reduce((a,b)=>a+b,0)/mileages.length : 0

  return (
    <Layout title="Fuel Logs" subtitle={vehicles.find(v=>v.id===selVid)?.name||''}
      actions={
        <div style={{ display:'flex', gap:'8px' }}>
          {vehicles.length>0 && (
            <select value={selVid} onChange={e=>changeVehicle(e.target.value)} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-md)', padding:'8px 14px', color:'var(--text)', fontSize:'13px', cursor:'pointer' }}>
              {vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <Btn onClick={()=>router.push(`/fuel/new${selVid?`?vid=${selVid}`:''}`)}>+ Log Fuel</Btn>
        </div>
      }
    >
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Total Entries',  value: logs.length,                        icon:'📋' },
          { label:'Total Litres',   value: `${totalLitres.toFixed(1)} L`,      icon:'⛽' },
          { label:'Total Cost',     value: fmtINR(totalCost),                  icon:'💰' },
          { label:'Avg Mileage',    value: avgMileage ? `${avgMileage.toFixed(2)} km/L` : '—', icon:'⚡' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'16px 18px' }}>
            <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'6px' }}>{s.icon} {s.label}</div>
            <div style={{ fontSize:'20px', fontWeight:700, fontFamily:'var(--font-display)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        {dataLoading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'var(--muted)' }}>Loading…</div>
        ) : logs.length===0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'var(--muted)', fontSize:'14px' }}>
            No fuel logs yet.{' '}
            <button onClick={()=>router.push(`/fuel/new${selVid?`?vid=${selVid}`:''}`)} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontFamily:'inherit', fontSize:'14px' }}>Log first entry →</button>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Date','Provider','Litres','Cost','₹/L','Odometer','Distance','Mileage',''].map(h=>(
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:'var(--muted)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.7px', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log,i)=>{
                const prov = FUEL_PROVIDERS.find(p=>p.id===log.provider)||FUEL_PROVIDERS[FUEL_PROVIDERS.length-1]
                return (
                  <tr key={log.id} style={{ borderBottom: i<logs.length-1?'1px solid var(--border)':'none' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={{ padding:'12px 16px', color:'var(--text2)', whiteSpace:'nowrap' }}>{log.date}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:'6px', color:prov.color, fontWeight:600, fontSize:'12px' }}>{prov.logo} {prov.label}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>{log.litres} L</td>
                    <td style={{ padding:'12px 16px', fontWeight:700 }}>{fmtINR(log.cost)}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text2)' }}>{log.pricePerLitre ? `${C}${log.pricePerLitre}` : '—'}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text2)' }}>{log.odometer ? `${parseFloat(log.odometer).toLocaleString('en-IN')} km` : '—'}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text2)' }}>{log.distance_travelled ? `${log.distance_travelled} km` : <span style={{ color:'var(--muted)' }}>First entry</span>}</td>
                    <td style={{ padding:'12px 16px' }}>
                      {log.mileage
                        ? <Badge color={log.mileage>=(avgMileage||0)?'var(--success)':'var(--warning)'}>{log.mileage} km/L</Badge>
                        : <span style={{ color:'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <button onClick={()=>handleDelete(log.id)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'14px' }}
                        onMouseEnter={e=>e.currentTarget.style.color='var(--danger)'}
                        onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}
                      >🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
