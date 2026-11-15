export function RoleIcon({ role }: { role: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {role === 'engineer' ? (
        <path d="m14 6 4 4m-7 3-7 7-2-2 7-7a6 6 0 0 1 7-8l-4 4 3 3 4-4a6 6 0 0 1-8 7Z" />
      ) : role === 'medic' ? (
        <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />
      ) : role === 'scientist' ? (
        <>
          <path d="M9 3h6M10 3v7L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2l-6-9V3M7 15h10" />
          <path d="M10 18h.01M14 17h.01" />
        </>
      ) : role === 'technician' ? (
        <>
          <path d="m7 3 2 4-2 3-2-3 2-4Zm0 7v11M16 3v11m-3-11v6h6V3m-3 11v7" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21v-3a7 7 0 0 1 14 0v3" />
        </>
      )}
    </svg>
  );
}
