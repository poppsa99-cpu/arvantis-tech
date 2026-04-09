import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/analytics'
import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, rm, readdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

async function extractPdfText(buffer: Buffer): Promise<string> {
  // unpdf works in serverless environments (Vercel, Cloudflare) without web workers
  const { extractText } = await import('unpdf')
  const { text } = await extractText(new Uint8Array(buffer))
  return Array.isArray(text) ? text.join('\n\n') : text
}

async function ocrPdf(buffer: Buffer): Promise<string> {
  const workDir = join(tmpdir(), `sydney-ocr-${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  try {
    const pdfPath = join(workDir, 'input.pdf')
    await writeFile(pdfPath, buffer)

    // Convert PDF pages to PNG images using Ghostscript
    await execFileAsync('gs', [
      '-dNOPAUSE', '-dBATCH', '-sDEVICE=png16m',
      '-r300', '-dTextAlphaBits=4', '-dGraphicsAlphaBits=4',
      `-sOutputFile=${join(workDir, 'page-%03d.png')}`,
      pdfPath,
    ], { timeout: 120000 })

    const files = (await readdir(workDir))
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort()

    // OCR each page with Tesseract
    const pages: string[] = []
    for (const file of files) {
      const imgPath = join(workDir, file)
      const { stdout } = await execFileAsync('tesseract', [
        imgPath, 'stdout', '--psm', '6',
      ], { timeout: 60000, maxBuffer: 10 * 1024 * 1024 })
      pages.push(stdout.trim())
    }

    return pages.join('\n\n')
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 413 })
  }

  const name = file.name.toLowerCase()
  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
    return NextResponse.json({ error: 'Only PDF and DOCX files are accepted' }, { status: 400 })
  }

  const startTime = Date.now()
  const buffer = Buffer.from(await file.arrayBuffer())
  let text = ''

  try {
    if (name.endsWith('.pdf')) {
      // Try text-based extraction first
      text = await extractPdfText(buffer)

      // If no text found, fall back to OCR (scanned PDF)
      if (!text.trim()) {
        text = await ocrPdf(buffer)
      }
    } else {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logEvent({ userId: user.id, event: 'extract_error', workflow: 'motion-to-strike', error: errorMsg, durationMs: Date.now() - startTime, metadata: { fileName: file.name, fileSize: file.size, fileType: name.endsWith('.pdf') ? 'pdf' : 'docx' } })
    return NextResponse.json(
      { error: `Failed to extract text: ${errorMsg}` },
      { status: 422 }
    )
  }

  if (!text.trim()) {
    logEvent({ userId: user.id, event: 'extract_error', workflow: 'motion-to-strike', error: 'No text extracted', durationMs: Date.now() - startTime, metadata: { fileName: file.name, fileSize: file.size } })
    return NextResponse.json({ error: 'No text could be extracted from the file' }, { status: 422 })
  }

  logEvent({ userId: user.id, event: 'extract_success', workflow: 'motion-to-strike', durationMs: Date.now() - startTime, metadata: { fileName: file.name, fileSize: file.size, charCount: text.length, fileType: name.endsWith('.pdf') ? 'pdf' : 'docx' } })
  return NextResponse.json({ text, filename: file.name, chars: text.length })
}
