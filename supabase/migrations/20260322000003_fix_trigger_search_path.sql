-- SECURITY DEFINER functions need explicit search_path to find public schema tables.
-- Without SET search_path = public, the trigger cannot resolve 'profiles'.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, slug, display_name)
  VALUES (
    NEW.id,
    'user-' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;
