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
  view_count: number
  author: { email: string } | null
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [topArticles, setTopArticles] = useState<Article[]>([])
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
    await fetchTopArticles()
  }

  const fetchTopArticles = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:profiles(email)
      `)
      .eq('published', true)
      .order('view_count', { ascending: false })
      .limit(5)

    if (!error && data) {
      setTopArticles(data as Article[])
    }
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

        {/* Top 5 Most Viewed Articles */}
        {topArticles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">🔥 Top 5 Most Viewed Articles</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topArticles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-blue-600">#{index + 1}</span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      {article.view_count || 0}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg">{article.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{article.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

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