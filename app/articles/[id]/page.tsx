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
  view_count: number
  author: { email: string } | null
}

interface Comment {
  id: string
  content: string
  created_at: string
  parent_id: string | null
  user: { email: string; role: string } | null
  replies?: Comment[]
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

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
      
      // Increment view count
      await supabase.rpc('increment_view_count', { article_uuid: articleId })
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

  const handleReply = async (parentId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      alert('Please sign in to reply')
      return
    }

    if (!replyContent.trim()) return

    setSubmitting(true)
    const { error } = await supabase
      .from('article_comments')
      .insert({
        article_id: articleId,
        user_id: user.id,
        content: replyContent,
        parent_id: parentId,
      })

    if (!error) {
      setReplyContent('')
      setReplyingTo(null)
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
            <span>•</span>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              {article.view_count || 0} views
            </span>
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
            <div className="flex items-center justify-between flex-wrap gap-4">
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
              
              {/* Share Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Share:</span>
                <button
                  onClick={() => {
                    const url = window.location.href
                    navigator.clipboard.writeText(url)
                    alert('Link copied to clipboard!')
                  }}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  title="Copy Link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    const title = encodeURIComponent(article.title)
                    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${title}`, '_blank')
                  }}
                  className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 text-blue-600"
                  title="Share on Twitter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
                  }}
                  className="p-2 bg-blue-700 rounded-lg hover:bg-blue-800 text-white"
                  title="Share on Facebook"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    const title = encodeURIComponent(article.title)
                    window.open(`https://wa.me/?text=${title}%20${url}`, '_blank')
                  }}
                  className="p-2 bg-green-500 rounded-lg hover:bg-green-600 text-white"
                  title="Share on WhatsApp"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${url}`, '_blank')
                  }}
                  className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-white"
                  title="Share on LinkedIn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>
              </div>
            </div>
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
              {comments.filter(c => !c.parent_id).map((comment) => (
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
                  
                  {/* Reply Button */}
                  {user && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                    >
                      {replyingTo === comment.id ? 'Cancel Reply' : 'Reply'}
                    </button>
                  )}
                  
                  {/* Reply Form */}
                  {replyingTo === comment.id && (
                    <form onSubmit={(e) => handleReply(comment.id, e)} className="mt-3 ml-4">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows={2}
                      />
                      <button
                        type="submit"
                        disabled={submitting || !replyContent.trim()}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting ? 'Posting...' : 'Post Reply'}
                      </button>
                    </form>
                  )}
                  
                  {/* Nested Replies */}
                  {comments.filter(c => c.parent_id === comment.id).length > 0 && (
                    <div className="mt-4 ml-4 space-y-4 border-l-2 border-gray-100 pl-4">
                      {comments.filter(c => c.parent_id === comment.id).map((reply) => (
                        <div key={reply.id} className="border border-gray-100 rounded p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{reply.user?.email || 'Unknown'}</span>
                                {reply.user?.role === 'admin' && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 mt-1 text-sm">{reply.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {(isAdmin || (user && reply.user?.email === user.email)) && (
                              <button
                                onClick={() => deleteComment(reply.id)}
                                className="text-red-600 hover:text-red-700 text-xs"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}