export const SPIRIT_SORT_LEVELS = [
  {
    id: 1,
    name: "First Glow",
    capacity: 4,
    shelves: [
      ["fire", "leaf", "fire", "leaf"],
      ["leaf", "fire", "leaf", "fire"],
      [],
      []
    ]
  },
  {
    id: 2,
    name: "Moon Visitors",
    capacity: 4,
    shelves: [
      ["fire", "moon", "fire", "moon"],
      ["moon", "leaf", "moon", "leaf"],
      ["leaf", "fire", "leaf", "fire"],
      [],
      []
    ]
  },
  {
    id: 3,
    name: "Cloudy Shrine",
    capacity: 4,
    shelves: [
      ["cloud", "fire", "leaf", "cloud"],
      ["leaf", "cloud", "fire", "leaf"],
      ["fire", "leaf", "cloud", "fire"],
      [],
      []
    ]
  }
];

export function cloneLevel(level) {
  return {
    ...level,
    shelves: level.shelves.map((shelf) => [...shelf])
  };
}
