-- Delete duplicate user account (58a0535f-6f9b-4bfe-82f0-f6f2169322cf)
-- This is the duplicate account with 'free' role that needs to be removed

-- Delete user profile (if exists)
DELETE FROM public.profiles 
WHERE id = '58a0535f-6f9b-4bfe-82f0-f6f2169322cf';

-- Delete user roles (if exists)
DELETE FROM public.user_roles 
WHERE user_id = '58a0535f-6f9b-4bfe-82f0-f6f2169322cf';

-- Delete from auth.users (CASCADE will clean up other references)
DELETE FROM auth.users 
WHERE id = '58a0535f-6f9b-4bfe-82f0-f6f2169322cf';