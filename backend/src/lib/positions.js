// Council positions (must match the council_position enum in 001_core.sql).

export const POSITION_TITLES = {
  president: 'President',
  co_council_secretary: 'Co-Council Secretary',
  ladies_representative: 'Ladies Representative',
  reserved_representative: 'Reserved Representative',
  anti_ragging_representative: 'Anti-Ragging Representative',
  general_secretary: 'General Secretary',
  co_general_secretary: 'Co-General Secretary',
  technical_secretary: 'Technical Secretary',
  co_technical_secretary: 'Co-Technical Secretary',
  technical_member: 'Technical Member',
  cultural_secretary: 'Cultural Secretary',
  co_cultural_secretary: 'Co-Cultural Secretary',
  cultural_member: 'Cultural Member',
  sports_secretary: 'Sports Secretary',
  co_sports_secretary: 'Co-Sports Secretary',
  sports_member: 'Sports Member',
  class_representative: 'Class Representative'
};

// Position-type filter shown in the directory.
export const POSITION_GROUPS = [
  { key: 'gs', label: 'General Secretary', positions: ['general_secretary', 'co_general_secretary'] },
  {
    key: 'secretary',
    label: 'Secretary',
    positions: [
      'co_council_secretary', 'technical_secretary', 'co_technical_secretary',
      'cultural_secretary', 'co_cultural_secretary', 'sports_secretary', 'co_sports_secretary'
    ]
  },
  { key: 'cr', label: 'Class Representative', positions: ['class_representative'] },
  { key: 'president', label: 'President', positions: ['president'] },
  { key: 'anti_ragging', label: 'Anti-Ragging Rep', positions: ['anti_ragging_representative'] },
  {
    key: 'member',
    label: 'Member / Other',
    positions: ['ladies_representative', 'reserved_representative', 'technical_member', 'cultural_member', 'sports_member']
  }
];

export const positionGroupOf = (position) =>
  POSITION_GROUPS.find((group) => group.positions.includes(position))?.key || 'member';
