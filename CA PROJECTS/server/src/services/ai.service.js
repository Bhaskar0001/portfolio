const OpenAI = require('openai');
const env = require('../config/env');
const logger = require('../utils/logger');

const openai = env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('dummy')
    ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
    : null;

// ── Section-specific fallback knowledge base ──────────
const SECTION_KNOWLEDGE = {
    '143(1)': {
        summary: 'Intimation u/s 143(1) — CPC has processed the return and found a mismatch between the declared figures and the data available with the department (Form 26AS, AIS, TIS).',
        actionPoints: ['Compare intimation with filed ITR', 'Check 26AS/AIS for TDS/TCS mismatch', 'Verify interest calculations u/s 234A/B/C', 'File rectification u/s 154 if needed'],
        riskLevel: 'Medium',
        documentsRequired: ['Filed ITR & computation', 'Form 26AS / AIS', 'Bank statements', 'TDS certificates'],
        sopSteps: ['Download intimation from e-filing portal', 'Compare tax computed vs tax paid', 'Identify specific mismatches', 'File rectification or pay differential', 'Submit response within 30 days'],
        legalReferences: ['Section 143(1) of Income Tax Act', 'Section 154 — Rectification', 'Section 234A/B/C — Interest']
    },
    '143(2)': {
        summary: 'Scrutiny Assessment Notice u/s 143(2) — The Assessing Officer has selected the return for detailed scrutiny. This requires full cooperation and document submission.',
        actionPoints: ['Prepare complete set of books of accounts', 'Reconcile income with bank statements', 'Prepare written submissions for each query', 'Engage with AO through authorized representative'],
        riskLevel: 'High',
        documentsRequired: ['Books of accounts', 'Bank statements (all accounts)', 'Audit report (if applicable)', 'Details of investments', 'Capital gains working', 'Loan confirmations'],
        sopSteps: ['Acknowledge notice on e-filing portal', 'Prepare index of all documents', 'Draft point-wise written submissions', 'Attend hearing or file adjournment', 'Follow up for assessment order'],
        legalReferences: ['Section 143(2) — Scrutiny', 'Section 142(1) — Inquiry', 'Section 143(3) — Assessment Order']
    },
    '148': {
        summary: 'Notice for Income Escaping Assessment u/s 148 — The AO believes income has escaped assessment. This is a serious notice requiring immediate legal attention.',
        actionPoints: ['File return in response to 148 notice', 'Request reasons recorded by AO', 'Challenge if reopening is beyond time limits', 'Consider filing objections before assessment'],
        riskLevel: 'High',
        documentsRequired: ['Original return filed', 'Reasons recorded by AO', 'All documents related to escaped income', 'Legal opinion if challenging validity'],
        sopSteps: ['File return within 30 days', 'Request copy of reasons recorded', 'File objections to reopening if invalid', 'If valid, cooperate with assessment', 'Appeal if order is adverse'],
        legalReferences: ['Section 148 — Issue of Notice', 'Section 148A — Prior approval procedure', 'Section 149 — Time limit for notice', 'Section 151 — Sanction for notice']
    },
    '142(1)': {
        summary: 'Inquiry Before Assessment u/s 142(1) — The AO is requesting specific information or documents before completing the assessment.',
        actionPoints: ['Read queries carefully and prepare point-wise replies', 'Submit requested documents', 'Seek adjournment if more time is needed'],
        riskLevel: 'Medium',
        documentsRequired: ['As specified in the notice', 'Supporting computations', 'Third-party confirmations if requested'],
        sopSteps: ['Acknowledge receipt', 'Prepare submission within due date', 'File reply on e-proceedings portal', 'Attend hearing if required'],
        legalReferences: ['Section 142(1) — Inquiry', 'Section 271(1)(b) — Penalty for non-compliance']
    },
    '73': {
        summary: 'SCN for GST Demand u/s 73 — Show Cause Notice for demand of tax not paid/short paid/erroneously refunded. No allegation of fraud.',
        actionPoints: ['Verify the demand computation', 'Compare with GSTR-1, 3B returns filed', 'Check ITC mismatch details', 'File reply within 30 days'],
        riskLevel: 'High',
        documentsRequired: ['GSTR-1, 2A/2B, 3B returns', 'E-way bills if relevant', 'ITC register', 'Invoices for disputed transactions', 'Reconciliation statements'],
        sopSteps: ['Read SCN paragraph-wise', 'Prepare reconciliation for each issue', 'Draft para-wise reply', 'Submit on GST portal', 'Request personal hearing if needed'],
        legalReferences: ['Section 73 of CGST Act', 'Section 74 — Fraud cases', 'Section 75 — General provisions for determination']
    },
    '74': {
        summary: 'SCN for GST Fraud/Suppression u/s 74 — Serious allegation of fraud, willful misstatement, or suppression. Penalty up to 100% of tax.',
        actionPoints: ['Engage legal counsel immediately', 'Verify if fraud allegation is justified', 'Consider voluntary payment to reduce penalty', 'Prepare detailed factual defense'],
        riskLevel: 'High',
        documentsRequired: ['All GST returns for the period', 'Complete books of accounts', 'Bank statements', 'Invoices and contracts', 'Communication records'],
        sopSteps: ['Study SCN allegations carefully', 'Consult with GST advocate', 'Prepare factual defense', 'Consider Section 74(5) voluntary payment', 'File detailed written submissions'],
        legalReferences: ['Section 74 of CGST Act — Fraud/Suppression', 'Section 74(5) — Voluntary payment', 'Section 107 — Appeals']
    }
};

