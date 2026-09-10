import type { AdminIconName } from './menu'

const PATHS: Record<AdminIconName, string> = {
  home: 'M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z',
  users:
    'M8 11a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm8.5-1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM3.2 19.2C4.4 16.6 6.8 15 9 15c1.5 0 2.9.6 4 1.6.7-.4 1.5-.6 2.4-.6 2 0 4.1 1.3 5.3 3.6',
  shield:
    'M12 3 5 6v6.2c0 4.2 2.8 7.9 7 8.8 4.2-.9 7-4.6 7-8.8V6l-7-3z',
  cog: 'M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zM19.4 13a7.8 7.8 0 0 0 .1-2l2-1.5-2-3.4-2.3.7a8 8 0 0 0-1.7-1L15 3.2h-4l-.5 2.6a8 8 0 0 0-1.7 1l-2.3-.7-2 3.4L6.5 11a7.8 7.8 0 0 0 .1 2l-2 1.5 2 3.4 2.3-.7a8 8 0 0 0 1.7 1l.5 2.6h4l.5-2.6a8 8 0 0 0 1.7-1l2.3.7 2-3.4z',
  building:
    'M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M9 8h2M9 12h2M9 16h2M14 21h6V10h-4',
  flag: 'M5 21V4m0 0h10l-2 4 2 4H5',
  sitemap:
    'M10 4h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4zM12 8v4m0 0H6v4m6-4h6v4',
  idCard:
    'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm3 4h4M7 14h2m6-4h4m-4 3h4',
  group:
    'M8 11a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM3 19c1.2-2.6 3.6-4 6-4s4.8 1.4 6 4M14 15c1.6 0 3.3.8 4.6 2.4',
  calendar:
    'M7 4v2m10-2v2M5 8h14M6 6h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
  tags: 'M4 10.5 10.5 4H16v5.5L9.5 16 4 10.5zM14 7.5h.01',
  box: 'M4 8l8-4 8 4v10l-8 4-8-4zM4 8l8 4 8-4M12 12v10',
  map: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
}

export function AdminIcon({ name }: { name: AdminIconName }) {
  return (
    <svg className="admin-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
