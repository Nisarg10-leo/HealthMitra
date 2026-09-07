import React from 'react';

export const ErrorText = ({ error }) => (error ? <p className="error" role="alert">{error}</p> : null);
