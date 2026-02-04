import Decimal from 'decimal.js';

/**
 * MoneyMath - Utility class for precise monetary calculations
 * Uses decimal.js to avoid floating-point precision errors
 * 
 * All amounts are stored and calculated as strings to maintain precision
 * The database DECIMAL(20,2) type ensures 2 decimal places
 */
export class MoneyMath {
  // Configure Decimal.js for monetary calculations
  private static readonly config = {
    precision: 20, // Total significant digits
    rounding: Decimal.ROUND_HALF_UP, // Standard rounding for money
    toExpNeg: -7,
    toExpPos: 21,
  };

  /**
   * Add two monetary amounts
   * @param a First amount (string or number)
   * @param b Second amount (string or number)
   * @returns Sum as string with 2 decimal places
   */
  static add(a: string | number, b: string | number): string {
    Decimal.set(this.config);
    return new Decimal(a).plus(b).toFixed(2);
  }

  /**
   * Subtract two monetary amounts
   * @param a Amount to subtract from (string or number)
   * @param b Amount to subtract (string or number)
   * @returns Difference as string with 2 decimal places
   */
  static subtract(a: string | number, b: string | number): string {
    Decimal.set(this.config);
    return new Decimal(a).minus(b).toFixed(2);
  }

  /**
   * Multiply a monetary amount
   * @param a Amount (string or number)
   * @param b Multiplier (string or number)
   * @returns Product as string with 2 decimal places
   */
  static multiply(a: string | number, b: string | number): string {
    Decimal.set(this.config);
    return new Decimal(a).times(b).toFixed(2);
  }

  /**
   * Divide a monetary amount
   * @param a Amount (string or number)
   * @param b Divisor (string or number)
   * @returns Quotient as string with 2 decimal places
   */
  static divide(a: string | number, b: string | number): string {
    Decimal.set(this.config);
    if (new Decimal(b).equals(0)) {
      throw new Error('Division by zero');
    }
    return new Decimal(a).dividedBy(b).toFixed(2);
  }

  /**
   * Compare two monetary amounts
   * @param a First amount
   * @param b Second amount
   * @returns -1 if a < b, 0 if a === b, 1 if a > b
   */
  static compare(a: string | number, b: string | number): number {
    Decimal.set(this.config);
    return new Decimal(a).comparedTo(b);
  }

  /**
   * Check if amount is greater than another
   */
  static greaterThan(a: string | number, b: string | number): boolean {
    return this.compare(a, b) > 0;
  }

  /**
   * Check if amount is greater than or equal to another
   */
  static greaterThanOrEqual(a: string | number, b: string | number): boolean {
    return this.compare(a, b) >= 0;
  }

  /**
   * Check if amount is less than another
   */
  static lessThan(a: string | number, b: string | number): boolean {
    return this.compare(a, b) < 0;
  }

  /**
   * Check if amount is less than or equal to another
   */
  static lessThanOrEqual(a: string | number, b: string | number): boolean {
    return this.compare(a, b) <= 0;
  }

  /**
   * Check if two amounts are equal
   */
  static equals(a: string | number, b: string | number): boolean {
    return this.compare(a, b) === 0;
  }

  /**
   * Format amount to 2 decimal places
   */
  static format(amount: string | number): string {
    Decimal.set(this.config);
    return new Decimal(amount).toFixed(2);
  }

  /**
   * Validate if a value is a valid monetary amount
   */
  static isValid(amount: any): boolean {
    try {
      const decimal = new Decimal(amount);
      return decimal.isFinite();
    } catch {
      return false;
    }
  }

  /**
   * Calculate daily interest
   * @param principal Principal amount
   * @param annualRate Annual interest rate (e.g., 0.05 for 5%)
   * @param days Number of days
   * @returns Interest amount as string
   */
  static calculateDailyInterest(
    principal: string | number,
    annualRate: string | number,
    days: number,
  ): string {
    Decimal.set(this.config);
    const p = new Decimal(principal);
    const r = new Decimal(annualRate);
    const d = new Decimal(days);
    
    // Interest = P * r * (days/365)
    return p.times(r).times(d.dividedBy(365)).toFixed(2);
  }

  /**
   * Calculate interest with leap year handling
   * @param principal Principal amount
   * @param annualRate Annual interest rate
   * @param startDate Start date
   * @param endDate End date
   * @returns Interest amount as string
   */
  static calculateInterestWithLeapYear(
    principal: string | number,
    annualRate: string | number,
    startDate: Date,
    endDate: Date,
  ): string {
    Decimal.set(this.config);
    
    // Calculate days between dates
    const days = this.getDaysBetween(startDate, endDate);
    
    // Determine if we need to account for leap years
    const daysInYear = this.hasLeapYearBetween(startDate, endDate) ? 366 : 365;
    
    const p = new Decimal(principal);
    const r = new Decimal(annualRate);
    const d = new Decimal(days);
    const diy = new Decimal(daysInYear);
    
    // Interest = P * r * (days/daysInYear)
    return p.times(r).times(d.dividedBy(diy)).toFixed(2);
  }

  /**
   * Get number of days between two dates
   */
  private static getDaysBetween(start: Date, end: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    return Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay));
  }

  /**
   * Check if there's a leap year between two dates
   */
  private static hasLeapYearBetween(start: Date, end: Date): boolean {
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      if (this.isLeapYear(year)) {
        // Check if Feb 29 falls within the date range
        const feb29 = new Date(year, 1, 29);
        if (feb29 >= start && feb29 <= end) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a year is a leap year
   */
  private static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }
}
