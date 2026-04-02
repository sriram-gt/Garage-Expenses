import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../../hooks/useRequireAuth'
import { getVehicle, updateVehicle, FUEL_TYPES } from '../../../lib/db'
import Layout from '../../../components/Layout'
import { Btn, Field, Input, Select, Textarea } from '../../../components/ui'

export default function EditVehicle() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const { id } = router.query
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    getVehicle(user.uid, id).then(v => {
      if (!v) { router.replace('/vehicles'); return }
      setForm({ name:v.name, regNumber:v.regNumber, fuelType:v.fuelType, purchaseDate:v.purchaseDate||'', notes:v.notes||'' })
    })
  }, [user, id, router])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    await updateVehicle(user.uid, id, form)
    router.push(`/vehicles/${id}`)
  }

  if (loading || !user || !form) return null

  return (
    <Layout title="Edit Vehicle">
      <div style={{ maxWidth:'560px' }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'32px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label="Vehicle Name" required><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required /></Field>
              </div>
              <Field label="Registration Number" required><Input value={form.regNumber} onChange={e=>setForm(f=>({...f,regNumber:e.target.value.toUpperCase()}))} required /></Field>
              <Field label="Fuel Type"><Select value={form.fuelType} onChange={e=>setForm(f=>({...f,fuelType:e.target.value}))}>{FUEL_TYPES.map(t=><option key={t}>{t}</option>)}</Select></Field>
              <Field label="Purchase Date"><Input type="date" value={form.purchaseDate} onChange={e=>setForm(f=>({...f,purchaseDate:e.target.value}))} /></Field>
              <div style={{ gridColumn:'1 / -1' }}>
                <Field label="Notes"><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} /></Field>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <Btn variant="ghost" type="button" onClick={()=>router.back()}>Cancel</Btn>
              <Btn type="submit" disabled={busy} style={{ flex:1 }}>{busy?'Saving…':'Save Changes →'}</Btn>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
