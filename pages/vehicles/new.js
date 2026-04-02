import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { addVehicle, FUEL_TYPES } from '../../lib/db'
import Layout from '../../components/Layout'
import { Btn, Field, Input, Select, Textarea } from '../../components/ui'

export default function NewVehicle() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const [form, setForm] = useState({ name:'', regNumber:'', fuelType:'Petrol', purchaseDate:'', odometer:'', notes:'' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading || !user) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Vehicle name is required.')
    if (!form.regNumber.trim()) return setError('Registration number is required.')
    setBusy(true)
    try {
      const vid = await addVehicle(user.uid, form)
      router.push(`/vehicles/${vid}`)
    } catch (err) {
      setError('Failed to save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Layout title="Add Vehicle" subtitle="Register a new vehicle to start tracking">
      <div style={{ maxWidth:'560px' }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'32px' }}>
          {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'var(--radius-md)', padding:'12px 16px', color:'var(--danger)', fontSize:'13px', marginBottom:'20px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label="Vehicle Name" required><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Honda City 2020" required /></Field>
              </div>
              <Field label="Registration Number" required><Input value={form.regNumber} onChange={e=>setForm(f=>({...f,regNumber:e.target.value.toUpperCase()}))} placeholder="TN 09 AB 1234" required /></Field>
              <Field label="Fuel Type"><Select value={form.fuelType} onChange={e=>setForm(f=>({...f,fuelType:e.target.value}))}>{FUEL_TYPES.map(t=><option key={t}>{t}</option>)}</Select></Field>
              <Field label="Purchase Date"><Input type="date" value={form.purchaseDate} onChange={e=>setForm(f=>({...f,purchaseDate:e.target.value}))} /></Field>
              <Field label="Current Odometer (km)" hint="Sets the starting reading"><Input type="number" min="0" value={form.odometer} onChange={e=>setForm(f=>({...f,odometer:e.target.value}))} placeholder="e.g. 15000" /></Field>
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label="Notes"><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} /></Field>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <Btn variant="ghost" type="button" onClick={()=>router.back()}>Cancel</Btn>
              <Btn type="submit" disabled={busy} style={{ flex:1 }}>{busy?'Saving…':'Save Vehicle →'}</Btn>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
