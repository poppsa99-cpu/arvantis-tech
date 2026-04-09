import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logEvent, logDiff } from '@/lib/analytics'
import { NextRequest, NextResponse } from 'next/server'
import type { FirmSettings } from '../../firm-settings/route'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  UnderlineType,
} from 'docx'
import type { CompelDocumentsData, DocumentRequest } from '../process/route'

const F = 'Times New Roman'
const SZ = 24 // 12pt
const HALF_INCH = 720
const DOUBLE = 480
const SINGLE = 240

function tr(text: string, opts: Partial<{ bold: boolean; italics: boolean; underline: boolean; size: number }> = {}): TextRun {
  return new TextRun({
    text,
    font: F,
    size: opts.size || SZ,
    bold: opts.bold,
    italics: opts.italics,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
  })
}

function para(runs: TextRun[], opts: Partial<{
  after: number
  line: number
  align: (typeof AlignmentType)[keyof typeof AlignmentType]
  indentLeft: number
  firstLine: number
}> = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after || 0, line: opts.line || DOUBLE },
    indent: (opts.indentLeft || opts.firstLine) ? {
      left: opts.indentLeft || 0,
      firstLine: opts.firstLine || 0,
    } : undefined,
    children: runs,
  })
}

function blank(): Paragraph {
  return new Paragraph({ spacing: { after: 100 }, children: [] })
}

function honorific(pronoun: 'he' | 'she' | 'they'): string {
  if (pronoun === 'he') return 'Mr.'
  if (pronoun === 'she') return 'Ms.'
  return ''
}

