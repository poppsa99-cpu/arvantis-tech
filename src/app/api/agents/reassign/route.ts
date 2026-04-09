import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logDiff } from '@/lib/analytics'
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
  } catch (err) {
    console.error('Failed to save lawyer preference:', err)
  }

  // Log the AI correction for training data
  logDiff({
    userId: user.id,
    workflow: 'motion-to-strike',
    field: 'defense_category',
    aiValue: `Defense #${defenseNumber} was unmatched/wrong`,
    humanValue: category.name,
    context: { defenseNumber, ordinal, defenseTextSnippet: (defenseText || '').slice(0, 200), newCategoryId: categoryId },
  })

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

// DB defense text now uses explicit markers — pass through as-is.
// Markers: [I]...[/I] for italics, [BQ]...[/BQ] for block quotes, \n for paragraph breaks.
function normalizeDefenseText(rawText: string): string {
  return rawText.trim()
}
