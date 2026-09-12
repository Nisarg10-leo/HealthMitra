import React from 'react';

const defaultProps = (size = 18, strokeWidth = 1.75) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true'
});

export function ClockIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function CheckIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function AlertCircleIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function PillIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </svg>
  );
}

export function CalendarIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function PhoneIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function UserIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function ShieldIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function ShieldAlertIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function CameraIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function MicrophoneIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function SparklesIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M12 3l1.912 4.673a2 2 0 0 0 1.077 1.077L19.662 10.662a1 1 0 0 1 0 1.854l-4.673 1.912a2 2 0 0 0-1.077 1.077L12 20.179l-1.912-4.674a2 2 0 0 0-1.077-1.077L4.338 12.516a1 1 0 0 1 0-1.854l4.673-1.912a2 2 0 0 0 1.077-1.077L12 3z" />
    </svg>
  );
}

export function HeartIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function PlusIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function CrossIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function QrCodeIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <line x1="14" y1="14" x2="14.01" y2="14" />
      <line x1="14" y1="17" x2="14.01" y2="17" />
      <line x1="17" y1="14" x2="20" y2="14" />
      <line x1="20" y1="17" x2="20.01" y2="17" />
      <line x1="17" y1="20" x2="20" y2="20" />
    </svg>
  );
}

export function BellIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function SearchIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function GlobeIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function PrinterIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export function TrashIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function EditIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ActivityIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function EyeIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function LinkIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function FileTextIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function Volume2Icon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 18, className = '', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.77 14.17c-.24.68-1.4 1.29-1.92 1.37-.49.07-1.12.1-3.26-.78-2.56-1.06-4.2-3.66-4.33-3.83-.13-.17-1.03-1.37-1.03-2.62 0-1.25.65-1.86.88-2.12.23-.26.51-.32.68-.32.17 0 .34 0 .49.01.16.01.37-.06.58.44.22.52.75 1.83.82 1.97.07.14.11.31.02.49-.09.17-.14.28-.28.44-.14.16-.3.35-.43.47-.14.14-.29.29-.12.58.17.29.74 1.23 1.59 1.99 1.1.98 2.02 1.28 2.31 1.42.29.14.46.12.63-.08.17-.2.74-.86.94-1.16.2-.29.4-.25.68-.14.28.11 1.77.83 2.08.99.31.15.52.23.59.36.07.13.07.75-.17 1.43z" />
    </svg>
  );
}

export function CrossMedicalIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
    </svg>
  );
}

export function GridIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export function LogoutIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function MicIcon({ size = 18, strokeWidth = 1.75, className = '', style = {} }) {
  return (
    <svg {...defaultProps(size, strokeWidth)} className={className} style={style}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}


