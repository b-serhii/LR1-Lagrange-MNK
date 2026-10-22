
export const originalSets = {
  5: [
    [1, 2.1], [2, 3.9], [3, 6.2], [4, 8.1], [5, 10.5]
  ],
  10: [
    [0, 1.2], [1, 2.3], [2, 3.5], [3, 4.8], [4, 6.2],
    [5, 7.5], [6, 8.9], [7, 10.1]
  ],
  20: [
    [0, 1.1], [0.5, 1.4], [1, 2.2], [1.5, 2.8], [2, 3.5],
    [2.5, 4.1], [3, 4.9], [3.5, 5.2], [4, 6.1], [4.5, 6.7],
    [5, 7.3], [5.5, 7.8], [6, 8.5], [6.5, 9.2], [7, 10.1],
    [7.5, 10.4], [8, 11.2], [8.5, 11.9], [9, 12.5], [9.5, 13.1]
  ]
};

export const computedTen = [[8, 11.39], [9, 12.68]];

export function initialSets() {
  return {
    5: originalSets[5].map(([x, y]) => ({ x, y, origin: 'original' })),
    10: [...originalSets[10].map(([x, y]) => ({ x, y, origin: 'original' })),
      ...computedTen.map(([x, y]) => ({ x, y, origin: 'calculated' }))],
    20: originalSets[20].map(([x, y]) => ({ x, y, origin: 'original' }))
  };
}
