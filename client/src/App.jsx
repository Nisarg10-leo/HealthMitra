import React from 'react';
import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { SessionContext, useSessionState } from './hooks/useSession.js';
import { Workspace } from './workspace/Workspace.jsx';

// Root: decides between the public sign-in screen and the signed-in workspace.
export default function App() {
  const { session, signIn, signOut } = useSessionState();
  if (!session) return <AuthPage onLogin={signIn} />;
  return (
    <ErrorBoundary>
      <SessionContext.Provider value={session}>
        <Workspace onLogout={signOut} />
      </SessionContext.Provider>
    </ErrorBoundary>
  );
}
