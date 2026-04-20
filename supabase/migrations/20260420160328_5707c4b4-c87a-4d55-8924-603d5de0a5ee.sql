drop policy "Authenticated users can suggest skills" on public.skills;
create policy "Authenticated can suggest skills"
  on public.skills for insert to authenticated
  with check (auth.uid() is not null);