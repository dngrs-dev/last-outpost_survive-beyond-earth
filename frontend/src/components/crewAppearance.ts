// Original, fictional character art. IDs keep a person's appearance consistent everywhere.
export interface CrewAppearance {
  skin: string;
  shade: string;
  hair: string;
  eyes: string;
  style: 'sweep' | 'curls' | 'bob' | 'crop' | 'bun';
  glasses?: boolean;
  freckles?: boolean;
  face?: 'oval' | 'square' | 'tapered';
  beard?: boolean;
  silver?: boolean;
}

const appearances: Record<string, CrewAppearance> = {
  alex: {
    skin: '#e9b692',
    shade: '#c7896d',
    hair: '#503730',
    eyes: '#668890',
    style: 'sweep',
    freckles: true,
  },
  maya: {
    skin: '#986347',
    shade: '#714733',
    hair: '#262333',
    eyes: '#b78b55',
    style: 'bun',
  },
  lin: {
    skin: '#edc5a3',
    shade: '#c8987c',
    hair: '#222c40',
    eyes: '#5e6c83',
    style: 'bob',
    glasses: true,
  },
  sam: {
    skin: '#f1cbb4',
    shade: '#cfa48e',
    hair: '#bc663c',
    eyes: '#66968a',
    style: 'crop',
    freckles: true,
  },
  nora: {
    skin: '#c58f69',
    shade: '#a16a51',
    hair: '#3a2936',
    eyes: '#906955',
    style: 'curls',
  },
  omar: {
    skin: '#c18a64',
    shade: '#975e48',
    hair: '#29303c',
    eyes: '#657c60',
    style: 'sweep',
  },
  elena: {
    skin: '#efba9d',
    shade: '#c78c77',
    hair: '#854e3c',
    eyes: '#82a7b5',
    style: 'bun',
    glasses: true,
  },
  daria: {
    skin: '#f4d4b3',
    shade: '#d0a585',
    hair: '#b58a51',
    eyes: '#7b9d82',
    style: 'bob',
    freckles: true,
  },
  inez: {
    skin: '#b87b5c',
    shade: '#90583f',
    hair: '#342a35',
    eyes: '#9d7951',
    style: 'curls',
  },
  jules: {
    skin: '#76513f',
    shade: '#54392e',
    hair: '#202636',
    eyes: '#ab916d',
    style: 'crop',
    glasses: true,
  },
  rhea: {
    skin: '#b88360',
    shade: '#8d5d49',
    hair: '#242834',
    eyes: '#6b7058',
    style: 'bun',
    face: 'tapered',
  },
  priya: {
    skin: '#a57150',
    shade: '#79513e',
    hair: '#302a2d',
    eyes: '#a68b62',
    style: 'bob',
    face: 'oval',
    glasses: true,
  },
  theo: {
    skin: '#dcb696',
    shade: '#ad846e',
    hair: '#5d5148',
    eyes: '#70949b',
    style: 'sweep',
    face: 'square',
    beard: true,
    silver: true,
  },
  hao: {
    skin: '#d9b795',
    shade: '#ae8a71',
    hair: '#272d36',
    eyes: '#695b51',
    style: 'crop',
    face: 'tapered',
    glasses: true,
  },
  vera: {
    skin: '#bd9274',
    shade: '#946b55',
    hair: '#66483a',
    eyes: '#7a8b6b',
    style: 'curls',
    face: 'oval',
    freckles: true,
  },
  nik: {
    skin: '#dbc3af',
    shade: '#b09580',
    hair: '#675d53',
    eyes: '#73929b',
    style: 'crop',
    face: 'square',
    beard: true,
  },
};

export const crewAppearance = (id: string): CrewAppearance =>
  appearances[id] || appearances.alex;

export const roleColor = (role: string) =>
  ({
    engineer: '#ffcc83',
    medic: '#89e8bd',
    scientist: '#c5acff',
    technician: '#83dafa',
  })[role] || '#a8bfd4';

export const roleName = (role: string) =>
  role.charAt(0).toUpperCase() + role.slice(1);
