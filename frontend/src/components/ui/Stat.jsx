import React from 'react';

export const Stat = ({ label, value, tone }) => <div className={`stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
