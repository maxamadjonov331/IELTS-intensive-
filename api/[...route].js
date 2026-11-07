import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const SECRET = process.env.AUTH_SECRET || ''
let ready
const init = () => ready || (ready = (async () => {
  await sql`create table if not exists students(code text primary key, name text not null)`
  await sql`create table if not exists days(n int primary key, published boolean not null default false, data jsonb not null default '{}')`
  await sql`create table if not exists progress(code text not null, n int not null, data jsonb not null, primary key(code, n))`
  await sql`create table if not exists files(id text primary key, name text, type text, data text)`
  await sql`create table if not exists settings(key text primary key, value text)`
})().catch(e => { ready = null; throw e }))

const h = s => crypto.createHash('sha256').update(s + SECRET).digest('hex')
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
const sign = p => {
  const d = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + 12096e5 })).toString('base64url')
  return d + '.' + crypto.createHmac('sha256', SECRET).update(d).digest('base64url')
}
const verify = t => {
  try {
    const [d, m] = t.split('.')
    const e = crypto.createHmac('sha256', SECRET).update(d).digest('base64url')
    if (!same(m, e)) return null
    const p = JSON.parse(Buffer.from(d, 'base64url').toString())
    return p.exp > Date.now() ? p : null
  } catch { return null }
}
const teacherOk = async c => {
  const [r] = await sql`select value from settings where key='teacher'`
  if (r) return same(h(c), r.value)
  return !!process.env.TEACHER_CODE && same(h(c), h(process.env.TEACHER_CODE))
}
const clamp = v => { if (v == null || v === '') return null; const x = Math.round(+v); return Number.isFinite(x) ? Math.max(0, Math.min(40, x)) : null }
const complete = p => p && p.r != null && p.l != null && p.art && String(p.wr || '').trim().length > 0
const meta = f => f && typeof f.id === 'string' ? { id: f.id.slice(0, 64), name: String(f.name || '').slice(0, 200), type: f.type === 'pdf' ? 'pdf' : 'html' } : null
const dayOut = r => ({ reading: null, listening: null, article: { title: '', text: '' }, writing: '', ...r.data, n: r.n, published: r.published })

async function state(me) {
  const days = (await sql`select n, published, data from days order by n`).map(dayOut)
  if (me.role === 'teacher') {
    const roster = await sql`select code, name from students order by name`
    const progress = {}
    for (const r of await sql`select code, n, data from progress`) (progress[r.code] ??= {})[r.n] = r.data
    return { days, roster, progress }
  }
  const [s] = await sql`select code, name from students where code=${me.code}`
  const progress = { [me.code]: {} }
  for (const r of await sql`select n, data from progress where code=${me.code}`) progress[me.code][r.n] = r.data
  return { days: days.filter(d => d.published), roster: [s], progress }
}

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body
  const c = []; for await (const x of req) c.push(x); return Buffer.concat(c)
}

