/**
 * Increase a number by a particular percent.
 *
 * @param {string} no
 * @param {number} percent
 * @returns Number
 */
const increaseByPercent = (no: number, percent: number): number => {
  return +no + percent / 100;
};

export { increaseByPercent };
