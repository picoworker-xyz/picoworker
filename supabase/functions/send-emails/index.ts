// Flushes the email_outbox queue through Namecheap Private Email (SMTP).
// Protected by EMAIL_SECRET; called by a cron every minute (and can be called
// on demand). Renders a template per row, sends, and marks it sent/failed.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { cors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EMAIL_SECRET = Deno.env.get('EMAIL_SECRET')!
const SMTP_HOST = Deno.env.get('SMTP_HOST')!
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? '465')
const SMTP_USER = Deno.env.get('SMTP_USER')!
const SMTP_PASS = Deno.env.get('SMTP_PASS')!
const SMTP_FROM = Deno.env.get('SMTP_FROM') ?? SMTP_USER

type Row = { id: string; to_email: string; template: string; data: Record<string, unknown> }

function render(template: string, d: Record<string, unknown>): { subject: string; text: string; html: string } {
  const name = String(d.name ?? 'there')
  const amount = d.amount != null ? `$${Number(d.amount).toFixed(Number(d.amount) < 1 ? 4 : 2).replace(/0+$/, '').replace(/\.$/, '')}` : ''
  const wrap = (title: string, body: string) =>
    `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1a1a1a">
       <div style="font-weight:800;font-size:20px;color:#0B0C10">PicoWorker</div>
       <h2 style="font-size:18px;margin:18px 0 8px">${title}</h2>
       <div style="font-size:14px;line-height:1.6;color:#333">${body}</div>
       <div style="margin-top:24px;font-size:12px;color:#888">PicoWorker · picoworker.xyz</div>
     </div>`
  switch (template) {
    case 'welcome':
      return { subject: 'Welcome to PicoWorker', text: `Welcome, ${name}!`, html: wrap('Welcome to PicoWorker', `Hi ${name}, your account is ready. Start earning USDC for tiny tasks.`) }
    case 'earning':
      return { subject: `You earned ${amount}`, text: `You earned ${amount}.`, html: wrap('You got paid', `Nice work. <b>${amount}</b> for "${d.title ?? 'a task'}" was added. New balance: $${Number(d.balance ?? 0).toFixed(2)}.`) }
    case 'deposit':
      return { subject: `Deposit received: ${amount}`, text: `Deposit ${amount} received.`, html: wrap('Deposit received', `We received <b>${amount}</b> USDC. Your campaign balance is now $${Number(d.balance ?? 0).toFixed(2)}.`) }
    case 'task_rejected':
      return { subject: 'Your submission was not approved', text: 'Your submission was not approved.', html: wrap('Submission not approved', `Your proof for "${d.title ?? 'a task'}" wasn't approved. You can appeal it from your submissions.`) }
    case 'address_code':
      return { subject: `Your PicoWorker code: ${d.code}`, text: `Your confirmation code is ${d.code}`, html: wrap('Confirm your payout address', `Your confirmation code is:<div style="font-size:28px;font-weight:800;letter-spacing:4px;margin:14px 0">${d.code}</div>It expires in 15 minutes. If you didn't request this, ignore this email.`) }
    default:
      return { subject: 'PicoWorker', text: 'PicoWorker notification', html: wrap('PicoWorker', 'You have a new notification.') }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.headers.get('x-email-secret') !== EMAIL_SECRET) return json({ error: 'Forbidden' }, 403)
  try {
    const db = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: rows } = await db.from('email_outbox').select('id, to_email, template, data')
      .or('status.eq.queued,status.is.null').limit(20)
    if (!rows || rows.length === 0) return json({ sent: 0 })

    const client = new SMTPClient({
      connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: true, auth: { username: SMTP_USER, password: SMTP_PASS } },
    })

    let sent = 0
    const errors: unknown[] = []
    for (const r of rows as Row[]) {
      try {
        const { subject, text, html } = render(r.template, r.data ?? {})
        await client.send({ from: SMTP_FROM, to: r.to_email, subject, content: text, html })
        await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), error: null }).eq('id', r.id)
        sent++
      } catch (e) {
        await db.from('email_outbox').update({ status: 'failed', error: String(e) }).eq('id', r.id)
        errors.push({ id: r.id, error: String(e) })
      }
    }
    await client.close()
    return json({ sent, failed: errors.length, errors })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
