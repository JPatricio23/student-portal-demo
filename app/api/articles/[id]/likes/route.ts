import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { article_id } = body

    // Get current user from auth
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('article_likes')
      .select('*')
      .eq('article_id', article_id)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      // Unlike - remove the like
      const { error } = await supabase
        .from('article_likes')
        .delete()
        .eq('id', existingLike.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ liked: false })
    }

    // Create new like
    const { data, error } = await supabase
      .from('article_likes')
      .insert({
        article_id,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ liked: true, data })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('article_likes')
    .select('*, user:profiles(email)')
    .eq('article_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}