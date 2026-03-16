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

interface DefenseResult {
  defenseNumber: number
  ordinal: string
  rawText: string
  matched: boolean
  matchedCategory: string | null
  suggestedCategory: string
  confidence: number
  responseText: string | null
  flagged: boolean
}

interface ProcessResult {
  caseMetadata: {
    plaintiffName: string | null
    defendantName: string | null
    caseNumber: string | null
    court: string | null
  }
  summary: {
    totalDefenses: number
    matched: number
    flagged: number
  }
  results: DefenseResult[]
  reply: string
}

const F = 'Times New Roman'
const SZ = 24 // 12pt in half-points
const HALF_INCH = 720 // 0.5 inches in twips
const DOUBLE = 480 // double spacing
const SINGLE = 240 // single spacing

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

// Only strip the leading category name in parentheses, e.g. "(Duties after Loss) As to..."
// Preserve all other parentheticals (case citations, statutory refs, etc.)
function cleanResponseText(text: string): string {
  return text.replace(/^\s*\([^)]+\)\s*/, '').trim()
}

// Detect case names (contains "v.") and italicize them in text
// Case citations follow: CaseName v. OtherName, VOLUME Reporter PAGE (Court YEAR)
function formatTextWithCitations(text: string, baseOpts: Partial<{ bold: boolean; underline: boolean; color: string }> = {}): TextRun[] {
  // Pattern: finds "CaseName v. OtherName" before a reporter citation
  // Reporters: So. 2d/3d, F.2d/3d, F. Supp, S. Ct., U.S.
  const pattern = /([A-Z][A-Za-z'".&§,()\-–— ]+?v\.\s+[A-Za-z'".&§,()\-–— ]+?)(?=,?\s+\d+\s+(?:So\.|F\.\d|F\. Supp|S\.\s*Ct|U\.S\.))/g

  const runs: TextRun[] = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    // Text before the case name
    if (match.index > lastIndex) {
      runs.push(tr(text.substring(lastIndex, match.index), baseOpts))
    }
    // Case name — italicized
    runs.push(tr(match[1], { ...baseOpts, italics: true }))
    lastIndex = match.index + match[1].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    runs.push(tr(text.substring(lastIndex), baseOpts))
  }

  return runs.length > 0 ? runs : [tr(text, baseOpts)]
}

function buildReplyDocument(result: ProcessResult): Document {
  const meta = result.caseMetadata
  const plaintiff = meta.plaintiffName || '[PLAINTIFF NAME]'
  const defendant = meta.defendantName || '[DEFENDANT NAME]'
  const caseNo = meta.caseNumber || '[CASE NUMBER]'
  const court = meta.court || 'IN THE CIRCUIT COURT OF THE _____ JUDICIAL CIRCUIT IN AND FOR _____ COUNTY, FLORIDA'

  const children: Paragraph[] = []

  // Court header — regular font, no bold, 12pt, centered
  children.push(para([tr(court)], { align: AlignmentType.CENTER, after: 200, line: SINGLE }))
  children.push(blank())

  // Case caption — no bold, 12pt
  // Plaintiff name with case number on same line using tab
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 0, line: SINGLE },
    tabStops: [{ type: TabStopType.LEFT, position: 5760 }],
    children: [
      tr(plaintiff + ','),
      new TextRun({ text: '\t', font: F, size: SZ }),
      tr('CASE NO.: ' + caseNo),
    ],
  }))
  children.push(blank())

  // "Plaintiffs," indented by 0.5
  children.push(para([tr('Plaintiffs,')], { indentLeft: HALF_INCH, line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())
  children.push(para([tr('v.')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())

  // Defendant name
  children.push(para([tr(defendant + ',')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())

  // "Defendant." indented by 0.5
  children.push(para([tr('Defendant.')], { indentLeft: HALF_INCH, line: SINGLE, align: AlignmentType.LEFT }))
  children.push(para([tr('______________________________________/')], { line: SINGLE, align: AlignmentType.LEFT }))
  children.push(blank())

  // Title — bold, underlined, centered, justified
  children.push(para(
    [tr("PLAINTIFF'S MOTION TO STRIKE AND REPLY/AVOIDANCE TO DEFENDANT'S AFFIRMATIVE DEFENSES", { bold: true, underline: true })],
    { after: 200, align: AlignmentType.CENTER, line: SINGLE }
  ))
  children.push(blank())

  // Intro paragraph — double spaced, justified, first line indent 0.5
  children.push(para(
    [tr(`Plaintiff, ${plaintiff}, by and through her undersigned attorneys, and pursuant to Florida Rule of Civil Procedure 1.100, hereby files this Reply/Avoidance of Defendant's Answer and Affirmative Defenses and Motion to Strike Defendant's Affirmative Defenses as follows:`)],
    { after: 200, firstLine: HALF_INCH }
  ))

  // B & S Associates citation — case name italicized, reporter/court/year not
  children.push(para([
    tr('As memorialized in '),
    tr('B & S Associates, Inc. v. Indem. Cas. & Prop., Ltd.', { italics: true }),
    tr(', 641 So. 2d 436, 437 (Fla. 4th DCA 1994)'),
  ], { after: 200, firstLine: HALF_INCH }))

  // Block quote — NOT italicized, single spaced, indented 0.5" left and right
  children.push(para(
    [tr('[I]t would appear that all risk insurance arose for the very purpose of protecting the insured in those cases where difficulties of logical explanation or some mystery surround the loss or damage to property. It would seem to be inconsistent with the broad protective purposes of "all-risks" insurance to impose on the insured, as Insurer would have us do, the burden of proving precise cause of loss or damage.')],
    { after: 200, line: SINGLE, indentLeft: HALF_INCH, indentRight: HALF_INCH }
  ))

  // Citing line — case name italicized
  children.push(para([
    tr('citing '),
    tr('Morrison Grain Co. v. Utica Mutual Insurance Co.', { italics: true }),
    tr(', 632 F.2d 424 (5th Cir.1980).'),
  ], { after: 400, firstLine: HALF_INCH }))

  // --- Each defense response — numbered paragraphs, double spaced, justified ---
  let paragraphNum = 1

  for (const def of result.results) {
    if (def.matched && def.responseText) {
      const cleaned = cleanResponseText(def.responseText)

      // Split on [BLOCKQUOTE] markers — odd indices are block quotes
      const blockParts = cleaned.split(/\[BLOCKQUOTE\]|\[\/BLOCKQUOTE\]/)
      let isFirst = true

      for (let p = 0; p < blockParts.length; p++) {
        const part = blockParts[p].replace(/\n/g, ' ').replace(/  +/g, ' ').trim()
        if (!part) continue

        const isBlockQuote = p % 2 === 1

        if (isBlockQuote) {
          // Block quote — single spaced, 0.5" left+right indent, NO first line indent
          children.push(para(
            formatTextWithCitations(part),
            { after: 200, line: SINGLE, indentLeft: HALF_INCH, indentRight: HALF_INCH }
          ))
          continue
        }

        if (isFirst) {
          isFirst = false
          // First paragraph — numbered, with underlined defense reference
          const defRef = `Defendant's ${def.ordinal} Affirmative Defense`
          const defRefIndex = part.indexOf(defRef)

          if (defRefIndex >= 0) {
            const afterDefRef = part.substring(defRefIndex + defRef.length)

            // Format the text after the defense reference with case name italicization
            const afterRuns = formatTextWithCitations(
              afterDefRef.startsWith(',') || afterDefRef.startsWith(' ') ? afterDefRef : ' ' + afterDefRef
            )

            children.push(para([
              tr(`${paragraphNum}.\tAs to `),
              tr(defRef, { underline: true }),
              ...afterRuns,
            ], { after: 200, firstLine: HALF_INCH }))
          } else {
            children.push(para(
              [tr(`${paragraphNum}.\t`), ...formatTextWithCitations(part)],
              { after: 200, firstLine: HALF_INCH }
            ))
          }
          paragraphNum++
        } else {
          // Continuation paragraphs — with case name italicization
          children.push(para(
            formatTextWithCitations(part),
            { after: 200, firstLine: HALF_INCH }
          ))
        }
      }
    } else {
      // Unmatched — flag for lawyer in red
      children.push(para([
        tr(`${paragraphNum}.\tAs to `),
        tr(`Defendant's ${def.ordinal} Affirmative Defense`, { underline: true }),
        tr(' — [NEEDS LAWYER REVIEW - NO MATCHING RESPONSE FOUND]', { bold: true, color: 'FF0000' }),
      ], { after: 100, firstLine: HALF_INCH }))

      children.push(para([
        tr(`Suggested category: ${def.suggestedCategory}`, { color: 'FF0000' }),
      ], { after: 100, firstLine: HALF_INCH }))

      children.push(para([
        tr(`Original defense: "${def.rawText.substring(0, 300)}..."`, { color: '666666' }),
      ], { after: 200, firstLine: HALF_INCH }))

      paragraphNum++
    }
  }

  // Closing
  children.push(para([
    tr(`${paragraphNum}.\tTo the extent required Plaintiff denies all Defendant's Affirmative Defenses.`),
  ], { after: 200, firstLine: HALF_INCH }))

  children.push(blank())
  children.push(para([
    tr('WHEREFORE', { bold: true }),
    tr(", Plaintiff respectfully requests this Court accept Plaintiff's denial and avoidance and Motion to Strike of Defendant's Affirmative Defenses."),
  ], { after: 400, firstLine: HALF_INCH }))

  // Certificate of Service
  children.push(blank())
  children.push(blank())
  children.push(para(
    [tr('CERTIFICATE OF SERVICE', { bold: true, underline: true })],
    { after: 200, align: AlignmentType.CENTER, line: SINGLE }
  ))
  children.push(blank())
  children.push(para(
    [tr('I HEREBY CERTIFY that a true and correct copy of the foregoing was furnished via electronic mail this _____ day of __________, 20____.')],
    { after: 200, firstLine: HALF_INCH }
  ))

  // Empty signature area — lawyer fills in after approval
  children.push(blank())
  children.push(blank())
  children.push(blank())

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

  const result: ProcessResult = await request.json()
  if (!result || !result.caseMetadata) {
    return NextResponse.json({ error: 'Invalid result data' }, { status: 400 })
  }

  const doc = buildReplyDocument(result)
  const buffer = await Packer.toBuffer(doc)

  const caseName = result.caseMetadata.plaintiffName || 'Reply'
  const filename = `${caseName} - Reply to Affirmative Defenses.docx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
