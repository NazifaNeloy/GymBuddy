import { getSupabase } from '../client';
import { toAuthError } from '../errors';

export const EXERCISE_COLUMNS =
  'id, user_id, slug, name, primary_muscle, secondary_muscles, equipment, category, tracking, instructions, updated_at';

/**
 * All exercises the current user can see: the public built-in library plus their own
 * custom exercises (enforced by RLS). Deleted rows are excluded.
 */
export async function fetchExercises() {
  let result;
  try {
    result = await getSupabase()
      .from('exercises')
      .select(EXERCISE_COLUMNS)
      .is('deleted_at', null)
      .order('name', { ascending: true });
  } catch (error) {
    throw toAuthError(error);
  }
  if (result.error) throw toAuthError(result.error);
  return result.data ?? [];
}
