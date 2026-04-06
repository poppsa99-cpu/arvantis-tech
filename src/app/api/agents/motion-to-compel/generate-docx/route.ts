import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  UnderlineType,
  TabStopType,
} from 'docx'
import type { MotionToCompelData, MotionTarget } from '../process/route'

const F = 'Times New Roman'
const SZ = 24 // 12pt in half-points
const HALF_INCH = 720 // 0.5 inches in twips
const DOUBLE = 480
const SINGLE = 240

function tr(text: string, opts: Partial<{ bold: boolean; italics: boolean; underline: boolean; color: string; size: number }> = {}): TextRun {
  return new TextRun({
    text,
    font: F,
    size: opts.size || SZ,
    bold: opts.bold,
    italics: opts.italics,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
    color: opts.color,
  })
}

function para(runs: TextRun[], opts: Partial<{
  after: number
  line: number
  align: (typeof AlignmentType)[keyof typeof AlignmentType]
  indentLeft: number
  indentRight: number
  firstLine: number
}> = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after || 0, line: opts.line || DOUBLE },
    indent: (opts.indentLeft || opts.indentRight || opts.firstLine) ? {
      left: opts.indentLeft || 0,
      right: opts.indentRight || 0,
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

function buildMotionToCompelDocument(data: MotionToCompelData, target: MotionTarget): Document {
  const plaintiffStr = data.plaintiffNames.join(' AND ')
  const defendant = data.defendantName || '[DEFENDANT NAME]'
  const caseNo = data.caseNumber || '[CASE NUMBER]'
  const circuit = data.circuitNumber || '_____'
  const county = data.county || '_____'
  const crName = data.corporateRepName || '[CORPORATE REPRESENTATIVE]'
  const crDate = data.corporateRepDepositionDate || '[DATE]'
  const targetName = target.targetName || '[TARGET NAME]'
  const targetTitle = target.targetTitle || ''
  const crTestimony = target.crTestimony || '[CR TESTIMONY]'
  const reason = target.reasonForCompelling || '[REASON]'
  const pronoun = target.targetPronoun || 'they'
  const mr = honorific(pronoun)

  const children: Paragraph[] = []

  // Court header
  const courtHeader = `IN THE CIRCUIT COURT OF THE ${circuit}\nJUDICIAL CIRCUIT IN AND FOR \n${county} COUNTY, FLORIDA`
  for (const line of courtHeader.split('\n')) {
    children.push(para([tr(line)], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  }
  children.push(blank())

  // Case caption
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 0, line: SINGLE },
    tabStops: [{ type: TabStopType.LEFT, position: 5760 }],
    children: [
      tr(plaintiffStr + ','),
      new TextRun({ text: '\t', font: F, size: SZ }),
      tr('CASE NO.: ' + caseNo),
    ],
  }))
  children.push(blank())
  children.push(para([tr('Plaintiff,')], { indentLeft: HALF_INCH, line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())
  children.push(para([tr('v.')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())
  children.push(para([tr(defendant + ',')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())
  children.push(para([tr('Defendant.')], { indentLeft: HALF_INCH, line: SINGLE, align: AlignmentType.LEFT }))
  children.push(para([tr('________________________________________/')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())

  // Title
  const titleTarget = targetTitle
    ? `DEFENDANT'S ${targetTitle.toUpperCase()}, ${targetName.toUpperCase()}`
    : targetName.toUpperCase()

  children.push(para(
    [tr(`PLAINTIFF'S MOTION TO COMPEL THE DEPOSITION OF ${titleTarget}`, { bold: true, underline: true })],
    { after: 200, align: AlignmentType.CENTER, line: SINGLE }
  ))
  children.push(blank())

  // Intro paragraph
  const plaintiffLabel = data.plaintiffNames.length > 1 ? 'Plaintiffs' : 'Plaintiff'
  children.push(para([
    tr(`${plaintiffLabel}, `),
    tr(plaintiffStr, { bold: false }),
    tr(`, pursuant to Fla.R.Civ.P. 1.380, files this Motion to Compel the Deposition of `),
    tr(targetName),
    tr(', and states:'),
  ], { after: 200, firstLine: HALF_INCH }))

  // Numbered paragraphs
  children.push(para([
    tr(`1.\tPlaintiff has filed this first party action due to damages at the insured property.`),
  ], { after: 200, firstLine: HALF_INCH }))

  children.push(para([
    tr(`2.\tOn or about `),
    tr(crDate),
    tr(`, ${plaintiffLabel} took the deposition of Defendant's Corporate Representative, `),
    tr(crName),
    tr('.'),
  ], { after: 200, firstLine: HALF_INCH }))

  children.push(para([
    tr(`3.\tDuring the deposition, `),
    tr(crName),
    tr(`, testified that `),
    tr(targetName),
    tr(` `),
    tr(crTestimony),
    tr('.'),
  ], { after: 200, firstLine: HALF_INCH }))

  const mrTargetName = mr ? `${mr} ${targetName.split(' ').slice(-1)[0]}` : targetName
  children.push(para([
    tr(`4.\tPlaintiff is compelling the Deposition of `),
    tr(targetName),
    tr(` as `),
    tr(reason),
    tr(`. `),
    tr(mrTargetName),
    tr(` is a necessary fact witness.`),
  ], { after: 200, firstLine: HALF_INCH }))

  children.push(para([
    tr(`5.\tPlaintiff has been prejudiced by the Defendant's failure to comply with providing deposition dates for `),
    tr(targetName),
    tr('.'),
  ], { after: 200, firstLine: HALF_INCH }))

  children.push(para([
    tr(`6.\tThe deposition of `),
    tr(targetName),
    tr(` is necessary for the Plaintiff to prosecute their case in chief.`),
  ], { after: 200, firstLine: HALF_INCH }))

  children.push(para([
    tr(`7.\tBased on the foregoing, Plaintiffs' requests that this Honorable Court enter an Order granting Plaintiff's Motion to Compel the Deposition of `),
    tr(targetName),
    tr('.'),
  ], { after: 200, firstLine: HALF_INCH }))

  // WHEREFORE
  children.push(blank())
  const whereforeTarget = targetTitle
    ? `${targetTitle.replace(/^\w/, c => c.toUpperCase())}, ${targetName}`
    : targetName
  children.push(para([
    tr('WHEREFORE', { bold: true }),
    tr(', Plaintiff, '),
    tr(plaintiffStr),
    tr(`, respectfully request an order that `),
    tr(whereforeTarget),
    tr(` sit for deposition within fourteen (14) days of the order; and any and all other relief this Honorable Court deems just and equitable`),
  ], { after: 400, firstLine: HALF_INCH }))

  // Certificate of Conferral
  children.push(blank())
  children.push(blank())
  children.push(para(
    [tr('CERTIFICATE OF CONFERRAL', { bold: true, underline: true })],
    { after: 200, align: AlignmentType.CENTER, line: SINGLE }
  ))
  children.push(blank())
  children.push(para(
    [tr(`I certify that prior to filing Plaintiff's Motion I discussed the relief requested in Plaintiff's Motion by [method of communication and date] with the opposing party and [the opposing party (agrees or disagrees) on the resolution of all or part of the motion] OR [the opposing party did not respond (describing with particularity all of the efforts undertaken to accomplish dialogue with the opposing party prior to filing the motion)].`)],
    { after: 200, firstLine: HALF_INCH }
  ))

  // Certificate of Service
  children.push(blank())
  children.push(blank())
  children.push(para(
    [tr('CERTIFICATE OF SERVICE', { bold: true, underline: true })],
    { after: 200, align: AlignmentType.CENTER, line: SINGLE }
  ))
  children.push(blank())
  children.push(para(
    [tr('I HEREBY CERTIFY that a true and correct copy of the foregoing was served via Florida Courts E-Filing Portal on this ___ day of ___2026.')],
    { after: 400, firstLine: HALF_INCH }
  ))

  // Firm info
  children.push(para([tr('KANNER & PINTALUGA, P.A.', { bold: true })], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('Attorneys for Plaintiff')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('925 S. Federal Highway')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('Boca Raton, FL 33432')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('Phone: (561) 424-0032')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('Fax:    (561) 853-2188')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('Email: jdavis@kpattorney.com')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('lhernandez@kpattorney.com')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('FirstPartyEService@kpattorney.com')], { align: AlignmentType.RIGHT, line: SINGLE, after: 200 }))
  children.push(blank())
  children.push(para([tr('By: /s/ Jared Davis_________________')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('       JARED DAVIS, ESQ.')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))
  children.push(para([tr('       Florida Bar No.: 1024895')], { align: AlignmentType.RIGHT, line: SINGLE, after: 0 }))

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
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
  const { data, targetIndex }: { data: MotionToCompelData; targetIndex: number } = body

  if (!data || !data.targets || typeof targetIndex !== 'number') {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
  }

  const target = data.targets[targetIndex]
  if (!target) {
    return NextResponse.json({ error: 'Target not found' }, { status: 400 })
  }

  const doc = buildMotionToCompelDocument(data, target)
  const buffer = await Packer.toBuffer(doc)

  const plaintiffLast = data.plaintiffNames[0]?.split(' ').slice(-1)[0] || 'Plaintiff'
  const defShort = data.defendantName?.split(' ').slice(0, 2).join(' ') || 'Defendant'
  const targetLast = target.targetName?.split(' ').slice(-1)[0] || 'Target'
  const filename = `${plaintiffLast} v ${defShort} - Motion to Compel ${targetLast}.docx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
