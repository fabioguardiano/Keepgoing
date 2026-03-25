-- =============================================================================
-- CORREÇÃO DE SEGURANÇA — Storage bucket work-order-drawings
-- Problema: políticas de INSERT e DELETE sem verificação de autenticação,
--           permitindo acesso anônimo irrestrito ao bucket.
-- =============================================================================

-- SELECT: público (bucket é público para visualização de imagens nas OS)
DROP POLICY IF EXISTS "drawings_select" ON storage.objects;
CREATE POLICY "drawings_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'work-order-drawings');

-- INSERT: apenas usuários autenticados
DROP POLICY IF EXISTS "drawings_insert" ON storage.objects;
CREATE POLICY "drawings_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'work-order-drawings'
    AND auth.role() = 'authenticated'
  );

-- UPDATE: apenas o dono do arquivo (autenticado)
DROP POLICY IF EXISTS "drawings_update" ON storage.objects;
CREATE POLICY "drawings_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'work-order-drawings'
    AND auth.role() = 'authenticated'
    AND owner = auth.uid()
  );

-- DELETE: apenas o dono do arquivo (autenticado)
DROP POLICY IF EXISTS "drawings_delete" ON storage.objects;
CREATE POLICY "drawings_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'work-order-drawings'
    AND auth.role() = 'authenticated'
    AND owner = auth.uid()
  );
