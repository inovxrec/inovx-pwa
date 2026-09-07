// src/store/peopleStore.ts

import { supabase } from './authStore';

export interface DirectoryPerson {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  domain: string | null;
  status: 'active' | 'deactivated' | 'no_account';
  photoUrl: string | null;
}

export async function fetchPeople(): Promise<DirectoryPerson[]> {
  const [
    { data: users, error: usersErr },
    { data: directory, error: dirErr },
  ] = await Promise.all([
    supabase
      .from('users')
      .select(
        'id, name, email, role, domain, status',
      ),

    supabase
      .from('member_directory')
      .select(
        'external_key, name, photo_url, linked_user_id',
      ),
  ]);

  if (usersErr) {
    throw new Error(usersErr.message);
  }

  if (dirErr) {
    throw new Error(dirErr.message);
  }

  const byUserId = new Map(
    (users ?? []).map((u) => [u.id, u]),
  );

  const linked: DirectoryPerson[] =
    (users ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      domain: u.domain,
      status: u.status,
      photoUrl:
        (directory ?? []).find(
          (d) => d.linked_user_id === u.id,
        )?.photo_url ?? null,
    }));

  const unlinked: DirectoryPerson[] =
    (directory ?? [])
      .filter(
        (d) =>
          !d.linked_user_id ||
          !byUserId.has(d.linked_user_id),
      )
      .map((d) => ({
        id: d.external_key,
        name: d.name,
        email: null,
        role: null,
        domain: null,
        status: 'no_account' as const,
        photoUrl: d.photo_url,
      }));

  return [...linked, ...unlinked];
}

export async function deactivatePerson(
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      status: 'deactivated',
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
}