'use client'

import { useState, useEffect } from 'react'
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

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkUserAndFetchArticles()
  }, [])

  const checkUserAndFetchArticles = async () => {
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

    await fetchArticles(user)
  }

  const fetchArticles = async (currentUser: any) => {
    setLoading(true)
    
    let query = supabase
      .from('articles')
      .select(`
        *,
        author:profiles(email)
      `)
      .order('created_at', { ascending: false })

    // If not admin, only show published articles
    if (!currentUser) {
      query = query.eq('published', true)
    }

    const { data, error } = await query

    if (!error && data) {
      setArticles(data as Article[])
    }
    setLoading(false)
  }

  const togglePublish = async (article: Article) => {
    if (!isAdmin) return

    const { error } = await supabase
      .from('articles')
      .update({
        published: !article.published,
        published_at: !article.published ? new Date().toISOString() : null,
      })
      .eq('id', article.id)

    if (!error) {
      await fetchArticles(user)
    }
  }

  const deleteArticle = async (id: string) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this article?')) return

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)

    if (!error) {
      await fetchArticles(user)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Articles</h1>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Articles</h1>
          {isAdmin && (
            <Link
              href="/articles/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Article
            </Link>
          )}
        </div>

        {articles.length === 0 ? (
          <p className="text-gray-500">No articles found.</p>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <div
                key={article.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link href={`/articles/${article.id}`}>
                      <h2 className="text-xl font-semibold hover:text-blue-600">
                        {article.title}
                      </h2>
                    </Link>
                    <p className="text-gray-600 mt-2">{article.excerpt}</p>
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                      <span>By {article.author?.email || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(article.created_at).toLocaleDateString()}</span>
                      {article.published && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">Published</span>
                        </>
                      )}
                      {!article.published && (
                        <>
                          <span>•</span>
                          <span className="text-yellow-600">Draft</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => togglePublish(article)}
                        className={`px-3 py-1 text-sm rounded ${
                          article.published
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {article.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <Link
                        href={`/articles/${article.id}/edit`}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteArticle(article.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}