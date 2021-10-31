/**
 * Increase a number by a particular percent.
 *
 * @param {string} no
 * @param {number} percent
 * @returns Number
 */
const increaseByPercent = (no: number, percent: number): number => {
  const value = (+no * Math.abs(percent)) / 100;
  return +no + value * (percent < 0 ? -1 : 1);
};

export { increaseByPercent };
