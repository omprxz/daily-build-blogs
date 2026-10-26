import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShieldCheck, FileText, HelpCircle } from 'lucide-react';
import { Faq, FaqItem } from '../components/ui/rare/faq.js';

const StaticWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
      <Link to="/" className="hover:text-primary font-medium">Home</Link>
      <ChevronRight className="w-3 h-3 text-ink-400" />
      <span className="text-ink-700 dark:text-ink-300 font-medium">{title}</span>
    </nav>

    <div className="editorial-card rounded-3xl p-6 sm:p-10 border border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] shadow-sm">
      <div className="prose-editorial">
        {children}
      </div>
    </div>
  </main>
);

const editorialFaqItems: FaqItem[] = [
  {
    id: "faq-1",
    question: "How does Daily Build fact-check its engineering dispatches?",
    answer: "Every article is corroborated directly against official engineering blogs, open-source repositories (commits, PRs), release notes, and verified benchmark suites."
  },
  {
    id: "faq-2",
    question: "Do you accept sponsored product reviews or paid rankings?",
    answer: "No. Daily Build maintains strict editorial independence. We do not accept payment, affiliate kickbacks, or promotional considerations for reviewing developer tools or models."
  },
  {
    id: "faq-3",
    question: "How can I suggest a correction or update for a technical dispatch?",
    answer: "You can email our technology desk directly at omprxz@gmail.com with the article link and supporting primary documentation. We review corrections within 24 hours."
  },
  {
    id: "faq-4",
    question: "Can I syndicate or republish Daily Build articles?",
    answer: "Articles may be referenced and quoted with direct attribution and links. For full syndication or enterprise redistribution, please contact our editorial desk."
  }
];

export const AboutPage: React.FC = () => (
  <StaticWrapper title="About">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 mb-4">
      <FileText className="w-3.5 h-3.5" />
      <span>PUBLICATION MANIFESTO</span>
    </div>
    <h1 className="text-3xl sm:text-4xl font-black text-ink-950 dark:text-white tracking-tight">About Daily Build</h1>
    <p>
      Daily Build is an independent technology publication reporting on the vanguard of software development, artificial intelligence systems, cloud architectures, and developer productivity tooling.
    </p>
    <h2>Our Mission</h2>
    <p>
      We aim to cut through generic news aggregations with clear, in-depth, verified editorial coverage. Every dispatch is written for practicing developers, system engineers, and technology leaders.
    </p>
    <h2>Independence &amp; Integrity</h2>
    <p>
      Daily Build maintains strict editorial independence. Stories and reviews reflect genuine engineering analysis without commercial advertiser interference or sponsored placement.
    </p>
    <h2>Visual Editorial Philosophy</h2>
    <p>
      Our visual artwork reflects a deliberate aesthetic choice: hand-drawn minimalist editorial illustration, clean ink linework, and restrained tonal palettes that emphasize conceptual depth over visual clutter.
    </p>

    <div className="mt-12 pt-8 border-t border-ink-150 dark:border-white/[0.08]">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-4 h-4 text-primary" />
        <h3 className="text-lg font-bold text-ink-950 dark:text-white font-mono uppercase tracking-wider">
          Frequently Asked Questions
        </h3>
      </div>
      <Faq 
        items={editorialFaqItems}
        accent="var(--primary, #4F46E5)"
      />
    </div>
  </StaticWrapper>
);

export const EditorialPolicyPage: React.FC = () => (
  <StaticWrapper title="Editorial Guidelines">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/40 mb-4">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
      <span>STANDARDS &amp; VERIFICATION</span>
    </div>
    <h1 className="text-3xl sm:text-4xl font-black text-ink-950 dark:text-white tracking-tight">Editorial Guidelines</h1>
    <p>
      Our readers rely on Daily Build for accurate, timely, and impartial technology coverage. We uphold rigorous standards for verification and clarity.
    </p>
    <h2>Primary Verification</h2>
    <p>
      We verify factual statements and architectural claims directly against primary documentation, open-source repositories, benchmarks, and confirmed announcements.
    </p>
    <h2>AI &amp; Automation Transparency</h2>
    <p>
      While automation aids in topic discovery, all generated content is reviewed against factual sources.
    </p>
    <h2>Independence</h2>
    <p>
      Editorial coverage is produced free from commercial sponsorship influence.
    </p>

    <div className="mt-12 pt-8 border-t border-ink-150 dark:border-white/[0.08]">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-4 h-4 text-primary" />
        <h3 className="text-lg font-bold text-ink-950 dark:text-white font-mono uppercase tracking-wider">
          Editorial &amp; Verification FAQ
        </h3>
      </div>
      <Faq 
        items={editorialFaqItems}
        accent="var(--primary, #4F46E5)"
      />
    </div>
  </StaticWrapper>
);

export const CorrectionsPolicyPage: React.FC = () => (
  <StaticWrapper title="Corrections Policy">
    <h1 className="text-3xl sm:text-4xl font-black text-ink-950 dark:text-white tracking-tight">Corrections Policy</h1>
    <p>
      Accuracy is foundational to our work. When errors are identified, we address and correct them promptly.
    </p>
    <h2>Correction Workflow</h2>
    <ul>
      <li>Factual errors are updated immediately.</li>
      <li>Significant changes include an editorial clarification note at the bottom of the article.</li>
      <li>Minor grammatical or formatting corrections are implemented directly.</li>
    </ul>
    <h2>Contact Editorial</h2>
    <p>
      To submit a correction, email our editorial desk at <a href="mailto:omprxz@gmail.com" className="text-primary font-bold underline">omprxz@gmail.com</a> with article links and verified documentation.
    </p>
  </StaticWrapper>
);

export const PrivacyPolicyPage: React.FC = () => (
  <StaticWrapper title="Privacy Policy">
    <h1 className="text-3xl sm:text-4xl font-black text-ink-950 dark:text-white tracking-tight">Privacy Policy</h1>
    <p>
      Daily Build respects reader privacy. We do not track personal identifying information across external services.
    </p>
    <ul>
      <li><strong>Anonymous Metrics:</strong> Aggregated page view analytics to understand content popularity.</li>
      <li><strong>Newsletter:</strong> Email addresses provided for subscriptions are strictly used to dispatch daily digests and can be unsubscribed from with a single click.</li>
    </ul>
    <h2>Privacy &amp; Data Inquiries</h2>
    <p>
      For privacy-related questions, contact <a href="mailto:omprxz@gmail.com" className="text-primary font-bold underline">omprxz@gmail.com</a>.
    </p>
  </StaticWrapper>
);

export const TermsOfServicePage: React.FC = () => (
  <StaticWrapper title="Terms of Service">
    <h1 className="text-3xl sm:text-4xl font-black text-ink-950 dark:text-white tracking-tight">Terms of Service</h1>
    <p>
      By accessing Daily Build, you agree to these terms of service. All content is protected under applicable intellectual property laws.
    </p>
    <h2>Acceptable Use</h2>
    <p>
      Readers are welcome to read, bookmark, link to, and share our content for non-commercial educational and informative purposes.
    </p>
  </StaticWrapper>
);

export const TermsPage = TermsOfServicePage;
