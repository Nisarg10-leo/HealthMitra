import React from 'react';
import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { ProfileSetup } from './features/profile/ProfileSetup.jsx';
import { SessionContext, useSessionState } from './hooks/useSession.js';
import { Workspace } from './workspace/Workspace.jsx';

// Root: decides between the public sign-in screen, first-time profile setup, and the signed-in workspace.
export default function App() {
  const { session, signIn, signOut } = useSessionState();

  if (!session) return <AuthPage onLogin={signIn} />;

  // First-time login: if profile is not yet completed, show onboarding setup
  if (!session.profileComplete) {
    return (
      <ErrorBoundary>
        <SessionContext.Provider value={session}>
          <ProfileSetup
            session={session}
            onComplete={(updated) => {
              signIn({ ...session, ...updated, profileComplete: true });
            }}
            onSkip={() => {
              signIn({ ...session, profileComplete: true });
            }}
            onLogout={signOut}
          />
        </SessionContext.Provider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SessionContext.Provider value={session}>
        <Workspace onLogout={signOut} />
      </SessionContext.Provider>
    </ErrorBoundary>
  );
}
