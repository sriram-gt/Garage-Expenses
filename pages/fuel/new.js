import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { getVehicles, addFuelLog, getLatestOdometer, FUEL_PROVIDERS } from '../../lib/db'
import Layout from '../../components/Layout'
import { Btn, Field, Input, Select, Textarea } from '../../components/ui'

export default function NewFuelLog() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const { vid } = router.query
  const [vehicles, setVehicles] = useState([])
  const [latestOdo, setLatestOdo] = useState(null)
  const [form, setForm] = useState({ vehicleId:'', date:new Date().toISOString().split('T')[0], provider:'indian_oil', litres:'', cost:'', odometer:'', notes:'' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    getVehicles(user.uid).then(async vs => {
      setVehicles(vs)
      const initVid = vid || vs[0]?.id || ''
      setForm(f=>({...f, vehicleId: initVid}))
      if (initVid) {
        const odo = await getLatestOdometer(user.uid, initVid)
        setLatestOdo(odo)
      }
    })
  }, [user, vid])

  async function handleVehicleChange(id) {
    setForm(f=>({...f, vehicleId:id}))
    if (id) { const odo = await getLatestOdometer(user.uid, id); setLatestOdo(odo) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.vehicleId) return setError('Please select a vehicle.')
    if (!form.litres || parseFloat(form.litres)<=0) return setError('Enter fuel quantity.')
    if (!form.cost || parseFloat(form.cost)<=0) return setError('Enter total cost.')
    if (!form.odometer || parseFloat(form.odometer)<=0) return setError('Enter odometer reading.')
    if (latestOdo && parseFloat(form.odometer) < latestOdo.reading) return setError(`Odometer must be ≥ last reading (${latestOdo.reading.toLocaleString('en-IN')} km).`)
    if (latestOdo) {
      const days = Math.max(1, Math.round((new Date(form.date)-new Date(latestOdo.date))/86400000))
      const km = parseFloat(form.odometer)-latestOdo.reading
      if (km>0 && days>0 && (km/days)>1500) return setError(`⚠️ Unusual jump: ${km} km in ${days} days. Please verify reading.`)
    }
    setBusy(true)
    try {
      await addFuelLog(user.uid, form.vehicleId, form)
      router.push(`/fuel?vid=${form.vehicleId}`)
    } catch(err) { setError('Failed to save. Please try again.'); setBusy(false) }
  }

  if (loading || !user) return null
  const pricePerL = form.litres && form.cost ? (parseFloat(form.cost)/parseFloat(form.litres)).toFixed(2) : null

  return (
    <Layout title="Log Fuel" subtitle="Record a fuel fill-up">
      <div style={{ maxWidth:'580px' }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'32px' }}>
          {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'var(--radius-md)', padding:'12px 16px', color:'var(--danger)', fontSize:'13px', marginBottom:'20px' }}>{error}</div>}
          {latestOdo && <div style={{ background:'rgba(78,205,196,0.08)', border:'1px solid rgba(78,205,196,0.2)', borderRadius:'var(--radius-md)', padding:'12px 16px', fontSize:'12px', color:'var(--accent3)', marginBottom:'20px' }}>📍 Last odometer: <strong>{latestOdo.reading.toLocaleString('en-IN')} km</strong> on {latestOdo.date}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label="Vehicle" required>
                  <Select value={form.vehicleId} onChange={e=>handleVehicleChange(e.target.value)} required>
                    <option value="">Select vehicle...</option>
                    {vehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Date" required><Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required /></Field>
              <Field label="Fuel Provider" required>
                <Select value={form.provider} onChange={e=>setForm(f=>({...f,provider:e.target.value}))}>
                  {FUEL_PROVIDERS.map(p=><option key={p.id} value={p.id}>{p.logo} {p.label}</option>)}
                </Select>
              </Field>
              <Field label="Fuel Quantity (litres)" required><Input type="number" step="0.01" min="0" value={form.litres} onChange={e=>setForm(f=>({...f,litres:e.target.value}))} placeholder="e.g. 35.5" required /></Field>
              <Field label="Total Cost (₹)" required><Input type="number" step="0.01" min="0" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} placeholder="e.g. 3250" required /></Field>
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label="Odometer Reading (km)" hint={latestOdo?`Last: ${latestOdo.reading.toLocaleString('en-IN')} km`:'Current odometer at fill-up'} required>
                  <Input type="number" min="0" value={form.odometer} onChange={e=>setForm(f=>({...f,odometer:e.target.value}))} placeholder={latestOdo?`> ${latestOdo.reading}`:'e.g. 25000'} required />
                </Field>
              </div>
              {pricePerL && <div style={{ gridColumn:'1 / -1', background:'rgba(232,255,71,0.08)', border:'1px solid rgba(232,255,71,0.2)', borderRadius:'var(--radius-md)', padding:'10px 14px', fontSize:'13px', color:'var(--accent)', marginBottom:'4px' }}>💡 Price per litre: <strong>₹{pricePerL}</strong></div>}
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label="Notes"><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Full tank, highway fill…" rows={2} /></Field>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <Btn variant="ghost" type="button" onClick={()=>router.back()}>Cancel</Btn>
              <Btn type="submit" disabled={busy} style={{ flex:1 }}>{busy?'Saving…':'Save Fuel Log →'}</Btn>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
