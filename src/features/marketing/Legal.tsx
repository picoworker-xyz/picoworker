import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BrandMark } from '../../components/layout'

const UPDATED = 'June 28, 2026'
const PRIVACY_UPDATED = 'August 30, 2026'

function LegalLayout({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-[var(--bg-page)] text-[var(--ink-2)]">
      <header className="border-b border-[var(--line)]">
        <div className="app-container py-5 flex items-center justify-between">
          <Link to="/"><BrandMark size={32} /></Link>
          <Link to="/" className="text-[var(--ink-3)] text-[14px] font-bold hover:text-[var(--ink)]">Back to home</Link>
        </div>
      </header>
      <main className="app-container py-12 max-w-[760px]">
        <h1 className="font-head font-bold text-[34px] text-[var(--ink)] tracking-[-.02em]">{title}</h1>
        <p className="text-[var(--ink-4)] text-[13px] font-semibold mt-2 mb-8">Last updated: {updated ?? UPDATED}</p>
        <div className="flex flex-col gap-6 text-[15px] leading-[1.7]">{children}</div>
        <div className="mt-12 text-[var(--ink-4)] text-[13px] font-semibold">
          Questions? Contact us at <a href="mailto:hello@picoworker.xyz" className="text-[var(--accent-strong)]">hello@picoworker.xyz</a>.
        </div>
      </main>
    </div>
  )
}

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="font-head font-bold text-[20px] text-[var(--ink)] mt-2">{children}</h2>
)

const S = ({ children }: { children: ReactNode }) => (
  <h3 className="font-head font-semibold text-[16px] text-[var(--ink)]">{children}</h3>
)

