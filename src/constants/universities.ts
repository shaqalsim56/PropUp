export const UNIVERSITIES = [
  'University of Technology, Jamaica (UTech)',
  'The University of the West Indies, Mona (UWI)',
  'Northern Caribbean University (NCU)',
  'University of the Commonwealth Caribbean (UCC)',
  'Caribbean Maritime University (CMU)',
  'Edna Manley College of the Visual & Performing Arts',
  'Knox Community College',
  'Excelsior Community College',
  'Portmore Community College',
  "Brown's Town Community College",
  'Moneague College',
] as const

export type University = (typeof UNIVERSITIES)[number]

export interface UniMeta {
  shortName: string
  logoUrl: string
  color: string
}

export const UNIVERSITY_META: Record<string, UniMeta> = {
  'University of Technology, Jamaica (UTech)': {
    shortName: 'UTech',
    logoUrl: 'https://logo.clearbit.com/utech.edu.jm',
    color: '#003082',
  },
  'The University of the West Indies, Mona (UWI)': {
    shortName: 'UWI',
    logoUrl: 'https://logo.clearbit.com/uwimona.edu.jm',
    color: '#006633',
  },
  'Northern Caribbean University (NCU)': {
    shortName: 'NCU',
    logoUrl: 'https://logo.clearbit.com/ncu.edu.jm',
    color: '#002D72',
  },
  'University of the Commonwealth Caribbean (UCC)': {
    shortName: 'UCC',
    logoUrl: 'https://logo.clearbit.com/ucc.edu.jm',
    color: '#1A4480',
  },
  'Caribbean Maritime University (CMU)': {
    shortName: 'CMU',
    logoUrl: 'https://logo.clearbit.com/cmu.edu.jm',
    color: '#0D2644',
  },
  'Edna Manley College of the Visual & Performing Arts': {
    shortName: 'EMC',
    logoUrl: 'https://logo.clearbit.com/ednamanley.edu.jm',
    color: '#5B2D8E',
  },
  'Knox Community College': {
    shortName: 'Knox',
    logoUrl: 'https://logo.clearbit.com/knox.edu.jm',
    color: '#7B1C1C',
  },
  'Excelsior Community College': {
    shortName: 'ECC',
    logoUrl: 'https://logo.clearbit.com/excelsior.edu.jm',
    color: '#1A5C38',
  },
  'Portmore Community College': {
    shortName: 'PCC',
    logoUrl: 'https://logo.clearbit.com/portmore.edu.jm',
    color: '#1A3A6E',
  },
  "Brown's Town Community College": {
    shortName: 'BTCC',
    logoUrl: 'https://logo.clearbit.com/btcc.edu.jm',
    color: '#5C3A1A',
  },
  'Moneague College': {
    shortName: 'MC',
    logoUrl: 'https://logo.clearbit.com/moneague.edu.jm',
    color: '#1E5C3A',
  },
}

export function getUniMeta(name: string | null | undefined): UniMeta {
  if (!name) return { shortName: '?', logoUrl: '', color: '#534AB7' }
  return UNIVERSITY_META[name] ?? { shortName: name.slice(0, 4).toUpperCase(), logoUrl: '', color: '#534AB7' }
}