function buildCompelDocumentsMotion(data: CompelDocumentsData, docReq: DocumentRequest, firm: FirmSettings): Document {
  const plaintiffStr = data.plaintiffNames.join(' AND ')
  const defendant = data.defendantName || '[DEFENDANT NAME]'
  const caseNo = data.caseNumber || '[CASE NUMBER]'
  const circuit = data.circuitNumber || '_____'
  const county = data.county || '_____'
  const deponentName = data.deponentName || '[DEPONENT NAME]'
  const deponentTitle = data.deponentTitle || '[TITLE]'
  const depDate = data.depositionDate || '[DATE]'
  const pronoun = data.deponentPronoun || 'they'
  const mr = honorific(pronoun)
  const plaintiffLabel = data.plaintiffNames.length > 1 ? 'Plaintiffs' : 'Plaintiff'

  const children: Paragraph[] = []

  // ── Court header
  for (const line of [`IN THE CIRCUIT COURT OF THE ${circuit}`, 'JUDICIAL CIRCUIT IN AND FOR', `${county} COUNTY, FLORIDA`]) {
    children.push(para([tr(line)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  }
  children.push(blank())

  // ── Case caption
  children.push(para([tr(plaintiffStr + ',')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(para([tr(`${' '.repeat(40)}CASE NO.: ${caseNo}`)], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())
  children.push(para([tr('Plaintiff,')], { indentLeft: HALF_INCH, line: SINGLE, align: AlignmentType.LEFT }))
  children.push(para([tr('v.')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())
  children.push(para([tr(defendant + ',')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())
  children.push(para([tr('Defendant.')], { indentLeft: HALF_INCH, line: SINGLE, align: AlignmentType.LEFT }))
  children.push(para([tr('________________________________________/')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())

  // ── Title
  children.push(para(
    [tr("PLAINTIFF'S MOTION TO COMPEL DOCUMENTATION RELIED UPON", { bold: true, underline: true })],
    { after: 200, align: AlignmentType.CENTER, line: SINGLE }
  ))
  children.push(blank())

  // ── Intro
  children.push(para([
    tr(`COMES NOW, ${plaintiffLabel}, `),
    tr(plaintiffStr),
    tr(', by and through the undersigned counsel, hereby file this Motion to Compel Documentation Relied Upon by Defendant and as grounds state as follows:'),
  ], { after: 200, firstLine: HALF_INCH }))

  // ── Para 1
  children.push(para([
    tr("1.\tThis case arises from a breach of contract action resulting from Defendant's failure to pay for the property damages to the Plaintiff."),
  ], { after: 200, firstLine: HALF_INCH }))

  // ── Para 2
  children.push(para([
    tr(`2.\tOn or about ${depDate}, ${plaintiffLabel} took the deposition of Defendant${deponentTitle === 'Corporate Representative' ? "'s" : 's'} ${deponentTitle}, ${deponentName}.`),
  ], { after: 200, firstLine: HALF_INCH }))

  // ── Para 3
  children.push(para([
    tr(`3.\tDuring the deposition, ${docReq.whatTestified}`),
  ], { after: 200, firstLine: HALF_INCH }))

  // ── Para 4
  children.push(para([
    tr(`4.\t${plaintiffLabel} request${data.plaintiffNames.length > 1 ? '' : 's'} ${docReq.whatRequested}`),
  ], { after: 200, firstLine: HALF_INCH }))

  // ══════════════════════════════════════════════════════════════════════
  // MEMORANDUM OF LAW — static boilerplate from Kanner & Pintaluga
  // ══════════════════════════════════════════════════════════════════════
  children.push(blank())
  children.push(para([tr('MEMORANDUM OF LAW', { bold: true })], { align: AlignmentType.CENTER, line: SINGLE, after: 200 }))

  // Section I heading
  children.push(para([
    tr('I.\t', { bold: true }),
    tr('Discovery is Broad and only limited by a ', { bold: true }),
    tr('validly', { bold: true, underline: true }),
    tr(' asserted privilege.', { bold: true }),
  ], { after: 200, firstLine: HALF_INCH }))

  // Grinnell quote
  children.push(para([
    tr('"The primary purpose of discovery under the rules of procedure is to prevent the use of surprise, trickery, bluff and legal gymnastics." '),
    tr('Grinnell Corp. v. Palms 2100 Ocean Blvd., Ltd.', { italics: true }),
    tr(', 924 So. 2d 887, 893 (Fla. 4th DCA 2006).'),
  ], { after: 200, firstLine: HALF_INCH }))

  children.push(para([
    tr('Plaintiff is entitled under the Rules of Civil Procedure to the following scope of discovery:'),
  ], { after: 200, firstLine: HALF_INCH }))

  // Rule 1.280 block quote
  children.push(para([
    tr('(b) Scope of Discovery.', { bold: true }),
    tr(' Unless otherwise limited by order of the court in accordance with these rules, the scope of discovery is as follows:'),
  ], { after: 100, indentLeft: HALF_INCH, line: SINGLE }))

  children.push(para([
    tr('(1) In General.', { bold: true }),
    tr(' Parties may obtain discovery regarding any matter, not privileged, that is relevant to the subject matter of the pending action, whether it relates to the claim or defense of the party seeking discovery or the claim or defense of any other party, including the existence, description, nature, custody, condition, and location of any books, documents, or other tangible things and the identity and location of persons having knowledge of any discoverable matter. It is not ground for objection that the information sought will be inadmissible at the trial if the information sought appears reasonably calculated to lead to the discovery of admissible evidence.'),
  ], { after: 200, indentLeft: HALF_INCH, line: SINGLE }))

  children.push(para([
    tr('See ', { italics: true }),
    tr('Fla. R. Civ. P. 1.280 (2022). As such the scope of discovery is broad only limited by a '),
    tr('valid', { bold: true, underline: true }),
    tr(' privilege.'),
  ], { after: 200, firstLine: HALF_INCH }))

  // Privilege paragraph
  children.push(para([
    tr('Defendant here blindly asserts privilege over matters that have no categorical privilege and were not prepared by an attorney or even in anticipation of litigation but rather in the normal course of business\u2014the insurance business. '),
    tr('See ', { italics: true }),
    tr("People's Tr. Ins. Co. v. Foster", { italics: true }),
    tr(', 47 Fla. L. Weekly D299 (Fla. 1st DCA Jan. 26, 2022) (finding no categorical privilege over underwriting files); '),
    tr('see also, e.g., ', { italics: true }),
    tr('American Integrity Ins. Co. of Florida v. Venable', { italics: true }),
    tr(', 324 So. 3d 999 (Fla. 1st DCA 2021) (denying certiorari as to the trial court\u2019s order compelling discovery of an underwriting manual); '),
    tr('see also ', { italics: true }),
    tr('Avatar Prop. & Cas. Ins. Co. v. Simmons', { italics: true }),
    tr(', 298 So. 3d 1252 (Fla. 5th DCA 2020) (rejecting a categorical claim of an underwriting file privilege).'),
  ], { after: 200, firstLine: HALF_INCH }))

  // Section II heading
  children.push(para([
    tr('II.\t', { bold: true }),
    tr('Under Florida law, privilege cannot be used as both a sword and shield.', { bold: true }),
  ], { after: 200, firstLine: HALF_INCH }))

  // Sword and shield paragraph 1
  children.push(para([
    tr('The Defendant should be prohibited from using any defense, testimony, evidence, or document that relates in any way to the subject matter addressed in the documents not produced, whether on the basis of an asserted privilege or on a claim of irrelevance. '),
    tr('See ', { italics: true }),
    tr('Savino v. Luciano', { italics: true }),
    tr(', 92 So.2d 817 (Fla. 1957); '),
    tr('Coates v. Akerman, Senterfitt & Eidson, P.A.', { italics: true }),
    tr(', 940 So. 2d 504 (Fla. 2d DCA 2006). "Under the sword and shield doctrine, a party who raises a claim that will necessarily require proof by way of a privileged communication cannot insist that the communication is privileged." '),
    tr('Jenney v. Airdata Wiman, Inc.', { italics: true }),
    tr(', 846 So. 2d 664, 668 (Fla. 2d DCA 2003) (emphasis in original) '),
    tr('(citing ', { italics: true }),
    tr('Savino v. Luciano', { italics: true }),
    tr(', 92 So. 2d 817, 819 (Fla. 1957).'),
  ], { after: 200, firstLine: HALF_INCH }))

  // Sword and shield paragraph 2
  children.push(para([
    tr('The corollary to the sword and shield doctrine is that if a party makes a claim of privilege for purposes of discovery, that party cannot introduce, discuss, or refer to the privileged documents at trial. '),
    tr('See ', { italics: true }),
    tr('Hoyas v. State', { italics: true }),
    tr(', 456 So. 2d 1225, 1229 (Fla. 3d DCA 1984) ("[P]rivilege was intended as a shield, not a sword. Consequently, a party may not insist upon the protection of the privilege for damaging communications while disclosing other selected communications because they are self-serving."); '),
    tr('accord ', { italics: true }),
    tr('Garbacik v. Wal-Mart Transp., LLC', { italics: true }),
    tr(', 932 So. 2d 500, 503 (Fla. 5th DCA 2006) (cannot hide behind privilege on one hand while seeking to use the privileged information with the other hand); '),
    tr('Coates, supra', { italics: true }),
    tr(', 949 So. 2d at 511.'),
  ], { after: 200, firstLine: HALF_INCH }))

  // Trial disclosure paragraph
  children.push(para([
    tr('The Florida Supreme Court has made it clear that material that may be used or disclosed at trial must be disclosed. '),
    tr('See ', { italics: true }),
    tr('Grinnell Corp.', { italics: true }),
    tr(', 924 So. 2d at 892 (quoting '),
    tr('Northup v. Acken', { italics: true }),
    tr(', 865 So. 2d 1267, 1272 (Fla. 2004)); '),
    tr('accord ', { italics: true }),
    tr('Huet v. Tromp', { italics: true }),
    tr(', 912 So. 2d 336, 339 (Fla. 5th DCA 2005) ("[A]ny work product privilege that existed ceases once the materials or testimony are intended for trial use."); '),
    tr('McGarrah v. Bayfront Medical Center, Inc.', { italics: true }),
    tr(', 889 So. 2d 923, n.1 (Fla. 2d DCA 2005)("[A]ttorney work product may be discovered by an opposing party if the product is \u2018reasonably expected or intended to be presented to the court or before a jury at trial.\u2019 Work product that is to be used-including for impeachment purposes-must be disclosed to the adverse party.") (citations omitted).'),
  ], { after: 200, firstLine: HALF_INCH }))

  // ── WHEREFORE
  children.push(blank())
  children.push(para([
    tr('WHEREFORE', { bold: true }),
    tr(`, the ${plaintiffLabel}, `),
    tr(plaintiffStr),
    tr(", respectfully moves this Honorable Court for the entry of an Order granting Plaintiff\u2019s Motion to Compel Documentation relied upon by the Defendant, as stated above with specificity and grant any other relief this Court deems appropriate."),
  ], { after: 400, firstLine: HALF_INCH }))

  // ── Certificate of Service
  children.push(blank())
  children.push(blank())
  children.push(para(
    [tr('CERTIFICATE OF SERVICE', { bold: true, underline: true })],
    { after: 200, align: AlignmentType.CENTER, line: SINGLE }
  ))
  children.push(blank())
  children.push(para(
    [tr("I HEREBY CERTIFY that the foregoing has been served on Defendant via Florida\u2019s E-Filing Portal.")],
    { after: 400, firstLine: HALF_INCH }
  ))

  // ── Firm info from org settings
  children.push(para([tr(firm.firm_name, { bold: true })], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr(firm.firm_role)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr(firm.address_line1)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr(firm.address_line2)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr(`Phone: ${firm.phone}`)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr(`Fax:    ${firm.fax}`)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  for (const email of firm.emails) {
    children.push(para([tr(email === firm.emails[0] ? `Email: ${email}` : email)], { align: AlignmentType.RIGHT, line: SINGLE, after: email === firm.emails[firm.emails.length - 1] ? 200 : 0 }))
  }
  children.push(blank())
  children.push(para([tr(`By: /s/ ${firm.attorney_name}________`)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr(`${firm.attorney_name.toUpperCase()}, ${firm.attorney_title}`)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr(`Florida Bar No.: ${firm.bar_number}`)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))

  return new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children,
    }],
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { data, requestIndex, originalData }: { data: CompelDocumentsData; requestIndex: number; originalData?: CompelDocumentsData } = body

  if (!data || !data.documentRequests || typeof requestIndex !== 'number') {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
  }

  const docReq = data.documentRequests[requestIndex]
  if (!docReq) {
    return NextResponse.json({ error: 'Document request not found' }, { status: 400 })
  }

  // Fetch firm settings
  const admin = getSupabaseAdmin()
  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const defaultFirm: FirmSettings = {
    firm_name: '[FIRM NAME]', firm_role: 'Attorney for Plaintiff',
    address_line1: '[ADDRESS]', address_line2: '[CITY, STATE ZIP]',
    phone: '[PHONE]', fax: '[FAX]', emails: ['[EMAIL]'],
    attorney_name: '[ATTORNEY]', attorney_title: 'ESQ.', bar_number: '[BAR #]',
  }

  let firm = defaultFirm
  if (org) {
    const { data: agents } = await admin
      .from('organization_agents')
      .select('config')
      .eq('organization_id', org.id)
    const agentWithFirm = (agents || []).find(
      (a) => a.config && typeof a.config === 'object' && 'firm' in (a.config as Record<string, unknown>)
    )
    if (agentWithFirm) {
      firm = { ...defaultFirm, ...((agentWithFirm.config as Record<string, unknown>).firm as Partial<FirmSettings>) }
    }
  }

  const doc = buildCompelDocumentsMotion(data, docReq, firm)
  const buffer = await Packer.toBuffer(doc)

  const plaintiffLast = data.plaintiffNames[0]?.split(' ').slice(-1)[0] || 'Plaintiff'
  const defShort = data.defendantName?.split(' ').slice(0, 2).join(' ') || 'Defendant'
  const filename = `${plaintiffLast} v ${defShort} - MTC Documentation ${requestIndex + 1}.docx`

  logEvent({ userId: user.id, event: 'download', workflow: 'compel-documents', metadata: { plaintiff: data.plaintiffNames.join(', '), defendant: data.defendantName, caseNumber: data.caseNumber, requestIndex, whatRequested: docReq.whatRequested } })

  // Diff tracking
  if (originalData) {
    const origReq = originalData.documentRequests?.[requestIndex]
    if (origReq) {
      for (const field of ['whatTestified', 'whatRequested'] as (keyof DocumentRequest)[]) {
        if (origReq[field] !== docReq[field]) {
          logDiff({ userId: user.id, workflow: 'compel-documents', field, aiValue: origReq[field], humanValue: docReq[field], context: { requestIndex, caseNumber: data.caseNumber } })
        }
      }
    }
    const caseFields: (keyof CompelDocumentsData)[] = ['defendantName', 'caseNumber', 'circuitNumber', 'county', 'deponentName', 'deponentTitle', 'depositionDate']
    for (const field of caseFields) {
      if (originalData[field] !== data[field]) {
        logDiff({ userId: user.id, workflow: 'compel-documents', field, aiValue: originalData[field], humanValue: data[field], context: { caseNumber: data.caseNumber } })
      }
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
