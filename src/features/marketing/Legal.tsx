import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BrandMark } from '../../components/layout'

const UPDATED = 'August 30, 2026'

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
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
        <p className="text-[var(--ink-4)] text-[13px] font-semibold mt-2 mb-8">Last updated: {UPDATED}</p>
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
    <LegalLayout title="Terms & Conditions">
      <p>Welcome to Picoworker.xyz.</p>

      <p>Picoworker.xyz is an online rewards platform that allows eligible users to discover and complete available tasks, offers, surveys, games, promotions, and other earning opportunities provided by Picoworker.xyz and/or its third-party partners.</p>

      <p>Please read these Terms &amp; Conditions carefully before using our website and services.</p>

      <p>By creating an account, accessing Picoworker.xyz, or using any part of our services, you agree to these Terms &amp; Conditions. If you do not agree with these terms, please do not use our website or services.</p>

      <H>1. About Picoworker.xyz</H>
      <p>Picoworker.xyz provides users with access to earning opportunities that may include:</p>
      <UL>
        <li>Surveys</li>
        <li>Offerwalls</li>
        <li>Mobile applications and games</li>
        <li>Website and product testing</li>
        <li>Sign-up offers</li>
        <li>Promotional campaigns</li>
        <li>Research opportunities</li>
        <li>Digital tasks</li>
        <li>Partner-provided offers</li>
        <li>Other online activities made available through our platform</li>
      </UL>
      <p>Some opportunities are provided directly through Picoworker.xyz, while others are provided by independent third-party companies and offerwall partners.</p>
      <p>Availability, eligibility, rewards, and completion requirements may vary depending on the user, country, device, location, partner requirements, and other factors.</p>
      <p>Picoworker.xyz does not guarantee that a specific task or offer will always be available to every user.</p>

      <H>2. Eligibility</H>
      <p>To use Picoworker.xyz, you must:</p>
      <UL>
        <li>Be legally allowed to use online services in your country or region.</li>
        <li>Provide accurate and truthful information.</li>
        <li>Use your own identity and personal information.</li>
        <li>Comply with these Terms &amp; Conditions.</li>
        <li>Comply with all applicable laws and regulations.</li>
        <li>Meet any age requirements required by Picoworker.xyz or a third-party partner.</li>
      </UL>
      <p>Certain offers, surveys, applications, or services may have additional eligibility requirements.</p>
      <p>If a third-party provider requires users to be a certain age, live in a specific country, use a particular device, or meet any other condition, users must meet those requirements before participating.</p>

      <H>3. One Person, One Account</H>
      <p>Each person is generally allowed to maintain one Picoworker.xyz account only.</p>
      <p>Creating or operating multiple accounts for the purpose of earning additional rewards, abusing promotions, completing the same offers multiple times, or bypassing platform restrictions is strictly prohibited.</p>
      <p>Users must not:</p>
      <UL>
        <li>Create multiple accounts.</li>
        <li>Operate accounts belonging to other people.</li>
        <li>Share their accounts with others.</li>
        <li>Buy or sell Picoworker.xyz accounts.</li>
        <li>Transfer ownership of an account.</li>
        <li>Allow another person to complete tasks using their account.</li>
        <li>Use another person's identity to create an account.</li>
      </UL>
      <p>If multiple accounts or related accounts are detected, Picoworker.xyz may investigate the accounts and take appropriate action.</p>

      <H>4. Accurate Information</H>
      <p>Users are responsible for providing accurate, current, and truthful information.</p>
      <p>You must not provide:</p>
      <UL>
        <li>Fake names or identities.</li>
        <li>False personal information.</li>
        <li>False demographic information.</li>
        <li>Incorrect country or location information.</li>
        <li>Fake verification details.</li>
        <li>Information belonging to another person without authorization.</li>
      </UL>
      <p>Providing false or misleading information may result in:</p>
      <UL>
        <li>Task rejection.</li>
        <li>Offer cancellation.</li>
        <li>Reward reversal.</li>
        <li>Account restrictions.</li>
        <li>Withdrawal delays.</li>
        <li>Account suspension or termination.</li>
      </UL>

      <H>5. Location, VPN, Proxy and Location Manipulation</H>
      <p>Some offers are only available to users in specific countries or regions.</p>
      <p>Users must access and complete offers only when they are genuinely eligible.</p>
      <p>You must not intentionally manipulate your location in order to access offers that are not available to you.</p>
      <p>This may include, but is not limited to:</p>
      <UL>
        <li>Using a VPN to appear in another country.</li>
        <li>Using a proxy to hide or manipulate your location.</li>
        <li>Using location spoofing tools.</li>
        <li>Using fake GPS applications.</li>
        <li>Providing false country information.</li>
      </UL>
      <p>The use of privacy tools is not automatically considered a violation. However, users must not use such tools to deceive Picoworker.xyz or its partners, bypass geographic restrictions, or gain access to offers for which they are not eligible.</p>
      <p>If a partner rejects an offer because of location manipulation or ineligibility, Picoworker.xyz may also reverse any associated pending or credited reward.</p>

      <H>6. Completing Tasks and Offers</H>
      <p>Users must complete tasks honestly and according to the instructions provided.</p>
      <p>Users should carefully read all requirements before starting an offer or task.</p>
      <p>A reward may only be earned when the applicable requirements have been successfully completed and, where applicable, confirmed by the relevant advertiser, offerwall provider, or partner.</p>
      <p>Users must not:</p>
      <UL>
        <li>Submit fake proof.</li>
        <li>Submit copied proof.</li>
        <li>Submit edited or manipulated screenshots intended to mislead.</li>
        <li>Submit incomplete work as completed.</li>
        <li>Reuse the same proof for multiple tasks unless specifically permitted.</li>
        <li>Claim a reward for an activity that was not genuinely completed.</li>
        <li>Attempt to complete the same offer repeatedly when only one completion is allowed.</li>
      </UL>
      <p>A task being visible on Picoworker.xyz does not guarantee that every user will qualify for or successfully complete it.</p>

      <H>7. Surveys and Third-Party Offers</H>
      <p>Many opportunities available on Picoworker.xyz may be provided by independent third-party companies.</p>
      <p>These providers may use their own systems to determine:</p>
      <UL>
        <li>User eligibility.</li>
        <li>Survey qualification.</li>
        <li>Offer availability.</li>
        <li>Completion tracking.</li>
        <li>Reward approval.</li>
        <li>Fraud detection.</li>
        <li>Offer reversals.</li>
      </UL>
      <p>For example, a user may begin a survey but not qualify based on the survey provider's requirements.</p>
      <p>Similarly, an offer may not track correctly or may remain pending while the partner verifies completion.</p>
      <p>Picoworker.xyz does not control every decision made by third-party providers.</p>
      <p>Where a third-party provider rejects, reverses, or declines an offer, Picoworker.xyz may not be able to manually override that decision.</p>

      <H>8. Pending Rewards</H>
      <p>Some rewards may appear as pending before becoming available in a user's balance.</p>
      <p>A pending reward means that the activity may still be undergoing verification by:</p>
      <UL>
        <li>The advertiser.</li>
        <li>The offerwall provider.</li>
        <li>The survey provider.</li>
        <li>The tracking system.</li>
        <li>Picoworker.xyz fraud prevention systems.</li>
      </UL>
      <p>Pending rewards are not guaranteed earnings until they have been successfully approved and credited as available earnings.</p>
      <p>The verification period may vary depending on the partner and the type of offer.</p>
      <p>Users should not assume that an offer is permanently approved until the reward has been fully credited and becomes available for withdrawal according to the applicable rules.</p>

      <H>9. Reversed or Cancelled Rewards</H>
      <p>A reward may be reversed or removed if an advertiser, offerwall provider, or Picoworker.xyz determines that the activity was invalid.</p>
      <p>Possible reasons may include:</p>
      <UL>
        <li>Fraudulent activity.</li>
        <li>Duplicate completion.</li>
        <li>Multiple accounts.</li>
        <li>False information.</li>
        <li>Location manipulation.</li>
        <li>Failure to meet offer requirements.</li>
        <li>Incomplete activity.</li>
        <li>Chargebacks or advertiser disputes.</li>
        <li>Technical errors.</li>
        <li>Invalid tracking.</li>
        <li>Abuse of promotions.</li>
        <li>Use of unauthorized automation.</li>
      </UL>
      <p>If an offer is reversed by the provider, Picoworker.xyz may remove the corresponding reward from the user's balance.</p>
      <p>If the reward has already been withdrawn, Picoworker.xyz may investigate the situation and take appropriate action in accordance with these Terms.</p>

      <H>10. Bots, Automation and Artificial Activity</H>
      <p>Picoworker.xyz is designed for genuine user participation.</p>
      <p>Users must not use unauthorized methods to automate tasks or manipulate platform activity.</p>
      <p>Prohibited activities include:</p>
      <UL>
        <li>Bots.</li>
        <li>Auto-clickers.</li>
        <li>Automated scripts.</li>
        <li>Task automation software.</li>
        <li>Artificial traffic generation.</li>
        <li>Emulators used for fraudulent activity.</li>
        <li>Automated account creation.</li>
        <li>Automated survey completion.</li>
        <li>Tools designed to bypass fraud detection.</li>
      </UL>
      <p>Using technology for ordinary accessibility purposes or legitimate device functionality is not prohibited simply because it is automated.</p>
      <p>However, tools or methods used to gain an unfair advantage or falsely simulate human activity are prohibited.</p>

      <H>11. Prohibited Activities</H>
      <p>Users must not use Picoworker.xyz for any illegal, deceptive, harmful, or fraudulent purpose.</p>
      <p>The following activities are prohibited:</p>

      <S>Fraud</S>
      <UL>
        <li>Creating multiple accounts.</li>
        <li>Using fake identities.</li>
        <li>Using stolen information.</li>
        <li>Submitting fake proofs.</li>
        <li>Manipulating offer tracking.</li>
        <li>Attempting to generate artificial rewards.</li>
        <li>Abusing referral programs.</li>
        <li>Completing offers on behalf of multiple people.</li>
        <li>Attempting to bypass security systems.</li>
      </UL>

      <S>Spam</S>
      <p>Users must not use Picoworker.xyz tasks to send:</p>
      <UL>
        <li>Unsolicited messages.</li>
        <li>Mass spam.</li>
        <li>Unwanted promotional messages.</li>
        <li>Misleading advertisements.</li>
        <li>Harmful links.</li>
      </UL>

      <S>Fake Reviews and Testimonials</S>
      <p>Users must not create false reviews or testimonials.</p>
      <p>Users should only provide genuine opinions based on real experiences where feedback tasks are permitted.</p>

      <S>Financial Misuse</S>
      <p>Picoworker.xyz must not be used for:</p>
      <UL>
        <li>Money laundering.</li>
        <li>Fraudulent transfers.</li>
        <li>Moving money between accounts for deceptive purposes.</li>
        <li>Using stolen payment methods.</li>
        <li>Financial scams.</li>
        <li>Requests for banking credentials.</li>
      </UL>

      <S>Illegal Activity</S>
      <p>Users must not use the platform to promote, support, facilitate, or participate in illegal activities.</p>

      <H>12. Personal and Financial Information</H>
      <p>Users should never share sensitive personal information unless it is clearly required by a legitimate and trusted service.</p>
      <p>Picoworker.xyz will not intentionally request users to publicly provide:</p>
      <UL>
        <li>Bank passwords.</li>
        <li>Credit card passwords.</li>
        <li>Financial account passwords.</li>
        <li>Private security codes.</li>
        <li>Sensitive login credentials.</li>
      </UL>
      <p>Users should remain cautious when interacting with third-party services.</p>
      <p>If a third-party offer requests sensitive information, users should carefully review that provider's terms and privacy practices before continuing.</p>

      <H>13. Account Security</H>
      <p>You are responsible for maintaining the security of your account.</p>
      <p>You must:</p>
      <UL>
        <li>Keep your password confidential.</li>
        <li>Use a strong password.</li>
        <li>Avoid sharing login information.</li>
        <li>Notify us if you believe your account has been accessed without permission.</li>
      </UL>
      <p>Picoworker.xyz is not responsible for losses resulting from a user's failure to protect their login credentials.</p>

      <H>14. Third-Party Websites and Services</H>
      <p>Picoworker.xyz may provide access to third-party websites, applications, offerwalls, advertisers, survey providers, payment providers, and other services.</p>
      <p>These third parties operate independently.</p>
      <p>Their services may be subject to their own:</p>
      <UL>
        <li>Terms and Conditions.</li>
        <li>Privacy Policies.</li>
        <li>Eligibility Rules.</li>
        <li>Reward Policies.</li>
        <li>Fraud Prevention Rules.</li>
      </UL>
      <p>Picoworker.xyz is not responsible for the content, availability, policies, products, services, or actions of independent third parties.</p>
      <p>Users should review the applicable terms of third-party services before using them.</p>

      <H>15. No Guaranteed Earnings</H>
      <p>Picoworker.xyz provides opportunities to earn rewards when eligible activities are successfully completed and approved.</p>
      <p>However, we do not guarantee:</p>
      <UL>
        <li>A specific amount of earnings.</li>
        <li>A minimum daily income.</li>
        <li>A minimum monthly income.</li>
        <li>The availability of specific offers.</li>
        <li>Qualification for surveys.</li>
        <li>Approval of every completed activity.</li>
      </UL>
      <p>Your earnings may depend on factors such as:</p>
      <UL>
        <li>Your location.</li>
        <li>Available offers.</li>
        <li>Eligibility.</li>
        <li>Device compatibility.</li>
        <li>Partner requirements.</li>
        <li>Successful tracking.</li>
        <li>Verification results.</li>
      </UL>
      <p>Picoworker.xyz should not be considered a guaranteed source of employment or income.</p>

      <H>16. Withdrawals</H>
      <p>Users may request withdrawals when they meet the applicable withdrawal requirements.</p>
      <p>Withdrawal requirements may include:</p>
      <UL>
        <li>A minimum withdrawal amount.</li>
        <li>Availability of a supported payment method.</li>
        <li>Account verification.</li>
        <li>Fraud and security review.</li>
        <li>Successful approval of earnings.</li>
      </UL>
      <p>Picoworker.xyz may delay or temporarily hold a withdrawal when additional review is reasonably necessary to protect users, partners, or the platform.</p>
      <p>Users are responsible for providing accurate withdrawal information.</p>
      <p>Picoworker.xyz may not be responsible for losses caused by incorrect payment information provided by the user.</p>

      <H>17. Withdrawal Review and Security Checks</H>
      <p>Before processing a withdrawal, Picoworker.xyz may perform reasonable security and fraud checks.</p>
      <p>These checks may be designed to identify:</p>
      <UL>
        <li>Duplicate accounts.</li>
        <li>Suspicious activity.</li>
        <li>Unusual earning patterns.</li>
        <li>Invalid offer completions.</li>
        <li>Unauthorized account access.</li>
        <li>Payment fraud.</li>
      </UL>
      <p>During a review, access to certain earnings or withdrawal functions may be temporarily limited.</p>
      <p>Where appropriate and legally permitted, Picoworker.xyz may request additional information to verify account ownership or eligibility.</p>

      <H>18. Account Suspension and Termination</H>
      <p>Picoworker.xyz may restrict, suspend, or terminate an account when we reasonably believe that a user has violated these Terms or engaged in fraudulent, abusive, or harmful activity.</p>
      <p>Depending on the situation, action may include:</p>
      <UL>
        <li>A warning.</li>
        <li>Temporary restriction.</li>
        <li>Task restriction.</li>
        <li>Withdrawal review.</li>
        <li>Reward reversal.</li>
        <li>Account suspension.</li>
        <li>Permanent account termination.</li>
      </UL>
      <p>Serious violations may result in immediate action without prior warning where necessary to protect the platform, users, advertisers, or partners.</p>

      <H>19. Fraud Investigations</H>
      <p>Picoworker.xyz may investigate suspicious activity.</p>
      <p>During an investigation, we may:</p>
      <UL>
        <li>Review account activity.</li>
        <li>Review device and security information.</li>
        <li>Review task completion history.</li>
        <li>Review offer tracking information.</li>
        <li>Contact relevant third-party partners.</li>
        <li>Temporarily restrict withdrawals.</li>
        <li>Request reasonable verification.</li>
      </UL>
      <p>Users are expected to cooperate with legitimate investigations relating to their account.</p>
      <p>Failure to provide requested information within a reasonable period may affect the availability of certain services.</p>

      <H>20. Balance and Earnings</H>
      <p>The balance displayed in a user's Picoworker.xyz account represents the platform's record of rewards associated with the account.</p>
      <p>Some rewards may be:</p>
      <UL>
        <li>Pending.</li>
        <li>Under review.</li>
        <li>Approved.</li>
        <li>Reversed.</li>
        <li>Available for withdrawal.</li>
      </UL>
      <p>A displayed pending reward does not necessarily mean that the reward is permanently approved.</p>
      <p>Picoworker.xyz may correct obvious technical, accounting, tracking, or system errors where reasonably necessary.</p>

      <H>21. Technical Errors</H>
      <p>Although we work to maintain accurate systems, technical errors may occasionally occur.</p>
      <p>These may include:</p>
      <UL>
        <li>Incorrect reward amounts.</li>
        <li>Duplicate credits.</li>
        <li>Tracking errors.</li>
        <li>Display errors.</li>
        <li>System interruptions.</li>
      </UL>
      <p>Picoworker.xyz reserves the right to investigate and correct genuine technical errors.</p>
      <p>Users must not knowingly exploit an error or system malfunction to obtain rewards they were not entitled to receive.</p>

      <H>22. Intellectual Property</H>
      <p>The Picoworker.xyz website, branding, design, content, software, logos, and other materials are protected by applicable intellectual property laws.</p>
      <p>Users may not copy, reproduce, sell, redistribute, modify, or commercially exploit our content without permission.</p>
      <p>This does not prevent users from sharing official Picoworker.xyz links or promotional materials that we have made available for public sharing.</p>

      <H>23. Platform Availability</H>
      <p>We aim to provide a reliable service, but we cannot guarantee uninterrupted access at all times.</p>
      <p>The website may occasionally be unavailable due to:</p>
      <UL>
        <li>Maintenance.</li>
        <li>Technical problems.</li>
        <li>Security updates.</li>
        <li>Third-party service interruptions.</li>
        <li>Events outside our reasonable control.</li>
      </UL>
      <p>We may modify, update, suspend, or discontinue parts of the platform when reasonably necessary.</p>

      <H>24. Privacy</H>
      <p>Your use of Picoworker.xyz is also subject to our <Link to="/privacy" className="text-[var(--accent-strong)]">Privacy Policy</Link>.</p>
      <p>Our Privacy Policy explains how certain information may be collected, used, stored, and protected.</p>
      <p>By using Picoworker.xyz, you acknowledge that certain information may be processed as necessary to operate the platform, prevent fraud, improve security, provide customer support, and comply with applicable legal requirements.</p>

      <H>25. Changes to These Terms</H>
      <p>Picoworker.xyz may update these Terms &amp; Conditions from time to time.</p>
      <p>When significant changes are made, we may update the "Last Updated" date and, where appropriate, provide additional notice.</p>
      <p>Your continued use of Picoworker.xyz after updated Terms become effective means that you accept the updated Terms.</p>

      <H>26. Limitation of Liability</H>
      <p>Picoworker.xyz provides its services on an "as available" basis.</p>
      <p>We make reasonable efforts to maintain the security and functionality of our platform, but we cannot guarantee that:</p>
      <UL>
        <li>Every offer will track successfully.</li>
        <li>Every user will qualify for every offer.</li>
        <li>Third-party services will always be available.</li>
        <li>Technical systems will operate without interruption.</li>
      </UL>
      <p>To the extent permitted by applicable law, Picoworker.xyz will not be responsible for indirect losses resulting from third-party services, technical interruptions, user errors, or circumstances outside our reasonable control.</p>
      <p>Nothing in these Terms is intended to limit rights that cannot legally be excluded under applicable law.</p>

      <H>27. Contact and Support</H>
      <p>If you have questions about these Terms &amp; Conditions, your account, rewards, or withdrawals, please contact Picoworker.xyz through our official support channels.</p>
      <p>When contacting support, please provide accurate information and avoid sharing sensitive passwords or security credentials.</p>

      <H>28. Acceptance of These Terms</H>
      <p>By creating an account or using Picoworker.xyz, you confirm that you have read, understood, and agreed to these Terms &amp; Conditions.</p>
      <p>If you do not agree with these Terms, you should not create an account or continue using the platform.</p>
    </LegalLayout>
  )
}

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
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
