-- Cover the routines.source_template_id foreign key (advisor lint 0001).
create index if not exists routines_source_template_idx on public.routines (source_template_id);
