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
  },
  {
    id: 4,
    name: "Lantern Pairing",
    capacity: 4,
    shelves: [
      ["leaf", "leaf", "moon", "fire"],
      ["fire", "moon", "moon", "fire"],
      ["leaf", "moon", "leaf", "fire"],
      [],
      []
    ]
  },
  {
    id: 5,
    name: "Quiet Sprouts",
    capacity: 4,
    shelves: [
      ["leaf", "fire", "moon", "fire"],
      ["fire", "leaf", "moon", "leaf"],
      ["leaf", "moon", "moon", "fire"],
      [],
      []
    ]
  },
  {
    id: 6,
    name: "Four Lanterns",
    capacity: 4,
    shelves: [
      ["moon", "cloud", "cloud", "leaf"],
      ["fire", "fire", "moon", "moon"],
      ["cloud", "cloud", "leaf", "fire"],
      ["moon", "leaf", "leaf", "fire"],
      [],
      []
    ]
  },
  {
    id: 7,
    name: "Cedar Moon",
    capacity: 4,
    shelves: [
      ["moon", "leaf", "cloud", "cloud"],
      ["fire", "cloud", "leaf", "moon"],
      ["leaf", "cloud", "fire", "moon"],
      ["moon", "fire", "leaf", "fire"],
      [],
      []
    ]
  },
  {
    id: 8,
    name: "Cloud Paths",
    capacity: 4,
    shelves: [
      ["fire", "fire", "leaf", "moon"],
      ["leaf", "cloud", "leaf", "cloud"],
      ["moon", "moon", "fire", "leaf"],
      ["moon", "cloud", "cloud", "fire"],
      [],
      []
    ]
  },
  {
    id: 9,
    name: "Tiny Star",
    capacity: 4,
    shelves: [
      ["star", "fire", "moon", "star"],
      ["moon", "leaf", "star", "fire"],
      ["leaf", "star", "fire", "moon"],
      ["fire", "moon", "leaf", "leaf"],
      [],
      []
    ]
  },
  {
    id: 10,
    name: "Five Families",
    capacity: 4,
    shelves: [
      ["star", "leaf", "star", "moon"],
      ["cloud", "fire", "cloud", "star"],
      ["fire", "fire", "cloud", "cloud"],
      ["star", "moon", "leaf", "fire"],
      ["moon", "moon", "leaf", "leaf"],
      [],
      []
    ]
  },
  {
    id: 11,
    name: "Star Trail",
    capacity: 4,
    shelves: [
      ["fire", "fire", "moon", "moon"],
      ["star", "star", "cloud", "star"],
      ["leaf", "fire", "star", "fire"],
      ["leaf", "moon", "cloud", "leaf"],
      ["cloud", "cloud", "moon", "leaf"],
      [],
      []
    ]
  },
  {
    id: 12,
    name: "Moonlit Gathering",
    capacity: 4,
    shelves: [
      ["leaf", "fire", "star", "cloud"],
      ["star", "star", "moon", "moon"],
      ["cloud", "moon", "fire", "cloud"],
      ["cloud", "leaf", "moon", "star"],
      ["fire", "fire", "leaf", "leaf"],
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
