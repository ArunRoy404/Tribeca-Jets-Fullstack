export interface AssistantLinkItem {
  label: string;
  detail: string;
  href?: string;
}

export interface AssistantReply {
  topic: string;
  answer: string;
  items: AssistantLinkItem[];
  followUps: string[];
}

export interface WorkflowGuide {
  id: string;
  keywords: string[];
  topic: string;
  answer: string;
  items: AssistantLinkItem[];
  followUps: string[];
}

export const WORKFLOW_GUIDES: WorkflowGuide[] = [
  {
    id: 'record-payment',
    keywords: ['record a client payment', 'record payment', 'how do i record', 'log payment', 'settle invoice'],
    topic: 'Recording a Client Payment',
    answer:
      'Client payments are recorded against a sent invoice in Receivables so the balance and state (Due, Partially Paid, Paid, Overdue) are computed automatically.',
    items: [
      {
        label: '1. Open Receivables',
        detail: 'Select a SENT invoice (or raise one from the trip and mark it Sent).',
        href: '/dashboard/receivables',
      },
      {
        label: '2. Click Record Payment',
        detail: 'Enter the payment amount, date received, payment method, and wire/check reference.',
        href: '/dashboard/receivables',
      },
      {
        label: '3. Verify in Transactions',
        detail: 'Every recorded payment appears automatically in the Transactions ledger.',
        href: '/dashboard/transactions',
      },
    ],
    followUps: [
      'Which invoices are currently overdue or unpaid?',
      'How do I create a quote with FET?',
    ],
  },
  {
    id: 'create-quote-fet',
    keywords: ['create a quote with fet', 'federal excise tax', 'how do i create a quote', 'fet on quote', 'markup'],
    topic: 'Creating a Quote with FET',
    answer:
      'Quotes store the base charter price, FET toggle/rate, and extras; the server computes the 7.5% Federal Excise Tax, total investment, and gross margin automatically.',
    items: [
      {
        label: '1. Open Quotes › New Quote',
        detail: 'Pick the client, trip request, route, and aircraft (or operator quote).',
        href: '/dashboard/quotes/new',
      },
      {
        label: '2. Base Price & FET',
        detail: 'Enter the base charter price and leave Federal Excise Tax enabled (applied to base charter price only).',
        href: '/dashboard/quotes/new',
      },
      {
        label: '3. Send or Download PDF',
        detail: 'Once saved, download the branded PDF or email the quote directly to the client.',
        href: '/dashboard/quotes',
      },
    ],
    followUps: [
      'Which quotes are waiting on client approval?',
      'How does operator sourcing work?',
    ],
  },
  {
    id: 'operator-sourcing',
    keywords: ['how does operator sourcing work', 'operator sourcing', 'operator quote', 'request quote from operator'],
    topic: 'Operator Sourcing Workflow',
    answer:
      'Operator Sourcing connects an open Trip Request to operator bids so you can compare net operator costs and convert the winning bid into a client quote.',
    items: [
      {
        label: '1. Open Operator Sourcing',
        detail: 'Select an open Trip Request that needs aircraft availability and pricing.',
        href: '/dashboard/operator-sourcing',
      },
      {
        label: '2. Log Operator Quotes',
        detail: 'Record each operator’s offered aircraft, net cost, and terms.',
        href: '/dashboard/operator-sourcing',
      },
      {
        label: '3. Convert to Client Quote',
        detail: 'Pick the best operator quote to pre-fill the client Quote form with the operator cost.',
        href: '/dashboard/quotes/new',
      },
    ],
    followUps: [
      'What open trip requests need sourcing?',
      'Which quotes are waiting on client approval?',
    ],
  },
  {
    id: 'operator-itinerary',
    keywords: ['where do i upload an operator itinerary', 'upload an operator itinerary', 'build itinerary', 'passenger itinerary'],
    topic: 'Passenger & Operator Itineraries',
    answer:
      'Each booked trip has one Passenger Itinerary document where you can configure FBOs, catering, ground transport, aircraft photos, and attach the operator’s own briefing PDF.',
    items: [
      {
        label: '1. Open Itineraries',
        detail: 'Click Build Itinerary for a booked trip, or edit an existing itinerary.',
        href: '/dashboard/itineraries',
      },
      {
        label: '2. Upload Operator Itinerary',
        detail: 'Use the Operator Itinerary upload field in the Build/Edit Itinerary dialog.',
        href: '/dashboard/itineraries',
      },
      {
        label: '3. Download or Email PDF',
        detail: 'Open the itinerary detail sheet to download the branded PDF or email it to the client.',
        href: '/dashboard/itineraries',
      },
    ],
    followUps: [
      'What trips are departing soon?',
      'Which clients have follow-ups due?',
    ],
  },
  {
    id: 'client-portal-guide',
    keywords: ['client portal', 'share link with client', 'how does client approve quote'],
    topic: 'Sharing the Client Portal',
    answer:
      'Every live client has a token-authenticated Client Dossier where they can view sent proposals, approve or decline quotes, download itineraries and invoices, and access shared documents.',
    items: [
      {
        label: 'Open a Client Profile',
        detail: 'Click "Client Portal" in the top right header (or "Copy Client Portal Link" in the More menu).',
        href: '/dashboard/clients',
      },
    ],
    followUps: [
      'Which quotes are waiting on client approval?',
      'Which clients have follow-ups due?',
    ],
  },
];

/**
 * Matches a question against the workflow knowledge base before running live
 * database queries.
 */
export function matchWorkflowGuide(question: string): WorkflowGuide | null {
  const q = question.toLowerCase().trim();
  for (const guide of WORKFLOW_GUIDES) {
    if (guide.keywords.some((kw) => q.includes(kw))) {
      return guide;
    }
  }
  return null;
}

/**
 * Context-aware starter questions for the assistant popover.
 */
export function suggestionsForContext(context?: string): string[] {
  const clean = (context ?? '').toLowerCase();
  if (clean.includes('quote')) {
    return [
      'Which quotes are waiting on client approval?',
      'How do I create a quote with FET?',
      'What open trip requests need sourcing?',
      'Give me my desk briefing for today',
    ];
  }
  if (clean.includes('trip') || clean.includes('schedule') || clean.includes('itinerar')) {
    return [
      'What trips are departing soon?',
      'Where do I upload an operator itinerary?',
      'What open trip requests need sourcing?',
      'Give me my desk briefing for today',
    ];
  }
  if (clean.includes('receivable') || clean.includes('payment') || clean.includes('transaction')) {
    return [
      'Which invoices are currently overdue or unpaid?',
      'How do I record a client payment?',
      'What trips are departing soon?',
      'Give me my desk briefing for today',
    ];
  }
  if (clean.includes('client') || clean.includes('lead')) {
    return [
      'Which clients have follow-ups due?',
      'Which quotes are waiting on client approval?',
      'How do I share the Client Portal link?',
      'Give me my desk briefing for today',
    ];
  }
  return [
    'Give me my desk briefing for today',
    'Which quotes are waiting on client approval?',
    'What trips are departing soon?',
    'Which invoices are currently overdue or unpaid?',
  ];
}
