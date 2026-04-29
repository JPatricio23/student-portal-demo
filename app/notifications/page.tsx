'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'publish'
  article_id: string | null
  from_user_id: string | null
  message: string
  read: boolean
  created_at: string
  article: { title: string } | null
  from_user: { email: string } | null
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return
    }

    setIsAdmin(true)
    await fetchNotifications()
  }

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        article:articles(title),
        from_user:profiles(email)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setNotifications(data as Notification[])
    }
    setLoading(false)
  }

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (!error) {
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ))
    }
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)

    for (const id of unreadIds) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
    }

    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return (
          <span className="bg-red-100 text-red-600 p-2 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </span>
        )
      case 'comment':
        return (
          <span className="bg-blue-100 text-blue-600 p-2 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.683C2.885 12.175 2 11.313 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9z" clipRule="evenodd" />
            </svg>
          </span>
        )
      default:
        return (
          <span className="bg-gray-100 text-gray-600 p-2 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </span>
        )
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Notifications</h1>
          <p className="text-gray-500">You must be an admin to view notifications.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Notifications</h1>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-blue-600 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-gray-500">No notifications yet.</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 flex items-start gap-4 ${
                  notification.read ? 'bg-white' : 'bg-blue-50 border-blue-200'
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  <p className="text-gray-800">{notification.message}</p>
                  {notification.article && (
                    <p className="text-sm text-gray-500 mt-1">
                      Article: {notification.article.title}
                    </p>
                  )}
                  {notification.from_user && (
                    <p className="text-sm text-gray-500">
                      From: {notification.from_user.email}
                    </p>
                  )}
                  <p className="text-sm text-gray-400 mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    New
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}