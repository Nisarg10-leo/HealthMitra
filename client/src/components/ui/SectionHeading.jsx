import React from 'react';

// Every screen opens with the same heading block: kicker, title, subtitle,
// and an optional action slot on the right.
export function SectionHeading({ kicker, title, subtitle, action, className = '' }) {
  return <section className={`section-heading ${className}`.trim()}>
    <div>{kicker && <p className="section-kicker">{kicker}</p>}<h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    {action}
  </section>;
}
