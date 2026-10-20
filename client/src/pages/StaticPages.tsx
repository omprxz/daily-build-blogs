import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShieldCheck, FileText } from 'lucide-react';

const StaticWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
      <a href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">Home</a>
      <ChevronRight className="w-3 h-3 text-ink-400" />
      <span className="text-ink-700 dark:text-ink-300 font-medium">{title}</span>
    </nav>

    <div className="editorial-card rounded-3xl p-6 sm:p-10">
      <div className="prose-editorial">
        {children}
      </div>
    </div>
  </main>
);

export const AboutPage: React.FC = () => (
  <StaticWrapper title="About">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40 mb-3">
      <FileText className="w-3.5 h-3.5 text-indigo-500" />
      <span>PUBLICATION MANIFESTO</span>
    </div>
    <h1>About Daily Build</h1>
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
  </StaticWrapper>
);

export const EditorialPolicyPage: React.FC = () => (
  <StaticWrapper title="Editorial Guidelines">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/40 mb-3">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
      <span>STANDARDS &amp; VERIFICATION</span>
    </div>
    <h1>Editorial Guidelines</h1>
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
  </StaticWrapper>
);

export const CorrectionsPolicyPage: React.FC = () => (
  <StaticWrapper title="Corrections Policy">
    <h1>Corrections Policy</h1>
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
      To submit a correction, email our editorial desk at <a href="mailto:omprxz@gmail.com" className="text-indigo-600 underline">omprxz@gmail.com</a> with article links and verified documentation.
    </p>
  </StaticWrapper>
);

export const PrivacyPolicyPage: React.FC = () => (
  <StaticWrapper title="Privacy Policy">
    <h1>Privacy Policy</h1>
    <p>
      Daily Build respects reader privacy. We do not track personal identifying information across external services.
    </p>
    <ul>
      <li><strong>Anonymous Metrics:</strong> Aggregated page view analytics to understand content popularity.</li>
      <li><strong>Newsletter:</strong> Email addresses provided for subscriptions are strictly used to dispatch daily digests and can be unsubscribed from with a single click.</li>
    </ul>
    <h2>Privacy &amp; Data Inquiries</h2>
    <p>
      For privacy questions or data requests, contact our desk at <a href="mailto:omprxz@gmail.com" className="text-indigo-600 underline">omprxz@gmail.com</a>.
    </p>
  </StaticWrapper>
);

export const TermsPage: React.FC = () => (
  <StaticWrapper title="Terms of Service">
    <h1>Terms of Service</h1>
    <p>
      By accessing Daily Build, you agree to access its editorial content for lawful, personal informational purposes in accordance with standard web usage policies.
    </p>
  </StaticWrapper>
);
