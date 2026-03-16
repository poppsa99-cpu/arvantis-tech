import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: categories, error } = await admin
    .from('categories')
    .select('id, name')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ categories })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { categoryId, defenseText, defenseNumber, ordinal } = await request.json()

  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Look up the default defense response template for this category
  const { data: defaultDefense, error: defenseError } = await admin
    .from('default_defenses')
    .select('defense_text')
    .eq('category_id', categoryId)
    .maybeSingle()

  if (defenseError) {
    return NextResponse.json({ error: defenseError.message }, { status: 500 })
  }

  if (!defaultDefense) {
    return NextResponse.json(
      { error: 'No default defense found for this category' },
      { status: 404 }
    )
  }

  // Look up the category name
  const { data: category, error: categoryError } = await admin
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single()

  if (categoryError) {
    return NextResponse.json({ error: categoryError.message }, { status: 500 })
  }

  // Insert into lawyer_preferences (non-blocking)
  try {
    await admin.from('lawyer_preferences').insert({
      category_id: categoryId,
      defense_text_snippet: (defenseText || '').slice(0, 200),
      chosen_category_name: category.name,
    })
  } catch {
    // Non-blocking — don't fail if tracking fails
  }

  // Substitute the correct ordinal into the response template
  // Templates from the DB may have:
  //   "Defendant's First Affirmative Defense" (wrong ordinal for this defense)
  //   "Defendant's Affirmative Defense" (no ordinal)
  //   "Defendant's 1st Affirmative Defense" (numeric ordinal)
  // Replace ALL of these with the correct ordinal for the defense being reassigned
  let responseText = normalizeDefenseText(defaultDefense.defense_text)
  if (ordinal) {
    // Match "Defendant's [optional ordinal word(s)] Affirmative Defense"
    // Covers: First, Second, Third, 1st, 2nd, etc., or no ordinal at all
    responseText = responseText.replace(
      /Defendant['']s\s+(?:(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth|Twenty[-\s]?(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth)|\d+(?:st|nd|rd|th))\s+)?Affirmative\s+Defense/gi,
      `Defendant's ${ordinal} Affirmative Defense`
    )
  }

  return NextResponse.json({
    matchedCategory: category.name,
    responseText,
  })
}

// Normalize DB defense text: collapse soft-wrapped \n\n into spaces,
// preserve indented lines as [BLOCKQUOTE] markers for block quotes
function normalizeDefenseText(rawText: string): string {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n')
  const segments: { type: 'text' | 'blockquote'; content: string }[] = []
  let currentText: string[] = []
  let currentBlock: string[] = []

  function flushText() {
    if (currentText.length > 0) {
      segments.push({ type: 'text', content: currentText.join(' ').replace(/  +/g, ' ').trim() })
      currentText = []
    }
  }
  function flushBlock() {
    if (currentBlock.length > 0) {
      segments.push({ type: 'blockquote', content: currentBlock.join(' ').replace(/  +/g, ' ').trim() })
      currentBlock = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed === '') continue
    if (line.startsWith(' ') && trimmed.length > 10) {
      flushText()
      currentBlock.push(trimmed.trim())
    } else {
      flushBlock()
      currentText.push(trimmed.trim())
    }
  }
  flushText()
  flushBlock()

  const parts: string[] = []
  for (const seg of segments) {
    if (seg.content.length === 0) continue
    if (seg.type === 'blockquote') {
      parts.push('\n\n[BLOCKQUOTE]' + seg.content + '[/BLOCKQUOTE]\n\n')
    } else {
      parts.push(seg.content)
    }
  }
  return parts.join(' ').replace(/  +/g, ' ').trim()
}
