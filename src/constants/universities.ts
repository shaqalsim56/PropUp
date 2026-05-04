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