export default async function handler(req, res) {
  const j = (c, o) => res.status(c).json(o)
  try {
    if (!SECRET || !process.env.DATABASE_URL) return j(500, { error: 'Server is not configured. Set AUTH_SECRET and DATABASE_URL.' })
    await init()
    const route = [].concat(req.query.route || [])[0]
    const b = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : {}

    if (route === 'login' && req.method === 'POST') {
      const { role, code = '', name = '' } = b
      if (role === 'teacher') {
        if (await teacherOk(String(code))) return j(200, { token: sign({ role: 'teacher' }), role: 'teacher' })
      } else {
        const [s] = await sql`select code, name from students where lower(code)=lower(${String(code).trim()})`
        if (s && s.name.trim().toLowerCase() === String(name).trim().toLowerCase())
          return j(200, { token: sign({ role: 'student', code: s.code }), role: 'student', code: s.code })
      }
      await new Promise(r => setTimeout(r, 500))
      return j(401, { error: role === 'teacher' ? 'That teacher code is not valid.' : 'Student code and name do not match any enrolled student.' })
    }

    const tok = (req.headers.authorization || '').replace('Bearer ', '') || String(req.query.t || '')
    const me = verify(tok)
    if (!me) return j(401, { error: 'Please sign in again.' })
    if (me.role === 'student') {
      const [s] = await sql`select 1 as ok from students where code=${me.code}`
      if (!s) return j(401, { error: 'This student is no longer enrolled.' })
    }
    const teacher = me.role === 'teacher'

    if (route === 'state') return j(200, await state(me))

    if (route === 'progress' && !teacher) {
      const n = parseInt(b.n, 10), p = b.p || {}
      const [day] = await sql`select published from days where n=${n}`
      if (!day || !day.published) return j(403, { error: 'This day is not available.' })
      if (n > 1) {
        const [prev] = await sql`select data from progress where code=${me.code} and n=${n - 1}`
        if (!prev || !complete(prev.data)) return j(403, { error: 'Complete the previous day first.' })
      }
      const rec = {
        r: clamp(p.r), l: clamp(p.l), art: !!p.art,
        wr: String(p.wr || '').slice(0, 20000),
        hl: (Array.isArray(p.hl) ? p.hl : []).slice(0, 200).map(x => String(x).slice(0, 300)),
        notes: String(p.notes || '').slice(0, 20000)
      }
      await sql`insert into progress(code, n, data) values(${me.code}, ${n}, ${JSON.stringify(rec)}::jsonb)
                on conflict(code, n) do update set data = excluded.data`
      return j(200, { ok: true })
    }

    if (route === 'file') {
      const id = String(req.query.id || '')
      if (!teacher) {
        const [ok] = await sql`select 1 as ok from days where published and (data->'reading'->>'id'=${id} or data->'listening'->>'id'=${id})`
        if (!ok) return j(403, { error: 'Not available.' })
      }
      const [f] = await sql`select type, data from files where id=${id}`
      if (!f) return j(404, { error: 'File not found.' })
      res.setHeader('Content-Type', f.type === 'pdf' ? 'application/pdf' : 'text/html; charset=utf-8')
      res.setHeader('Content-Disposition', 'inline')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cache-Control', 'private, max-age=3600')
      return res.status(200).send(Buffer.from(f.data, 'base64'))
    }

    if (!teacher) return j(403, { error: 'Teacher access required.' })

    if (route === 'upload' && req.method === 'POST') {
      const name = String(req.query.name || 'file').slice(0, 200)
      if (!/\.(html?|pdf)$/i.test(name)) return j(400, { error: 'Only .html and .pdf files are accepted.' })
      const buf = await readBody(req)
      if (!buf.length || buf.length > 4e6) return j(400, { error: 'Files must be between 1 byte and 4 MB.' })
      const id = crypto.randomUUID(), type = /\.pdf$/i.test(name) ? 'pdf' : 'html'
      await sql`insert into files(id, name, type, data) values(${id}, ${name}, ${type}, ${buf.toString('base64')})`
      return j(200, { id, name, type })
    }

    if (route === 'teacher' && req.method === 'POST') {
      const { action } = b
      if (action === 'saveDay') {
        const d = b.day || {}, n = parseInt(d.n, 10)
        if (!(n > 0)) return j(400, { error: 'Invalid day.' })
        const data = {
          reading: meta(d.reading), listening: meta(d.listening),
          article: { title: String(d.article?.title || '').slice(0, 300), text: String(d.article?.text || '').slice(0, 100000) },
          writing: String(d.writing || '').slice(0, 5000)
        }
        await sql`insert into days(n, published, data) values(${n}, ${!!d.published}, ${JSON.stringify(data)}::jsonb)
                  on conflict(n) do update set published = excluded.published, data = excluded.data`
      } else if (action === 'deleteDay') {
        const n = parseInt(b.n, 10)
        await sql`delete from days where n=${n}`
        await sql`delete from progress where n=${n}`
      } else if (action === 'addStudent') {
        const code = String(b.code || '').trim().slice(0, 40), name = String(b.name || '').trim().slice(0, 120)
        if (!code || !name) return j(400, { error: 'Enter a code and a full name.' })
        const [dup] = await sql`select 1 as ok from students where lower(code)=lower(${code})`
        if (dup) return j(409, { error: 'That student code already exists.' })
        await sql`insert into students(code, name) values(${code}, ${name})`
      } else if (action === 'removeStudent') {
        await sql`delete from progress where code=${String(b.code)}`
        await sql`delete from students where code=${String(b.code)}`
      } else if (action === 'resetProgress') {
        await sql`delete from progress where code=${String(b.code)}`
      } else if (action === 'setTeacherCode') {
        const c = String(b.code || '').trim()
        if (c.length < 6) return j(400, { error: 'Use at least 6 characters.' })
        await sql`insert into settings(key, value) values('teacher', ${h(c)}) on conflict(key) do update set value = excluded.value`
      } else return j(400, { error: 'Unknown action.' })
      return j(200, { ok: true })
    }

    return j(404, { error: 'Not found.' })
  } catch (e) {
    console.error(e)
    return j(500, { error: 'Something went wrong on the server.' })
  }
}