const DEFAULT_INSIGHT = {
    summary: 'Standard compliance notice requiring review and timely response.',
    actionPoints: ['Review the notice carefully', 'Identify the specific issues raised', 'Gather supporting documents', 'Draft and file response before due date'],
    riskLevel: 'Medium',
    documentsRequired: ['Copy of filed return', 'Supporting documents as mentioned', 'Bank statements for relevant period'],
    sopSteps: ['Acknowledge notice', 'Analyze the demand/query', 'Prepare supporting documents', 'Draft response', 'File response on portal'],
    legalReferences: ['Refer to the specific section mentioned in the notice']
};

/**
 * AI Service for NoticeRadar
 * Handles notice analysis and response drafting using OpenAI with fallbacks
 */
class AiService {
    /**
     * Analyze a notice and return structured insights
     * @param {Object} notice - Notice document
     * @param {Object} client - Client document
     * @returns {Object} Structured analysis
     */
    async analyzeNotice(notice, client) {
        // Try OpenAI first
        if (openai) {
            try {
                logger.info(`[AI] Analyzing Notice: ${notice.din || notice._id} via OpenAI`);

                const response = await openai.chat.completions.create({
                    model: env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a senior Indian Chartered Accountant and Tax Consultant with 25 years of experience. 
Analyze the following tax/GST notice and return a JSON object with these exact keys:
- summary: A 2-3 sentence analysis of what this notice means and what's at stake.
- actionPoints: An array of 4-6 specific action items the CA should take.
- riskLevel: One of "Low", "Medium", or "High".
- documentsRequired: An array of specific documents needed from the client.
- sopSteps: An array of step-by-step procedure to handle this notice.
- legalReferences: An array of relevant sections, acts, and case law references.
Return ONLY the JSON object, no markdown formatting.`
                        },
                        {
                            role: 'user',
                            content: `
NOTICE DETAILS:
- Department: ${notice.department}
- Section: ${notice.section || 'Not specified'}
- Notice Type: ${notice.noticeType || 'General'}
- Assessment Year: ${notice.assessmentYear || 'N/A'}
- Financial Year: ${notice.financialYear || 'N/A'}
- DIN: ${notice.din || 'N/A'}
- Demand Amount: ₹${notice.demandAmount || 0}
- Due Date: ${notice.dueDate ? new Date(notice.dueDate).toLocaleDateString('en-IN') : 'Not specified'}
- Notes/OCR Text: ${(notice.notes || '').substring(0, 2000)}

CLIENT DETAILS:
- Name: ${client?.name || 'Unknown'}
- PAN: ${client?.pan || 'N/A'}
- Entity Type: ${client?.entityType || 'Individual'}

Analyze this notice and provide structured guidance.`
                        }
                    ],
                    temperature: 0.4,
                    max_tokens: 1500,
                });

                const content = response.choices[0].message.content;
                // Try to parse JSON (remove any markdown code fences if present)
                const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleaned);

                return {
                    summary: parsed.summary || DEFAULT_INSIGHT.summary,
                    actionPoints: parsed.actionPoints || DEFAULT_INSIGHT.actionPoints,
                    riskLevel: parsed.riskLevel || 'Medium',
                    documentsRequired: parsed.documentsRequired || DEFAULT_INSIGHT.documentsRequired,
                    sopSteps: parsed.sopSteps || DEFAULT_INSIGHT.sopSteps,
                    legalReferences: parsed.legalReferences || DEFAULT_INSIGHT.legalReferences,
                    generatedAt: new Date(),
                    source: 'openai'
                };
            } catch (err) {
                logger.warn(`[AI] OpenAI analysis failed, falling back to heuristics: ${err.message}`);
            }
        }

        // Fallback: Rule-based heuristics using section knowledge base
        return this._fallbackAnalysis(notice);
    }

    /**
     * Generate a draft response for a notice
     * @param {Object} notice - Notice document
     * @param {Object} client - Client document  
     * @param {string} userInstructions - Optional custom instructions
     * @returns {string} Draft response text
     */
    async generateResponseDraft(notice, client, userInstructions = '') {
        if (openai) {
            try {
                logger.info(`[AI] Generating draft for Notice: ${notice.din || notice._id}`);

                const response = await openai.chat.completions.create({
                    model: env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a senior Tax Consultant and Chartered Accountant in India. 
Draft a formal, legally sound response to the following tax notice.
FORMATTING RULES:
- Use a professional, respectful tone appropriate for correspondence with Indian tax authorities.
- Include placeholders like [DATE], [CITY], [SIGNATURE] where needed.
- Structure with: Subject line, Salutation, Introduction, Detailed Response (point-wise), Prayer clause, and Conclusion.
- Do NOT include the letterhead (firm name/address) as that is added by the system.
- Reference specific sections and rules where applicable.
- Return strictly the body content of the letter.`
                        },
                        {
                            role: 'user',
                            content: `
NOTICE DETAILS:
- Department: ${notice.department}
- Section: ${notice.section || 'General'}
- Assessment Year: ${notice.assessmentYear}
- DIN: ${notice.din || 'N/A'}
- Demand Amount: ₹${notice.demandAmount || 0}
- Issues Found: ${notice.notes || 'General notification'}

CLIENT DETAILS:
- Name: ${client.name}
- PAN: ${client.pan}
- Entity Type: ${client.entityType}

CA INSTRUCTIONS:
${userInstructions || 'Provide a standard professional response addressing the notice, requesting additional time if possible, and offering to provide supporting documents.'}

Draft the response now.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                });

                return response.choices[0].message.content;
            } catch (err) {
                logger.warn(`[AI] Draft generation via OpenAI failed, using fallback: ${err.message}`);
            }
        }

        // Fallback draft
        return this._fallbackDraft(notice, client);
    }

    /**
     * Fallback analysis using section-specific knowledge base
     */
    _fallbackAnalysis(notice) {
        const section = notice.section ? notice.section.replace(/\s/g, '') : '';
        const knowledge = SECTION_KNOWLEDGE[section] || DEFAULT_INSIGHT;

        // Adjust risk based on demand amount
        let riskLevel = knowledge.riskLevel;
        if (notice.demandAmount > 1000000) riskLevel = 'High';
        else if (notice.demandAmount > 100000 && riskLevel === 'Low') riskLevel = 'Medium';

        // Check if overdue
        const isOverdue = notice.dueDate && new Date(notice.dueDate) < new Date();

        return {
            summary: knowledge.summary + (isOverdue ? ' ⚠️ This notice is OVERDUE — immediate action required.' : ''),
            actionPoints: knowledge.actionPoints,
            riskLevel,
            documentsRequired: knowledge.documentsRequired,
            sopSteps: knowledge.sopSteps,
            legalReferences: knowledge.legalReferences,
            generatedAt: new Date(),
            source: 'heuristic'
        };
    }

    /**
     * Fallback draft when OpenAI is not available
     */
    _fallbackDraft(notice, client) {
        const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        return `Subject: Response to Notice ${notice.din ? `DIN: ${notice.din}` : ''} u/s ${notice.section || 'N/A'} for A.Y. ${notice.assessmentYear || 'N/A'}

To,
The Assessing Officer / Proper Officer,
${notice.department === 'GST' ? 'Central / State GST Department' : 'Income Tax Department'},
[CITY]

Respected Sir/Madam,

Ref: PAN — ${client.pan || '[PAN]'}
A.Y. / Period — ${notice.assessmentYear || notice.financialYear || '[YEAR]'}
DIN — ${notice.din || '[DIN]'}

With reference to the above captioned notice dated [NOTICE DATE], we, on behalf of our client ${client.name}, would like to submit the following:

1. We have received and duly noted the contents of the said notice.

2. We are in the process of collating the required information and supporting documents as demanded in the notice.

3. We request your good office to kindly grant us additional time of 15 days to file a comprehensive response with all supporting documents.

4. We assure full cooperation in the proceedings and shall furnish all requisite details at the earliest.

We trust the above is in order. Thanking you for your kind consideration.

Yours faithfully,
For [FIRM NAME]
Chartered Accountants

[SIGNATURE]
[CA NAME]
Membership No. [MEMBERSHIP]
UDIN: [UDIN]
Date: ${date}
Place: [CITY]`;
    }
}

module.exports = new AiService();
