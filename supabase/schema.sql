-- Database Schema for Article System
-- Run this SQL in your Supabase SQL Editor

-- Create profiles table to store user roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS article_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

-- Create comments table with nested replies support
CREATE TABLE IF NOT EXISTS article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'publish')),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Articles policies
CREATE POLICY "Anyone can view published articles" ON articles FOR SELECT USING (published = true);
CREATE POLICY "Admins can do anything with articles" ON articles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create articles" ON articles FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Likes policies
CREATE POLICY "Authenticated users can view likes" ON article_likes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage own likes" ON article_likes FOR ALL USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON article_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON article_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON article_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON article_comments FOR DELETE USING (auth.uid() = user_id);

-- Function to increment article view count
CREATE OR REPLACE FUNCTION public.increment_view_count(article_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE articles 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = article_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle likes and create notifications
CREATE OR REPLACE FUNCTION public.handle_like()
RETURNS TRIGGER AS $$
DECLARE
  article_owner UUID;
  admin_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get article author
    SELECT author_id INTO article_owner FROM articles WHERE id = NEW.article_id;
    
    -- Get admin user
    SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
    
    -- Create notification for admin
    IF admin_user_id IS NOT NULL AND admin_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, article_id, from_user_id, message)
      VALUES (admin_user_id, 'like', NEW.article_id, NEW.user_id, 'Someone liked your article');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for likes
DROP TRIGGER IF EXISTS on_like_created ON article_likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON article_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_like();

-- Function to handle comments and create notifications
CREATE OR REPLACE FUNCTION public.handle_comment()
RETURNS TRIGGER AS $$
DECLARE
  article_owner UUID;
  admin_user_id UUID;
BEGIN
  -- Get article author
  SELECT author_id INTO article_owner FROM articles WHERE id = NEW.article_id;
  
  -- Get admin user
  SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  -- Create notification for admin
  IF admin_user_id IS NOT NULL AND admin_user_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, article_id, from_user_id, message)
    VALUES (admin_user_id, 'comment', NEW.article_id, NEW.user_id, 'Someone commented on your article');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comments
DROP TRIGGER IF EXISTS on_comment_created ON article_comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON article_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment();