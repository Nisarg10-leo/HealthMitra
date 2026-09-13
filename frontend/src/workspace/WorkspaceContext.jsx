import React, { createContext, useContext } from 'react';

// Cross-cutting workspace state (selected patient's dashboard, alerts, refresh,
// toast, modal host, voice input). Features read what they need instead of
// receiving a dozen props through every layer.
export const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);
