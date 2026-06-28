import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BrandMark } from '../../components/layout'

const UPDATED = 'June 28, 2026'

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-[#0B0C10] text-[#D9DAE2]">
      <header className="border-b border-white/7">
        <div className="app-container py-5 flex items-center justify-between">
          <Link to="/"><BrandMark size={32} /></Link>
          <Link to="/" className="text-[#9A9CA8] text-[14px] font-bold hover:text-white">Back to home</Link>
        </div>
      </header>
      <main className="app-container py-12 max-w-[760px]">
        <h1 className="font-head font-bold text-[34px] text-white tracking-[-.02em]">{title}</h1>
        <p className="text-[#767884] text-[13px] font-semibold mt-2 mb-8">Last updated: {UPDATED}</p>
        <div className="flex flex-col gap-6 text-[15px] leading-[1.7]">{children}</div>
        <div className="mt-12 text-[#767884] text-[13px] font-semibold">
          Questions? Contact us at <a href="mailto:hello@picoworker.xyz" className="text-[var(--accent)]">hello@picoworker.xyz</a>.
        </div>
      </main>
    </div>
  )
}

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="font-head font-bold text-[20px] text-white mt-2">{children}</h2>
)

export function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>Welcome to PicoWorker (picoworker.xyz). By creating an account or using PicoWorker, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>

      <H>1. What PicoWorker is</H>
      <p>PicoWorker is a two-sided micro-task marketplace. Earners complete small online tasks and are paid in USDC. Businesses fund campaigns in USDC and pay for verified completions.</p>

      <H>2. Eligibility and accounts</H>
      <p>You must be at least 18 years old, or the age of majority in your country, to use PicoWorker. You may hold only one account. Creating multiple accounts, or using bots, automation, VPNs, or other methods to bypass our fraud checks, is not allowed and may result in suspension and forfeiture of any balance.</p>

      <H>3. Earning and payments</H>
      <p>Rewards are paid in USDC on the Solana network. Task availability and reward amounts can change at any time, and we do not guarantee any level of earnings. We may review tasks and withdrawals for fraud before paying, and withdrawals above a daily limit may require manual approval. A small network and processing fee applies to withdrawals.</p>

      <H>4. Businesses</H>
      <p>Businesses fund campaigns in USDC held in escrow and pay only per verified completion. Tasks must be lawful and must not require sharing passwords, performing illegal actions, or violating any third-party platform's rules.</p>

      <H>5. Acceptable use</H>
      <p>You agree not to submit fake or fraudulent proofs, manipulate results, use multiple accounts, or interfere with the service. We may suspend or terminate accounts that violate these terms, and withhold balances obtained through fraud.</p>

      <H>6. Disclaimers and liability</H>
      <p>PicoWorker is provided "as is" without warranties. To the maximum extent permitted by law, we are not liable for indirect or consequential damages, lost earnings, or losses arising from blockchain transactions, wallet errors, or third-party services.</p>

      <H>7. Changes</H>
      <p>We may update these terms from time to time. Continued use after changes means you accept the updated terms.</p>
    </LegalLayout>
  )
}

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>This Privacy Policy explains what information PicoWorker (picoworker.xyz) collects and how we use it.</p>

      <H>1. Information we collect</H>
      <p>Account information such as your name and email address. Authentication data when you sign in with email or Google. Device and network signals (a device fingerprint and IP address) used to prevent duplicate accounts and fraud. Your payout wallet address and task activity. Support messages you send us.</p>

      <H>2. How we use it</H>
      <p>To provide the service, process tasks and USDC payments, prevent fraud and duplicate accounts, communicate with you (confirmations, receipts, support, and important notices), and improve the product.</p>

      <H>3. Service providers</H>
      <p>We use Supabase for hosting, authentication, and database, and Namecheap Private Email for sending email. Payments settle on the Solana blockchain, which is a public ledger, so on-chain transaction details are publicly visible. We do not sell your personal information.</p>

      <H>4. Cookies and local storage</H>
      <p>We use cookies and browser local storage to keep you signed in and to remember referral links. These are required for the app to work.</p>

      <H>5. Data retention and security</H>
      <p>We keep your information for as long as your account is active or as needed to run the service and meet legal obligations. We use reasonable measures to protect your data, but no method of transmission or storage is completely secure.</p>

      <H>6. Your choices</H>
      <p>You can request access to or deletion of your account data by contacting us. Some information may be retained where required to prevent fraud or to comply with the law.</p>

      <H>7. Children</H>
      <p>PicoWorker is not directed to children under 18, and we do not knowingly collect their data.</p>
    </LegalLayout>
  )
}
