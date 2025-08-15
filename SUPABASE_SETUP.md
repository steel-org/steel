# Supabase Setup Guide for Biuld

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a project name: `biuld`
3. Set a strong database password
4. Select your preferred region

## 2. Get Project Credentials

From your Supabase dashboard:
- **Project URL**: Found in Settings > API
- **Anon Key**: Found in Settings > API

## 3. Environment Variables

Create `.env.local` in your frontend directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `build-chat`
3. Set it to **Public** for easy access
4. Create the following folder structure:
   ```
   build-chat/
   ├── avatars/
   └── chat-files/
   ```
   
## 5. Storage Policies (Optional - for enhanced security)

If you want user-specific access control, add these RLS policies:

```sql
-- Allow users to upload their own files
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view all files (for chat functionality)
CREATE POLICY "Users can view all files" ON storage.objects
FOR SELECT USING (true);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## 6. Backend Integration

Your backend upload route has been updated to work with Supabase URLs instead of local file storage.

## 7. Features Enabled

✅ **File Uploads**: Images, documents, PDFs
✅ **Avatar Management**: User profile pictures
✅ **Drag & Drop**: Easy file sharing in chat
✅ **Auto Optimization**: Image resizing and compression
✅ **CDN Delivery**: Fast global file access
✅ **Security**: User-based access control

## 8. Usage

- **File Sharing**: Click paperclip icon in chat input
- **Avatar Upload**: Click camera icon on profile picture
- **Drag & Drop**: Drag files directly into chat

## 9. Costs

- **Free Tier**: 1GB storage + 2GB bandwidth
- **Pro Tier**: $25/month for 100GB storage + 200GB bandwidth
- **Additional**: $0.021/GB storage, $0.09/GB bandwidth

## 10. Migration from Local Storage

The old local file storage has been completely replaced. All new uploads will go to Supabase automatically.
