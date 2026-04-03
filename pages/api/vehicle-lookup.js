// pages/api/vehicle-lookup.js
// Server-side scrape of carinfo.app — runs on Vercel edge, bypasses CORS

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { regNumber } = req.body
  if (!regNumber) return res.status(400).json({ error: 'regNumber required' })

  // Normalize: remove spaces, uppercase  e.g. "TN09AB1234"
  const reg = regNumber.replace(/\s+/g, '').toUpperCase()

  try {
    // ── Step 1: hit the carinfo search API ───────────────────────────────────
    const searchRes = await fetch('https://api.carinfo.app/api/rc-detail', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'User-Agent':    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Origin':        'https://carinfo.app',
        'Referer':       'https://carinfo.app/',
        'Accept':        'application/json',
        'x-app-version': '6.5.0',
        'x-platform':   'web',
      },
      body: JSON.stringify({ regNo: reg }),
    })

    if (!searchRes.ok) {
      // carinfo blocked or rate-limited — return partial info
      return res.status(200).json({
        success: false,
        blocked: true,
        message: 'Carinfo is currently unavailable. Please enter details manually.',
      })
    }

    const data = await searchRes.json()

    // ── Step 2: normalise the response ───────────────────────────────────────
    // carinfo returns different shapes depending on version; handle both
    const rc = data?.result?.rc_details || data?.result || data?.data || {}

    const result = {
      success:         true,
      regNumber:       rc.reg_no         || rc.regNo         || reg,
      ownerName:       rc.owner_name     || rc.ownerName     || '',
      vehicleClass:    rc.vehicle_class  || rc.vehicleClass  || '',
      maker:           rc.maker_desc     || rc.makerDesc     || rc.maker || '',
      model:           rc.model          || '',
      fuelType:        rc.fuel_desc      || rc.fuelType      || '',
      color:           rc.color          || '',
      manufactureYear: rc.mfg_date       || rc.mfgDate       || '',
      registrationDate:rc.reg_date       || rc.regDate       || '',

      // Insurance
      insuranceExpiry: rc.insurance_upto || rc.insuranceUpto || rc.insurance_validity || '',
      insurerName:     rc.insurance_comp || rc.insuranceComp || '',

      // Fitness / PUC
      fitnessExpiry:   rc.fit_upto       || rc.fitUpto       || '',
      pucExpiry:       rc.pucc_upto      || rc.puccUpto      || '',

      // Challans — separate array if present
      challans:        data?.result?.challan_details || data?.challans || [],
    }

    return res.status(200).json(result)

  } catch (err) {
    console.error('vehicle-lookup error:', err)
    return res.status(200).json({
      success: false,
      blocked: true,
      message: 'Could not fetch vehicle data. Please enter details manually.',
    })
  }
}
