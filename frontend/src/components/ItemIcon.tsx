/** Original cargo illustrations: shared silhouettes, rounded outlines, and suit-like materials. */
export function ItemIcon({ id }: { id: string }) {
  const accent =
    (
      {
        food_packs: '#f4cf8d',
        water_containers: '#84d6f4',
        medicine_kits: '#8de6b9',
        repair_kits: '#efbf86',
        eva_batteries: '#9cceef',
        oxygen_tanks: '#92dcd4',
        power_cells: '#f4dc8f',
        dust_kits: '#bdc7ef',
        oxygen_regulators: '#8cdbd1',
        diagnostic_tools: '#9de2be',
        sealant_packs: '#f1ba9d',
        scientific_tools: '#c6b1f3',
      } as Record<string, string>
    )[id] || '#9ec7e0';
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-item-icon={id}
    >
      <ellipse cx="40" cy="71" rx="25" ry="4" fill="#020a17" opacity=".35" />
      <g
        stroke="#293f55"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {id === 'food_packs' ? (
          <>
            <path d="M22 14h36l-3 12 5 37q-20 10-40 0l5-37Z" fill="#c5d9e2" />
            <path d="M22 14h36v8H22Z" fill={accent} />
            <path d="M25 58h30v7H25Z" fill="#8aabbf" />
            <rect x="27" y="31" width="26" height="21" rx="6" fill={accent} />
            <path d="M40 35v13m-5-9q5 3 5 7m5-8q-5 2-5 8" stroke="#7c663f" />
          </>
        ) : id === 'water_containers' ? (
          <>
            <path
              d="M28 17v-6h22v6M29 21V16h21v5"
              stroke="#94b9ca"
              strokeWidth="6"
            />
            <path
              d="M25 20h30l8 11v30q0 8-8 8H25q-8 0-8-8V31Z"
              fill="#bed7e4"
            />
            <path d="M52 27h4v12h-4" stroke="#54778e" strokeWidth="5" />
            <path
              d="M40 32q-15 17-13 23 4 12 13 12t13-12q2-6-13-23Z"
              fill={accent}
            />
            <path d="M33 55q0 5 5 6" stroke="#e4f8ff" />
          </>
        ) : id === 'medicine_kits' ? (
          <>
            <path d="M30 22v-8h20v8" stroke="#91adbe" strokeWidth="6" />
            <rect x="15" y="23" width="50" height="42" rx="10" fill="#c7dce5" />
            <path d="M15 39h50" stroke="#8ca9bd" />
            <rect x="28" y="31" width="24" height="25" rx="7" fill={accent} />
            <path d="M40 36v15m-7-7h14" stroke="#315f52" strokeWidth="4" />
            <path d="M22 57h5m26 0h5" />
          </>
        ) : id === 'repair_kits' ? (
          <>
            <path d="M29 25V15h22v10" stroke="#94afc0" strokeWidth="6" />
            <rect x="12" y="26" width="56" height="39" rx="9" fill="#b8cedd" />
            <path d="M12 39h56" stroke="#7797ad" />
            <rect x="19" y="34" width="7" height="12" rx="2" fill={accent} />
            <rect x="54" y="34" width="7" height="12" rx="2" fill={accent} />
            <path
              d="m32 55 14-14m-3-3 6 6m-18 8 5 5"
              stroke="#52718b"
              strokeWidth="4"
            />
          </>
        ) : id === 'eva_batteries' ? (
          <>
            <rect x="19" y="16" width="42" height="52" rx="12" fill="#bed5e2" />
            <path d="M29 16v-6h22v6" fill="#6c8ca3" />
            <path d="M19 29h42m-42 23h42" stroke="#87a9bf" />
            <rect x="28" y="25" width="24" height="33" rx="7" fill="#4b6b85" />
            <path
              d="m42 30-9 13h7l-3 10 12-15h-8Z"
              fill={accent}
              strokeWidth="1.5"
            />
            <path d="M24 60h3m26 0h3" />
          </>
        ) : id === 'oxygen_tanks' ? (
          <>
            <path
              d="M25 20v-9m25 9v-9m-29 0h8m17 0h8"
              stroke="#8cb6c2"
              strokeWidth="4"
            />
            <rect x="15" y="22" width="23" height="45" rx="11" fill="#c1d9e2" />
            <rect x="42" y="22" width="23" height="45" rx="11" fill="#b1ccd9" />
            <path d="M15 39h23v13H15Zm27 0h23v13H42Z" fill={accent} />
            <path d="M38 32h4v28h-4" stroke="#56798d" strokeWidth="5" />
            <circle cx="27" cy="45" r="4" stroke="#4e7e80" strokeWidth="2" />
          </>
        ) : id === 'power_cells' ? (
          <>
            <path d="M31 17V9h18v8" fill="#799bb1" />
            <rect x="21" y="17" width="38" height="51" rx="9" fill="#bcd4e0" />
            <path d="M21 29h38m-38 27h38" stroke="#779bb2" />
            <rect x="27" y="30" width="26" height="25" rx="5" fill={accent} />
            <path
              d="m42 33-9 12h7l-2 7 10-13h-7Z"
              fill="#826b3f"
              stroke="none"
            />
            <path d="M32 62h16" stroke="#edf6f7" />
          </>
        ) : id === 'dust_kits' ? (
          <>
            <rect x="15" y="39" width="50" height="28" rx="8" fill="#bbd1de" />
            <path d="M15 49h50" stroke="#86a6bd" />
            <path d="M24 39V21q0-9 8-9t8 9v18" fill={accent} />
            <path d="M29 18h6v25h-6Z" fill="#dce9ee" />
            <path d="m43 31 9-16 9 5-9 16" fill="#728fa9" />
            <path d="m38 40 6-14 17 10-6 11Z" fill={accent} />
            <path
              d="m43 33-3 8m8-5-3 8m8-5-3 8"
              stroke="#647391"
              strokeWidth="2"
            />
          </>
        ) : id === 'oxygen_regulators' ? (
          <>
            <path d="M17 49h46v14H17Z" fill="#a9c7d5" />
            <path d="M15 52H9v8h6m50-8h6v8h-6" fill="#6c8b9d" />
            <path d="M32 48V33h16v15" fill="#b4d0dc" />
            <circle cx="40" cy="27" r="17" fill="#c6dce4" />
            <circle cx="40" cy="27" r="12" fill={accent} />
            <path d="m40 27 7-7m-16 9h1m15 0h1m-9-12v1" />
            <path d="M29 56h22" stroke="#eff8f9" />
          </>
        ) : id === 'diagnostic_tools' ? (
          <>
            <rect x="19" y="12" width="42" height="56" rx="10" fill="#b8d1e0" />
            <rect x="25" y="21" width="30" height="32" rx="5" fill="#28475f" />
            <path
              d="M29 38h6l3-8 5 16 3-8h5"
              stroke={accent}
              strokeWidth="2.5"
            />
            <circle cx="40" cy="60" r="3" fill={accent} />
            <path d="M31 16h18" stroke="#799eb8" />
          </>
        ) : id === 'sealant_packs' ? (
          <>
            <circle cx="36" cy="40" r="24" fill="#b9ceda" />
            <circle cx="36" cy="40" r="17" fill={accent} />
            <circle cx="36" cy="40" r="9" fill="#4e6d84" />
            <path d="M56 39q12 0 12 14v13H52V51" fill="#afc7d7" />
            <path d="M58 58h10m-16 8h16" stroke="#e5d0bb" />
            <path d="M21 24q-8 9-5 19" stroke="#e5eef2" />
          </>
        ) : id === 'scientific_tools' ? (
          <>
            <path d="M15 40h50v25H15Z" fill="#b8cede" />
            <path d="m15 40 8-12h34l8 12" fill="#789bb2" />
            <path d="M15 47h50" />
            <path d="M26 36V16h10v20" fill={accent} />
            <path d="M26 23h10m-10 7h10" stroke="#67728f" />
            <path d="m42 35 4-16 11 8-1 10Z" fill="#d8d5e5" />
            <path d="m46 25 5 4m-8 2 6 2" stroke="#9a8fae" />
            <rect x="29" y="47" width="22" height="14" rx="4" fill={accent} />
            <circle cx="38" cy="53" r="3" stroke="#6a608e" />
            <path d="m40 55 5 4" stroke="#6a608e" />
          </>
        ) : (
          <>
            <path d="m15 27 25-13 25 13v35L40 73 15 62Z" fill="#b5cddb" />
            <path d="m15 27 25 13 25-13M40 40v33" />
            <path d="m28 20 25 14v15l-12 6V40L28 33Z" fill={accent} />
          </>
        )}
      </g>
    </svg>
  );
}
