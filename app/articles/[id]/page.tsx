'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  excerpt: string
  content: string
  published: boolean
  published_at: string | null
  created_at: string
  author: { email: string } | null
}

interface Comment {
  id: string
  content: string
  created_at: string
  user: { email: string; role: string } | null
}

interface Like {
  id: string
  user_id: string
}

export default function ArticleDetailPage() {
  const params = useParams()
  const articleId = params.id as string

  const [article, setArticle] = useState<Article | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [likes, setLikes] = useState<Like[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userLiked, setUserLiked] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkUserAndFetchData()
  }, [articleId])

  const checkUserAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setIsAdmin(profile?.role === 'admin')
    }

    await fetchArticle()
    await fetchComments()
    await fetchLikes()
  }

  const fetchArticle = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:profiles(email)
      `)
      .eq('id', articleId)
      .single()

    if (!error && data) {
      setArticle(data as Article)
    }
    setLoading(false)
  }

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('article_comments')
      .select(`
        *,
        user:profiles(email, role)
      `)
      .eq('article_id', articleId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setComments(data as Comment[])
    }
  }

  const fetchLikes = async () => {
    const { data, error } = await supabase
      .from('article_likes')
      .select('*')
      .eq('article_id', articleId)

    if (!error && data) {
      setLikes(data as Like[])
      if (user) {
        setUserLiked(data.some((like) => like.user_id === user.id))
      }
    }
  }

  const handleLike = async () => {
    if (!user) {
      alert('Please sign in to like articles')
      return
    }

    if (userLiked) {
      // Unlike
      const { error } = await supabase
        .from('article_likes')
        .delete()
        .eq('article_id', articleId)
        .eq('user_id', user.id)

      if (!error) {
        await fetchLikes()
      }
    } else {
      // Like
      const { error } = await supabase
        .from('article_likes')
        .insert({
          article_id: articleId,
          user_id: user.id,
        })

      if (!error) {
        await fetchLikes()
      }
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      alert('Please sign in to comment')
      return
    }

    if (!newComment.trim()) return

    setSubmitting(true)
    const { error } = await supabase
      .from('article_comments')
      .insert({
        article_id: articleId,
        user_id: user.id,
        content: newComment,
      })

    if (!error) {
      setNewComment('')
      await fetchComments()
    }
    setSubmitting(false)
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    const { error } = await supabase
      .from('article_comments')
      .delete()
      .eq('id', commentId)

    if (!error) {
      await fetchComments()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/articles" className="text-blue-600 hover:underline">
            ← Back to Articles
          </Link>
          <h1 className="text-3xl font-bold mt-4">Loading...</h1>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/articles" className="text-blue-600 hover:underline">
            ← Back to Articles
          </Link>
          <h1 className="text-3xl font-bold mt-4">Article not found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/articles" className="text-blue-600 hover:underline">
          ← Back to Articles
        </Link>

        <article className="mt-6">
          <h1 className="text-4xl font-bold">{article.title}</h1>
          <div className="flex items-center gap-4 mt-4 text-gray-500">
            <span>By {article.author?.email || 'Unknown'}</span>
            <span>•</span>
            <span>{new Date(article.created_at).toLocaleDateString()}</span>
            {article.published_at && (
              <>
                <span>•</span>
                <span>Published: {new Date(article.published_at).toLocaleDateString()}</span>
              </>
            )}
          </div>

          <div className="mt-8 prose max-w-none">
            {article.content}
          </div>

          {/* Like Section */}
          <div className="mt-8 pt-8 border-t">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                userLiked
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{likes.length} {likes.length === 1 ? 'Like' : 'Likes'}</span>
            </button>
          </div>
        </article>

        {/* Comments Section */}
        <section className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">
            Comments ({comments.length})
          </h2>

          {/* Comment Form */}
          {user ? (
            <form onSubmit={handleComment} className="mb-8">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          ) : (
            <p className="text-gray-500 mb-8">
              <Link href="/auth" className="text-blue-600 hover:underline">Sign in</Link> to comment.
            </p>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{comment.user?.email || 'Unknown'}</span>
                        {comment.user?.role === 'admin' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-2">{comment.content}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {(isAdmin || (user && comment.user?.email === user.email)) && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}