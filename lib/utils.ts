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

/**
 * Generate a random number within a range
 *
 * @param {number} min
 * @param {number} max
 * @returns Number
 */
const randomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min) + min);
};

export { increaseByPercent, randomNumber };
