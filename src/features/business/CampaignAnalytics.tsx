import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { usd, pct, etaLabel, timeAgo } from '../../lib/format'
import { Page } from '../../components/Page'
import { Avatar, Pill } from '../../components/ui'

export function CampaignAnalytics() {
  const { id } = useParams()
  const nav = useNavigate()
  const { task, completionsForTask, pauseCampaign } = useStore()

  const t = id ? task(id) : undefined
  if (!t) return <Page title="Campaign" back><div className="text-center text-[#767884] text-[14px] font-semibold py-16">Campaign not found.</div></Page>

  const completions = completionsForTask(t.id)
  const spent = +(t.done_count * t.reward).toFixed(2)
  const remaining = +((t.goal_count - t.done_count) * t.reward).toFixed(2)
  const chart = buildChart(t.done_count)
  const maxBar = Math.max(...chart, 1)

  return (
    <Page
      title={t.title}
      subtitle={`Launched ${timeAgo(t.created_at)}`}
      back
      actions={
        <div className="flex gap-2">
          <button onClick={() => pauseCampaign(t.id)} className="font-head font-extrabold text-[14px] bg-white/6 text-white px-4 py-[10px] rounded-[12px] border border-white/10">{t.status === 'paused' ? 'Resume' : 'Pause'}</button>
          <button onClick={() => nav('/business/add-funds')} className="font-head font-extrabold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] px-4 py-[10px] rounded-[12px]">Add budget</button>
        </div>
      }
    >
      <div className="mb-5"><Pill tone={t.status === 'live' ? 'green' : 'default'}>{t.status.toUpperCase()}</Pill></div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* left: progress + chart */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-[var(--r)] p-6 bg-[#15161C] border border-white/6">
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-[#8B8D99] text-[12px] font-bold uppercase tracking-[.07em]">Completions</div>
                <div className="font-head text-[36px] font-extrabold text-white mt-1">{t.done_count} <span className="text-[#5E606C] text-[22px]">/ {t.goal_count}</span></div>
              </div>
              <div className="font-head text-[26px] font-extrabold text-[var(--accent)]">{pct(t.done_count, t.goal_count)}%</div>
            </div>
            <div className="h-[10px] rounded-full bg-white/8 overflow-hidden"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct(t.done_count, t.goal_count)}%` }} /></div>
          </div>

          <div className="rounded-[var(--r)] p-6 bg-[#15161C] border border-white/6">
            <div className="text-white text-[15px] font-extrabold font-head mb-5">Completions / day · last 7 days</div>
            <div className="flex items-end justify-between gap-3 h-[160px]">
              {chart.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[#9A9CA8] text-[11px] font-bold">{v}</span>
                  <div className="w-full rounded-t-[6px] bg-gradient-to-t from-[#7ec900] to-[var(--accent)]" style={{ height: `${(v / maxBar) * 100}%`, minHeight: 4 }} />
                  <span className="text-[#767884] text-[11px] font-bold">{'MTWTFSS'[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right: stats + recent */}
        <aside className="flex flex-col gap-4">
          <Tile value={usd(spent)} label="Spent" accent />
          <Tile value={usd(remaining)} label="Remaining" />
          <Tile value={etaLabel(t.est_seconds)} label="Avg completion time" />
          <div className="rounded-[var(--r)] p-5 bg-[#15161C] border border-white/6">
            <div className="text-white text-[14px] font-extrabold font-head mb-3">Recent results</div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['B', 'P', 'R', 'S'].map((n, i) => <Avatar key={i} name={n} size={32} gradient="linear-gradient(135deg,#8B6CFF,#5B8DEF)" />)}
              </div>
              <span className="text-[#A9ABB6] text-[13px] font-semibold">
                +{t.done_count} verified {t.type === 'follow_x' ? 'followers' : 'completions'}
              </span>
            </div>
            {completions.length > 0 && <div className="text-[#767884] text-[12px] font-semibold mt-2">{completions.length} via the live marketplace</div>}
          </div>
        </aside>
      </div>
    </Page>
  )
}

function buildChart(total: number): number[] {
  const weights = [3, 5, 4, 6, 5, 7, 4]
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => Math.round((w / sum) * total))
}
function Tile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-[16px] p-5 bg-[#15161C] border border-white/6">
      <div className={`font-head text-[22px] font-extrabold ${accent ? 'text-[var(--accent)]' : 'text-white'}`}>{value}</div>
      <div className="text-[#767884] text-[11px] font-semibold mt-1">{label}</div>
    </div>
  )
}
