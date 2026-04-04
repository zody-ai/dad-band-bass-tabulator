export interface CommunitySongSeed {
  id: string;
  title: string;
  artist: string;
  key: string;
  tuning: string;
  tab: string;
}

export const communitySongs: CommunitySongSeed[] = [
  {
    id: 'community-low-lights',
    title: 'Low Lights',
    artist: 'Northline',
    key: 'A',
    tuning: 'Standard (E A D G)',
    tab: 'G|----------------|\\nD|----------------|\\nA|7---7---5---5---|\\nE|0---0---0---0---|',
  },
  {
    id: 'community-river-turn',
    title: 'River Turn',
    artist: 'Paper Lantern',
    key: 'D',
    tuning: 'Drop D (D A D G)',
    tab: 'G|----------------|\\nD|----------------|\\nA|5-5-5---7-7-7---|\\nD|0-0-0---0-0-0---|',
  },
  {
    id: 'community-street-tide',
    title: 'Street Tide',
    artist: 'Luna Drive',
    key: 'E',
    tuning: 'Standard (E A D G)',
    tab: 'G|----------------|\\nD|----------------|\\nA|--7-----5-----3-|\\nE|0---0-0---0-0---|',
  },
  {
    id: 'community-wire-after-dark',
    title: 'Wire After Dark',
    artist: 'Rooftop Parade',
    key: 'G',
    tuning: 'Standard (E A D G)',
    tab: 'G|----------------|\\nD|5---7---9---7---|\\nA|----------------|\\nE|3---3---3---3---|',
  },
];