const UL = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-6 flex flex-col gap-1">{children}</ul>
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
    <LegalLayout title="Privacy Policy" updated={PRIVACY_UPDATED}>
      <p>Welcome to Picoworker.xyz.</p>

      <p>Your privacy is important to us. This Privacy Policy explains how Picoworker.xyz may collect, use, store, share, and protect information when you visit our website, create an account, complete tasks or offers, request a withdrawal, or otherwise use our services.</p>

      <p>By using Picoworker.xyz, you acknowledge that your information may be processed as described in this Privacy Policy.</p>

      <p>Please read this Privacy Policy carefully.</p>

      <H>1. About This Privacy Policy</H>
      <p>This Privacy Policy applies to information collected through Picoworker.xyz and services directly provided through our platform.</p>
      <p>Picoworker.xyz provides access to online earning opportunities that may include:</p>
      <UL>
        <li>Surveys</li>
        <li>Offerwalls</li>
        <li>Mobile applications and games</li>
        <li>Promotional offers</li>
        <li>Website and product testing</li>
        <li>Digital tasks</li>
        <li>Partner-provided campaigns</li>
        <li>Research opportunities</li>
        <li>Other online earning activities</li>
      </UL>
      <p>Some of these services are provided by independent third-party companies. When you access a third-party offer, survey, website, application, or service, that third party may collect and process information according to its own privacy policy.</p>
      <p>We encourage users to review the privacy policies of third-party services before providing information to them.</p>

      <H>2. Information We May Collect</H>
      <p>Depending on how you use Picoworker.xyz, we may collect different types of information.</p>

      <S>2.1 Account Information</S>
      <p>When you create or manage an account, we may collect information such as:</p>
      <UL>
        <li>Name or username</li>
        <li>Email address</li>
        <li>Password information in protected or encrypted form</li>
        <li>Account preferences</li>
        <li>Account settings</li>
        <li>Verification information where required</li>
      </UL>
      <p>You should provide accurate information when creating and maintaining your account.</p>

      <S>2.2 Profile and Eligibility Information</S>
      <p>Some services, tasks, surveys, or offers may require information to determine eligibility.</p>
      <p>Depending on the service, this may include:</p>
      <UL>
        <li>Country or region</li>
        <li>Language preferences</li>
        <li>Age range</li>
        <li>General demographic information</li>
        <li>Device information</li>
      </UL>
      <p>The exact information requested may depend on the requirements of the relevant service or third-party partner.</p>

      <S>2.3 Device and Technical Information</S>
      <p>When you access Picoworker.xyz, we may automatically receive certain technical information, including:</p>
      <UL>
        <li>IP address</li>
        <li>Browser type</li>
        <li>Device type</li>
        <li>Operating system</li>
        <li>Device identifiers where applicable</li>
        <li>Language settings</li>
        <li>Time zone</li>
        <li>Website usage information</li>
        <li>Security and fraud-prevention signals</li>
      </UL>
      <p>This information may be used to operate the website, improve performance, protect accounts, prevent fraud, and maintain platform security.</p>

      <S>2.4 Activity Information</S>
      <p>We may collect information about how you use Picoworker.xyz, including:</p>
      <UL>
        <li>Tasks viewed or completed</li>
        <li>Offers started or completed</li>
        <li>Reward activity</li>
        <li>Referral activity</li>
        <li>Login activity</li>
        <li>Account actions</li>
        <li>Withdrawal requests</li>
        <li>Support requests</li>
      </UL>
      <p>This information helps us operate the platform, maintain accurate account records, investigate technical problems, and prevent abuse.</p>

      <S>2.5 Payment and Withdrawal Information</S>
      <p>When you request a withdrawal, we may collect information necessary to process your payment.</p>
      <p>Depending on the selected withdrawal method, this may include:</p>
      <UL>
        <li>Payment account information</li>
        <li>Wallet address</li>
        <li>Payment username or account identifier</li>
        <li>Transaction details</li>
        <li>Withdrawal history</li>
      </UL>
      <p>Users are responsible for ensuring that their withdrawal information is accurate.</p>
      <p>We may share necessary payment information with trusted payment providers when required to process a withdrawal.</p>

      <S>2.6 Information Provided to Customer Support</S>
      <p>When you contact Picoworker.xyz support, we may collect information that you provide, such as:</p>
      <UL>
        <li>Your name</li>
        <li>Email address</li>
        <li>Account details</li>
        <li>Screenshots</li>
        <li>Messages</li>
        <li>Information relating to a technical issue or payment request</li>
      </UL>
      <p>Please do not send passwords, private security codes, or unnecessary sensitive information to customer support.</p>

      <H>3. How We Use Your Information</H>
      <p>Picoworker.xyz may use collected information for purposes including:</p>
      <UL>
        <li>Creating and managing user accounts</li>
        <li>Providing access to tasks and offers</li>
        <li>Tracking reward activity</li>
        <li>Processing approved earnings</li>
        <li>Processing withdrawal requests</li>
        <li>Providing customer support</li>
        <li>Communicating important account information</li>
        <li>Improving website functionality</li>
        <li>Detecting technical problems</li>
        <li>Preventing fraud and abuse</li>
        <li>Protecting users and our business partners</li>
        <li>Enforcing our Terms &amp; Conditions</li>
        <li>Complying with applicable legal obligations</li>
      </UL>
      <p>We aim to use information only where there is a legitimate reason to do so.</p>

      <H>4. Fraud Prevention and Platform Security</H>
      <p>Because Picoworker.xyz provides earning opportunities and rewards, protecting the platform from fraud is important.</p>
      <p>We may use account, technical, and activity information to detect or investigate:</p>
      <UL>
        <li>Multiple accounts</li>
        <li>Suspicious activity</li>
        <li>Fake task completions</li>
        <li>Invalid offer activity</li>
        <li>Unauthorized account access</li>
        <li>Payment fraud</li>
        <li>Location manipulation</li>
        <li>Abuse of promotions or referrals</li>
        <li>Automated or artificial activity</li>
        <li>Other violations of our Terms &amp; Conditions</li>
      </UL>
      <p>Where reasonably necessary, fraud-prevention systems may automatically identify activity that requires additional review.</p>
      <p>Automated security checks may help us detect unusual patterns, but important account decisions may also involve additional review.</p>

      <H>5. How We Share Information</H>
      <p>Picoworker.xyz does not sell your personal information simply for another company to use for its own unrelated purposes.</p>
      <p>However, we may share limited or necessary information in certain situations.</p>

      <S>5.1 Third-Party Offer and Survey Providers</S>
      <p>When you access a third-party offer, survey, game, or service through Picoworker.xyz, certain information may be shared or made available as necessary to:</p>
      <UL>
        <li>Provide the offer</li>
        <li>Confirm eligibility</li>
        <li>Track completion</li>
        <li>Detect fraud</li>
        <li>Approve rewards</li>
      </UL>
      <p>Third-party providers operate under their own terms and privacy policies.</p>
      <p>Their collection and use of information may be different from Picoworker.xyz.</p>

      <S>5.2 Payment Providers</S>
      <p>We may share necessary information with payment providers to process approved withdrawal requests.</p>
      <p>The information shared may depend on the payment method selected by the user.</p>

      <S>5.3 Service Providers</S>
      <p>We may use trusted third-party service providers to help operate our platform.</p>
      <p>These providers may assist with services such as:</p>
      <UL>
        <li>Website hosting</li>
        <li>Security</li>
        <li>Analytics</li>
        <li>Email communication</li>
        <li>Customer support</li>
        <li>Fraud prevention</li>
        <li>Payment processing</li>
      </UL>
      <p>Where appropriate, these providers may process information only as necessary to provide services to Picoworker.xyz.</p>

      <S>5.4 Legal and Security Requirements</S>
      <p>We may disclose information where reasonably necessary to:</p>
      <UL>
        <li>Comply with applicable law.</li>
        <li>Respond to lawful requests.</li>
        <li>Protect the rights and safety of Picoworker.xyz.</li>
        <li>Protect our users.</li>
        <li>Prevent fraud.</li>
        <li>Investigate abuse or security incidents.</li>
        <li>Enforce our Terms &amp; Conditions.</li>
      </UL>

      <H>6. Third-Party Websites and Services</H>
      <p>Picoworker.xyz may contain links to or provide access to third-party websites and services.</p>
      <p>These may include:</p>
      <UL>
        <li>Offerwalls</li>
        <li>Survey providers</li>
        <li>Advertisers</li>
        <li>Mobile applications</li>
        <li>Payment providers</li>
        <li>Other partner services</li>
      </UL>
      <p>Once you leave Picoworker.xyz or access a third-party service, that service may collect information according to its own privacy practices.</p>
      <p>Picoworker.xyz is not responsible for the privacy practices of independent third-party websites or services.</p>
      <p>We encourage users to read the privacy policy of any third-party service before providing personal information.</p>

      <H>7. Cookies and Similar Technologies</H>
      <p>Picoworker.xyz may use cookies and similar technologies to help our website function properly.</p>
      <p>Cookies may be used for purposes such as:</p>
      <UL>
        <li>Keeping users logged in</li>
        <li>Remembering preferences</li>
        <li>Improving website performance</li>
        <li>Understanding how users interact with the website</li>
        <li>Preventing fraud</li>
        <li>Maintaining security</li>
      </UL>
      <p>Users may be able to control certain cookies through their browser settings.</p>
      <p>However, disabling certain cookies may affect the functionality of Picoworker.xyz.</p>

      <H>8. Data Security</H>
      <p>We take reasonable measures designed to protect information against:</p>
      <UL>
        <li>Unauthorized access</li>
        <li>Unauthorized disclosure</li>
        <li>Loss</li>
        <li>Misuse</li>
        <li>Alteration</li>
        <li>Security threats</li>
      </UL>
      <p>These measures may include technical, administrative, and organizational safeguards.</p>
      <p>However, no website, internet connection, or data storage system can guarantee complete security.</p>
      <p>Users are also responsible for protecting their account credentials and using secure passwords.</p>

      <H>9. Data Retention</H>
      <p>We may keep information for as long as reasonably necessary for purposes such as:</p>
      <UL>
        <li>Maintaining your account</li>
        <li>Providing our services</li>
        <li>Processing withdrawals</li>
        <li>Resolving disputes</li>
        <li>Preventing fraud</li>
        <li>Meeting legal or regulatory obligations</li>
        <li>Enforcing our Terms &amp; Conditions</li>
      </UL>
      <p>The amount of time information is retained may depend on the type of information and the reason it was collected.</p>
      <p>When information is no longer reasonably required, we may delete, anonymize, or securely store it as required or permitted by applicable law.</p>

      <H>10. Your Privacy Choices</H>
      <p>Depending on your location and applicable law, you may have certain rights relating to your personal information.</p>
      <p>These rights may include the ability to:</p>
      <UL>
        <li>Request access to certain personal information.</li>
        <li>Request correction of inaccurate information.</li>
        <li>Request deletion of certain information.</li>
        <li>Request information about how your data is used.</li>
        <li>Manage certain communication preferences.</li>
      </UL>
      <p>Some requests may be limited where we need to retain information for legal, security, fraud-prevention, accounting, or other legitimate purposes.</p>
      <p>To request assistance regarding your information, please contact Picoworker.xyz through our official support channels.</p>

      <H>11. Account Deletion</H>
      <p>Users may request deletion of their Picoworker.xyz account, subject to applicable requirements.</p>
      <p>Before deleting an account, users should ensure that:</p>
      <UL>
        <li>Any pending withdrawals have been addressed.</li>
        <li>Important account information has been reviewed.</li>
        <li>They understand that deleted accounts may no longer be recoverable.</li>
      </UL>
      <p>Even after an account is deleted, certain information may need to be retained for a limited period where necessary for:</p>
      <UL>
        <li>Legal compliance</li>
        <li>Fraud prevention</li>
        <li>Security</li>
        <li>Accounting</li>
        <li>Dispute resolution</li>
      </UL>

      <H>12. Children's Privacy</H>
      <p>Picoworker.xyz is not intended for individuals who are below the minimum age required to use our services under applicable law.</p>
      <p>We do not knowingly allow users who do not meet the applicable minimum age requirements to create accounts.</p>
      <p>If we learn that an account does not meet applicable age requirements, we may take appropriate action, including restricting or closing the account.</p>

      <H>13. International Use and Data Processing</H>
      <p>Picoworker.xyz may be accessible to users from different countries.</p>
      <p>By using our services, you understand that information may be processed in locations where Picoworker.xyz, its service providers, or its partners operate.</p>
      <p>Data protection laws may differ between countries.</p>
      <p>Where applicable, we take reasonable steps to process information in accordance with relevant legal and contractual requirements.</p>

      <H>14. Business Transfers</H>
      <p>If Picoworker.xyz is involved in a merger, acquisition, restructuring, investment, or sale of business assets, relevant information may be transferred as part of that transaction where permitted by applicable law.</p>
      <p>Any such transfer would be subject to appropriate legal and privacy requirements.</p>

      <H>15. Changes to This Privacy Policy</H>
      <p>We may update this Privacy Policy from time to time.</p>
      <p>When changes are made, we will update the Last Updated date at the top of this page.</p>
      <p>For significant changes, we may provide additional notice where reasonably appropriate.</p>
      <p>We encourage users to review this Privacy Policy periodically.</p>

      <H>16. Contact Us</H>
      <p>If you have questions about this Privacy Policy, your personal information, or how your information is handled, please contact Picoworker.xyz through our official support channels.</p>
      <p>When contacting us, please do not send your password or private security credentials.</p>

      <H>17. Acceptance of This Privacy Policy</H>
      <p>By creating an account, accessing Picoworker.xyz, or using our services, you acknowledge that you have read and understood this Privacy Policy.</p>
      <p>If you do not agree with this Privacy Policy, please do not use Picoworker.xyz or provide information through our services.</p>
    </LegalLayout>
  )
}
