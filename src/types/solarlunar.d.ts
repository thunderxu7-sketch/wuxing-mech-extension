declare module 'solarlunar' {
  /**
   * Defines the structure of the object returned by the solar2lunar function.
   * We only define the properties we are actually using.
   */
  interface LunarData {
    gzYear: string;   // e.g., "乙卯"
    gzMonth: string;  // e.g., "丁亥"
    gzDay: string;    // e.g., "甲子"
  }

  /**
   * Declares the main object exported by the 'solarlunar' module.
   */
  const solarLunar: {
    /**
     * Converts a solar (Gregorian) date to lunar calendar information.
     * @param year The solar year.
     * @param month The solar month (1-12).
     * @param day The solar day.
     * @returns An object containing lunar calendar data.
     */
    solar2lunar: (year: number, month: number, day: number) => LunarData;
  };

  export default solarLunar;
}