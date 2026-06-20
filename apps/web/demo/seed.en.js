// =============================================================================
// Demo seed data (English) — realistic sample career workspace for careermate.life/demo.
// Loaded fresh into the in-memory demo DB on every page load (and on reset)
// when the UI language is English.
// Shapes mirror @careermate/shared *Record types (see packages/shared/src/schemas.ts).
// All timestamps are fixed strings so the demo is deterministic (no Date.now()).
// Ids, timestamps, scores, and array lengths are kept IDENTICAL to seed.js.
// =============================================================================

// Anchor "now" for relative-time rendering. Recent activity is dated near this.
const T = (iso) => iso; // readability helper

export function buildSeedEn() {
  return {
    profile: {
      id: 'p1',
      created_at: '2026-05-02T09:00:00.000Z',
      updated_at: '2026-06-14T11:20:00.000Z',
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1-206-555-0182',
      location: 'Seattle, WA',
      headline: 'Senior Backend Engineer · Payments & Settlement Domain',
      summary:
        'Backend engineer with 5 years of experience designing and operating high-throughput ' +
        'payment and settlement systems. Deep background in incident response and zero-downtime ' +
        'migrations. Overhauled the team\'s deployment pipeline, lifting release frequency from ' +
        'once a week to five times a day.',
      desired_roles: ['Backend Engineer', 'Platform Engineer'],
      desired_conditions: '$140K+ · Seattle / Remote-friendly · 2+ days WFH per week',
      preferred_tone: 'Concise and concrete · quantify impact with numbers',
      emphasis_points: ['Payments & settlement domain expertise', 'High-throughput system reliability', 'Team productivity improvement'],
      links: [
        { label: 'GitHub', url: 'https://github.com/example' },
        { label: 'Tech Blog', url: 'https://blog.example.com' },
      ],
    },

    experiences: [
      {
        id: 'e1', created_at: '2026-05-02T09:05:00.000Z', updated_at: '2026-05-02T09:05:00.000Z',
        company: 'PayCore', role: 'Senior Backend Engineer', employment_type: 'Full-time',
        start_date: '2022-03', end_date: null, is_current: true,
        description: 'Backend development and operations for a payment gateway and settlement system.',
        achievements: [
          'Reduced settlement batch processing time from 4 hours to 38 minutes (query tuning, indexing, parallelization)',
          'Improved payment authorization API p99 latency from 320 ms to 110 ms',
          'Eliminated monthly scheduled maintenance windows via zero-downtime DB migration',
        ],
        tech: ['Java', 'Spring', 'Kafka', 'MySQL', 'Redis', 'Kubernetes'],
        order_index: 0,
      },
      {
        id: 'e2', created_at: '2026-05-02T09:06:00.000Z', updated_at: '2026-05-02T09:06:00.000Z',
        company: 'CommerceLab', role: 'Backend Engineer', employment_type: 'Full-time',
        start_date: '2019-01', end_date: '2022-02', is_current: false,
        description: 'API development for the e-commerce order and inventory domain.',
        achievements: [
          'Fixed inventory concurrency bug causing oversells during flash sales by introducing distributed locking (0 oversell incidents since)',
          'Sole backend architect and implementer of a new recurring-subscription delivery feature',
        ],
        tech: ['Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
        order_index: 1,
      },
    ],

    projects: [
      {
        id: 'pr1', created_at: '2026-05-02T09:10:00.000Z', updated_at: '2026-05-02T09:10:00.000Z',
        name: 'Next-Generation Settlement System Re-architecture', role: 'Lead',
        description: 'Migrated legacy batch settlement to event-driven streaming settlement.',
        highlights: ['Introduced Kafka-based event sourcing', 'Automated settlement accuracy validation pipeline'],
        tech: ['Kafka', 'Java', 'Spring Batch'],
        url: 'https://github.com/example/settlement', start_date: '2023-06', end_date: '2024-01',
        order_index: 0,
      },
      {
        id: 'pr2', created_at: '2026-05-02T09:11:00.000Z', updated_at: '2026-05-02T09:11:00.000Z',
        name: 'Internal Deployment Pipeline Overhaul', role: 'Solo initiative',
        description: 'Automated canary deployments using GitHub Actions + ArgoCD.',
        highlights: ['Increased release frequency from 1×/week to 5×/day', 'Cut average rollback time from 12 minutes to 90 seconds'],
        tech: ['GitHub Actions', 'ArgoCD', 'Kubernetes'],
        url: null, start_date: '2024-02', end_date: '2024-05',
        order_index: 1,
      },
    ],

    skills: [
      { id: 's1', created_at: '2026-05-02T09:12:00.000Z', updated_at: '2026-05-02T09:12:00.000Z', name: 'Java / Spring', category: 'Languages & Frameworks', level: 'Expert', years: 5, order_index: 0 },
      { id: 's2', created_at: '2026-05-02T09:12:10.000Z', updated_at: '2026-05-02T09:12:10.000Z', name: 'Kafka', category: 'Infrastructure', level: 'Expert', years: 3, order_index: 1 },
      { id: 's3', created_at: '2026-05-02T09:12:20.000Z', updated_at: '2026-05-02T09:12:20.000Z', name: 'MySQL / PostgreSQL', category: 'Databases', level: 'Expert', years: 5, order_index: 2 },
      { id: 's4', created_at: '2026-05-02T09:12:30.000Z', updated_at: '2026-05-02T09:12:30.000Z', name: 'Kubernetes', category: 'Infrastructure', level: 'Intermediate', years: 3, order_index: 3 },
      { id: 's5', created_at: '2026-05-02T09:12:40.000Z', updated_at: '2026-05-02T09:12:40.000Z', name: 'TypeScript / Node.js', category: 'Languages & Frameworks', level: 'Intermediate', years: 3, order_index: 4 },
    ],

    documents: [
      {
        id: 'd1', created_at: '2026-05-03T10:00:00.000Z', updated_at: '2026-06-10T08:30:00.000Z',
        kind: 'resume', title: 'Alex Morgan — Resume (2026)', source: 'upload', is_primary: true,
        tags: ['backend', 'payments'],
        content:
          '# Alex Morgan — Backend Engineer\n\n## Summary\n5 years in payments & settlement. Strong in high-throughput reliability and team productivity.\n\n' +
          '## Key Achievements\n- Settlement batch: 4 h → 38 min\n- Payment API p99: 320 ms → 110 ms\n- Zero scheduled downtime via zero-downtime migration\n',
      },
      {
        id: 'd2', created_at: '2026-05-20T13:00:00.000Z', updated_at: '2026-05-20T13:00:00.000Z',
        kind: 'career_description', title: 'Career Description — PayCore', source: 'manual', is_primary: false,
        tags: ['payments'],
        content: '## PayCore (Mar 2022 – Present)\nPayment gateway & settlement backend. See individual project entries for detailed achievements.\n',
      },
    ],

    jobs: [
      {
        id: 'j1', created_at: '2026-06-01T09:00:00.000Z', updated_at: '2026-06-12T09:00:00.000Z',
        company: 'Stripe', position: 'Backend Engineer, Payments', url: 'https://example.com/jobs/j1',
        location: 'Seattle, WA', employment_type: 'Full-time',
        description: 'We are looking for a backend engineer to help build the core payments platform. Experience with high-volume transaction processing strongly preferred.',
        requirements: ['5+ years JVM-based backend', 'High-throughput traffic experience', 'Payments or financial domain a plus'],
        keywords: ['Java', 'Spring', 'Kafka', 'MSA', 'Payments'],
        deadline: '2026-06-30', source: 'LinkedIn',
      },
      {
        id: 'j2', created_at: '2026-06-03T09:00:00.000Z', updated_at: '2026-06-11T09:00:00.000Z',
        company: 'Amazon', position: 'Software Engineer, Backend', url: 'https://example.com/jobs/j2',
        location: 'Seattle, WA', employment_type: 'Full-time',
        description: 'Commerce order and settlement platform backend. Global-scale distributed systems.',
        requirements: ['Distributed systems design', 'Java or Kotlin', 'Ability to collaborate across time zones'],
        keywords: ['Java', 'Kotlin', 'AWS', 'Distributed Systems'],
        deadline: '2026-07-15', source: 'Company site',
      },
      {
        id: 'j3', created_at: '2026-06-05T09:00:00.000Z', updated_at: '2026-06-05T09:00:00.000Z',
        company: 'GitHub', position: 'Platform Engineer', url: 'https://example.com/jobs/j3',
        location: 'Remote (US)', employment_type: 'Full-time',
        description: 'Platform engineer to elevate internal developer productivity.',
        requirements: ['Kubernetes operations experience', 'CI/CD pipeline design', 'Go or Java'],
        keywords: ['Kubernetes', 'CI/CD', 'Platform', 'Go'],
        deadline: null, source: 'Manual entry',
      },
      {
        id: 'j4', created_at: '2026-05-25T09:00:00.000Z', updated_at: '2026-06-08T09:00:00.000Z',
        company: 'Adyen', position: 'Backend Engineer, Settlement', url: 'https://example.com/jobs/j4',
        location: 'San Francisco, CA', employment_type: 'Full-time',
        description: 'Settlement system backend. Batch and streaming settlement experience preferred.',
        requirements: ['Spring Batch experience', 'Settlement domain understanding', 'SQL optimization'],
        keywords: ['Java', 'Spring Batch', 'Settlement', 'MySQL'],
        deadline: '2026-06-22', source: 'LinkedIn',
      },
      {
        id: 'j5', created_at: '2026-05-15T09:00:00.000Z', updated_at: '2026-06-02T09:00:00.000Z',
        company: 'DoorDash', position: 'Server-Side Engineer', url: 'https://example.com/jobs/j5',
        location: 'San Francisco, CA', employment_type: 'Full-time',
        description: 'Order relay platform server-side development.',
        requirements: ['Java/Kotlin', 'High-volume traffic', 'Microservices experience'],
        keywords: ['Kotlin', 'Spring', 'MSA'],
        deadline: '2026-06-18', source: 'Company site',
      },
      {
        id: 'j6', created_at: '2026-06-10T09:00:00.000Z', updated_at: '2026-06-10T09:00:00.000Z',
        company: 'Brex', position: 'Backend Engineer', url: 'https://example.com/jobs/j6',
        location: 'Remote (US)', employment_type: 'Full-time',
        description: 'Banking core backend. Correctness and reliability come first.',
        requirements: ['Financial domain experience', 'Java', 'Culture of high test coverage'],
        keywords: ['Java', 'Finance', 'Spring'],
        deadline: '2026-07-05', source: 'Manual entry',
      },
    ],

    // job_id → application. status drives the pipeline + board.
    applications: [
      { id: 'a1', created_at: '2026-06-01T10:00:00.000Z', updated_at: '2026-06-13T10:00:00.000Z', job_id: 'j1', status: 'interview', resume_id: 'd1', cover_letter_id: 'c1', applied_at: '2026-06-06', notes: 'Passed first technical round — final interview with VP Eng scheduled' },
      { id: 'a2', created_at: '2026-06-03T10:00:00.000Z', updated_at: '2026-06-09T10:00:00.000Z', job_id: 'j2', status: 'applied', resume_id: 'd1', cover_letter_id: null, applied_at: '2026-06-09', notes: null },
      { id: 'a3', created_at: '2026-06-05T10:00:00.000Z', updated_at: '2026-06-05T10:00:00.000Z', job_id: 'j3', status: 'planned', resume_id: null, cover_letter_id: null, applied_at: null, notes: 'Working on cover letter' },
      { id: 'a4', created_at: '2026-05-25T10:00:00.000Z', updated_at: '2026-06-12T10:00:00.000Z', job_id: 'j4', status: 'document_passed', resume_id: 'd1', cover_letter_id: 'c2', applied_at: '2026-05-28', notes: 'Resume screened — coordinating interview schedule' },
      { id: 'a5', created_at: '2026-05-15T10:00:00.000Z', updated_at: '2026-06-02T10:00:00.000Z', job_id: 'j5', status: 'rejected', resume_id: 'd1', cover_letter_id: null, applied_at: '2026-05-18', notes: 'Rejected at resume screen' },
      { id: 'a6', created_at: '2026-06-10T10:00:00.000Z', updated_at: '2026-06-10T10:00:00.000Z', job_id: 'j6', status: 'draft', resume_id: null, cover_letter_id: null, applied_at: null, notes: null },
    ],

    fits: [
      {
        id: 'f1', created_at: '2026-06-02T09:30:00.000Z', updated_at: '2026-06-02T09:30:00.000Z', job_id: 'j1',
        score: 88, summary: 'Payments domain expertise and high-throughput traffic experience align strongly with the role requirements.',
        strengths: ['5 years payments & settlement hands-on experience', 'Proficient in Kafka and Spring', 'Quantified p99 latency improvement'],
        gaps: ['Could strengthen evidence of leading an MSA migration end-to-end'],
        matched_keywords: ['Java', 'Spring', 'Kafka', 'Payments'], missing_keywords: ['MSA'],
        recommendations: ['Lead the cover letter with payments core reliability experience', 'Briefly mention any MSA-adjacent work or self-study'],
      },
      {
        id: 'f2', created_at: '2026-05-26T09:30:00.000Z', updated_at: '2026-05-26T09:30:00.000Z', job_id: 'j4',
        score: 91, summary: 'Settlement batch optimization experience maps almost perfectly to the core requirements.',
        strengths: ['Spring Batch settlement hands-on', '4 h → 38 min batch improvement', 'SQL and index optimization'],
        gaps: ['Streaming settlement exposure limited to one project'],
        matched_keywords: ['Java', 'Spring Batch', 'Settlement', 'MySQL'], missing_keywords: [],
        recommendations: ['Present the settlement accuracy validation automation with specific numbers'],
      },
      {
        id: 'f3', created_at: '2026-06-04T09:30:00.000Z', updated_at: '2026-06-04T09:30:00.000Z', job_id: 'j2',
        score: 72, summary: 'Backend skills are solid but global-scale multi-region distributed systems experience is partial.',
        strengths: ['High-throughput traffic reliability', 'Concurrency problem resolution'],
        gaps: ['Limited global multi-region operations experience', 'Cross-timezone async collaboration less documented'],
        matched_keywords: ['Java', 'AWS'], missing_keywords: ['Kotlin', 'Distributed Systems'],
        recommendations: ['Emphasize distributed transaction examples', 'Mention Kotlin learning roadmap'],
      },
    ],

    coverLetters: [
      {
        id: 'c1', created_at: '2026-06-04T11:00:00.000Z', updated_at: '2026-06-08T11:00:00.000Z',
        title: 'Stripe — Backend Engineer, Payments', job_id: 'j1', is_primary: true,
        current_version_id: 'c1v2', version_count: 2,
        current_content:
          'In payments, a single error is a breach of trust. At PayCore I brought the payment ' +
          'authorization API\'s p99 latency from 320 ms down to 110 ms — learning first-hand what ' +
          'it means to build a system that is both fast and provably correct. I want to bring that ' +
          'experience to Stripe\'s payments core.',
        versions: [
          { id: 'c1v1', cover_letter_id: 'c1', version_no: 1, content: '(Draft) Cover letter focused on payments domain experience.', note: 'First draft', source: 'ai', created_at: '2026-06-04T11:00:00.000Z' },
          { id: 'c1v2', cover_letter_id: 'c1', version_no: 2, content: 'In payments, a single error is a breach of trust. At PayCore I brought the payment authorization API\'s p99 latency from 320 ms down to 110 ms — learning first-hand what it means to build a system that is both fast and provably correct. I want to bring that experience to Stripe\'s payments core.', note: 'Added concrete numbers + tightened closing', source: 'edit', created_at: '2026-06-08T11:00:00.000Z' },
        ],
      },
      {
        id: 'c2', created_at: '2026-05-27T11:00:00.000Z', updated_at: '2026-05-27T11:00:00.000Z',
        title: 'Adyen — Backend Engineer, Settlement', job_id: 'j4', is_primary: false,
        current_version_id: 'c2v1', version_count: 1,
        current_content:
          'In settlement, accuracy is everything. I cut a Spring Batch settlement job from 4 hours ' +
          'to 38 minutes while simultaneously automating the validation pipeline to guarantee ' +
          'correctness at higher speed. I would love to bring that discipline to Adyen\'s settlement platform.',
        versions: [
          { id: 'c2v1', cover_letter_id: 'c2', version_no: 1, content: 'In settlement, accuracy is everything. I cut a Spring Batch settlement job from 4 hours to 38 minutes while simultaneously automating the validation pipeline to guarantee correctness at higher speed. I would love to bring that discipline to Adyen\'s settlement platform.', note: 'AI draft', source: 'ai', created_at: '2026-05-27T11:00:00.000Z' },
        ],
      },
    ],

    interviews: [
      {
        id: 'iv1', created_at: '2026-06-12T14:00:00.000Z', updated_at: '2026-06-13T09:30:00.000Z', job_id: 'j1',
        self_introduction:
          'Hi, I\'m Alex Morgan — a senior backend engineer with five years in payments and settlement. ' +
          'At PayCore I handle millions of payment transactions every day, and my focus has always been ' +
          'on building systems that are both fast and absolutely correct. I\'ve pushed the payment ' +
          'authorization API\'s p99 latency from 320 ms to 110 ms, and cut the settlement batch from ' +
          '4 hours to 38 minutes while keeping validation automated and airtight. ' +
          'I\'m excited to take that work to the next level at Stripe\'s payments core.',
        notes:
          'Final round — VP Eng interview. Expect culture fit + system design.\n' +
          '· Emphasize the "correctness vs. speed" trade-off perspective from payments work\n' +
          '· Be direct about motivation for moving from PayCore to Stripe (scale & impact)\n' +
          '· Questions to ask: on-call / incident response culture, next-gen settlement roadmap',
        questions: [
          { question: 'How did you bring the payment authorization API p99 latency from 320 ms down to 110 ms?', intent: 'Assess systematic, measurement-driven approach to performance optimization', followups: ['How did you identify the bottleneck?', 'What trade-offs did the improvement introduce?', 'How did you ensure cache consistency?'], answer_outline: 'APM profiling per segment → hypotheses (N+1 queries, serialization, connection wait) → sequential fixes: index redesign, connection-pool tuning, read cache → A/B validation at each step. Cache consistency via TTL + event-driven invalidation.' },
          { question: 'Walk me through the zero-downtime database migration you led.', intent: 'Assess operational safety mindset and ability to design incremental, reversible changes', followups: ['What was your rollback strategy?', 'How did you verify data consistency?'], answer_outline: 'Dual-write → historical backfill → old/new comparison validation → gradual traffic cutover. Each phase kept fully reversible so a rollback at any point was safe.' },
          { question: 'Tell me about a concurrency problem you solved at high scale.', intent: 'Evaluate understanding of distributed concurrency', followups: ['What are the limits of distributed locking?', 'How did you ensure idempotency?'], answer_outline: 'Flash-sale inventory oversell → Redis distributed lock + idempotency key to prevent duplicate processing. Hot-path lock contention rerouted to queue-based serialization → 0 oversell incidents.' },
          { question: 'How do you handle an incident in a correctness-critical domain like payments?', intent: 'Assess incident response principles and prioritization', followups: ['How do you run a post-mortem?'], answer_outline: '1) Isolate and circuit-break the blast radius. 2) Correctness first — suspend suspicious transactions. 3) Reconcile settlement after recovery. 4) Blameless post-mortem → actionable prevention items.' },
          { question: 'What does a great engineering team culture look like to you?', intent: 'Culture fit', followups: ['What is your philosophy on code review?'], answer_outline: 'Teams that surface problems early rather than hiding them, and that document the "why" behind decisions. Code review should critique the code and the design, not the person.' },
        ],
        star_guides: [
          { question: 'Tell me about the hardest incident you\'ve ever dealt with.', situation: 'Month-end settlement batch fell behind and was at risk of missing the deadline', task: 'Complete settlement accurately within 4 hours and prevent recurrence', action: 'Parallelized the bottleneck batch jobs, redesigned indexes, hot-patched with a zero-downtime deploy, then validated correctness via the automated pipeline', result: 'Processing time cut to 38 minutes; zero recurrence since; settlement SLA consistently met' },
          { question: 'Describe a time you proactively improved a team process.', situation: 'Deployments were gated to once a week, slowing feature delivery and making rollbacks painful', task: 'Increase release frequency without sacrificing stability', action: 'Built canary deployment automation with GitHub Actions + ArgoCD, added health-check-based automatic rollback', result: 'Release frequency: 1×/week → 5×/day; average rollback time: 12 min → 90 sec' },
        ],
      },
    ],

    activities: [
      { id: 'ac1', type: 'application_status_changed', entity_type: 'application', entity_id: 'a1', summary: 'Stripe — status updated to Interview.', created_at: '2026-06-13T10:00:00.000Z' },
      { id: 'ac2', type: 'interview_prep_saved', entity_type: 'interview_prep', entity_id: 'iv1', summary: 'Saved interview prep for Stripe.', created_at: '2026-06-12T14:00:00.000Z' },
      { id: 'ac3', type: 'application_status_changed', entity_type: 'application', entity_id: 'a4', summary: 'Adyen — status updated to Document Passed.', created_at: '2026-06-12T10:00:00.000Z' },
      { id: 'ac4', type: 'cover_letter_version_saved', entity_type: 'cover_letter', entity_id: 'c1', summary: 'Saved Stripe cover letter v2.', created_at: '2026-06-08T11:00:00.000Z' },
      { id: 'ac5', type: 'fit_analysis_saved', entity_type: 'fit_analysis', entity_id: 'f1', summary: 'Saved Stripe fit analysis (score: 88).', created_at: '2026-06-02T09:30:00.000Z' },
      { id: 'ac6', type: 'job_saved', entity_type: 'job', entity_id: 'j6', summary: 'Saved Brex job posting.', created_at: '2026-06-10T09:00:00.000Z' },
      { id: 'ac7', type: 'resume_added', entity_type: 'document', entity_id: 'd1', summary: 'Added Alex Morgan — Resume (2026).', created_at: '2026-05-03T10:00:00.000Z' },
    ],
  };
}
