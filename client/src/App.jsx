import React from 'react';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { SessionContext, useSessionState } from './hooks/useSession.js';
import { Workspace } from './workspace/Workspace.jsx';

// Root: decides between the public sign-in screen and the signed-in workspace.
export default function App() {
  const { session, signIn, signOut } = useSessionState();
  if (!session) return <AuthPage onLogin={signIn} />;
  return <SessionContext.Provider value={session}><Workspace onLogout={signOut} /></SessionContext.Provider>;
}
