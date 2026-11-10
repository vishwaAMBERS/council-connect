import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { UserProfileView } from './RepProfile.jsx';

/** The signed-in user's own profile: same role-aware page, with editing enabled by the server's isSelf flag. */
export default function Profile() {
  const { user } = useAuth();
  return <UserProfileView userId={user.id} />;
}
