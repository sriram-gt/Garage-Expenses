import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { getVehicles, deleteVehicle, getAnalytics } from '../../lib/db'
import Layout from '../../components/Layout'
import { Btn, Badge, Modal, fmtINR } from '../../components/ui'

export default function Vehicles() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const [vehicles, setVehicles] = useState([])
  const [analyticsMap, setAnalyticsMap] = useState({})
  const [deleteId, setDeleteId] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getVehicles(user.uid).then(async vs => {
      setVehicles(vs)
      const map = {}
      await Promise.all(vs.map(async v => { map[v.id] = await getAnalytics(user.uid, v.id) }))
      setAnalyticsMap(map)
      setDataLoading(false)
    })
  }, [user])

  async function handleDelete(id) {
    await deleteVehicle(user.uid, id)
    const vs = await getVehicles(user.uid)
    setVehicles(vs)
    setDeleteId(null)
  }

  if (loading || !user) return null

  const fuelColors = { Petrol:'#e8ff47', Diesel:'#ff6b35', Electric:'#4ecdc4', CNG:'#a78bfa' }

  return (
    <Layout title="Vehicles" subtitle={`${vehicles.length} vehicle${vehicles.length!==1?'s':''} registered`}
      actions={<Btn onClick={()=>router.push('/vehicles/new')}>+ Add Vehicle</Btn>}
    >
      {dataLoading ? (
        <div style={{ textAlign:'center', padding:'80px', color:'var(--muted)' }}>Loading vehicles…</div>
      ) : vehicles.length===0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px', background:'var(--bg2)', borderRadius:'var(--radius-xl)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:'56px', marginBottom:'16px' }}>🚗</div>
          <h2 style={{ fontSize:'20px', marginBottom:'8px' }}>No vehicles yet</h2>
          <p style={{ color:'var(--text2)', marginBottom:'24px', fontSize:'14px' }}>Add your first vehicle to start tracking.</p>
          <Btn onClick={()=>router.push('/vehicles/new')}>+ Add Vehicle</Btn>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'14px' }}>
          {vehicles.map(v => {
            const a = analyticsMap[v.id] || {}
            const fc = fuelColors[v.fuelType] || 'var(--text2)'
            return (
              <div key={v.id} className="animate-fadeUp" style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', overflow:'hidden' }}>
                <div style={{ background:`linear-gradient(135deg, ${fc}18, transparent)`, borderBottom:'1px solid var(--border)', padding:'20px 22px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ display:'flex', gap:'14px', alignItems:'center' }}>
                      <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:`${fc}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', border:`1px solid ${fc}30` }}>
                        {v.fuelType==='Electric'?'⚡':'🚗'}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'16px' }}>{v.name}</div>
                        <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'2px' }}>{v.regNumber}</div>
                      </div>
                    </div>
                    <Badge color={fc}>{v.fuelType}</Badge>
                  </div>
                </div>
                <div style={{ padding:'16px 22px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', borderBottom:'1px solid var(--border)' }}>
                  {[
                    ['Odometer', `${parseFloat(v.odometer||0).toLocaleString('en-IN')} km`],
                    ['Total Spend', fmtINR(a.totalExpense||0)],
                    ['Avg Mileage', a.avgMileage ? `${a.avgMileage} km/L` : '—'],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <div style={{ fontSize:'10px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'4px' }}>{lbl}</div>
                      <div style={{ fontSize:'14px', fontWeight:700, fontFamily:'var(--font-display)' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding:'12px 22px', fontSize:'12px', color:'var(--muted)', borderBottom:'1px solid var(--border)' }}>
                  📅 Purchased: {v.purchaseDate||'—'} · ⛽ {a.fuelCount||0} fuel entries
                </div>
                <div style={{ padding:'12px 22px', display:'flex', gap:'8px' }}>
                  <Btn size="sm" onClick={()=>router.push(`/vehicles/${v.id}`)}>View Details</Btn>
                  <Btn size="sm" variant="secondary" onClick={()=>router.push(`/vehicles/${v.id}/edit`)}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={()=>setDeleteId(v.id)}>Delete</Btn>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {deleteId && (
        <Modal title="Delete Vehicle?" onClose={()=>setDeleteId(null)} width="380px">
          <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'24px', lineHeight:1.6 }}>
            This permanently deletes the vehicle and <strong>all associated data</strong> — fuel logs, expenses, and services.
          </p>
          <div style={{ display:'flex', gap:'10px' }}>
            <Btn variant="ghost" onClick={()=>setDeleteId(null)} style={{ flex:1 }}>Cancel</Btn>
            <Btn variant="danger" onClick={()=>handleDelete(deleteId)} style={{ flex:1 }}>Yes, Delete</Btn>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
