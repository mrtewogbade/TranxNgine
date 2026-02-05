import { MoneyMath } from './money-math.util';

describe('MoneyMath', () => {
  describe('Basic Operations', () => {
    describe('add', () => {
      it('should add two positive numbers correctly', () => {
        expect(MoneyMath.add('100.50', '50.25')).toBe('150.75');
      });

      it('should add decimal numbers without floating-point errors', () => {
        // Classic floating-point problem: 0.1 + 0.2 = 0.30000000000000004
        expect(MoneyMath.add('0.1', '0.2')).toBe('0.30');
      });

      it('should handle large numbers', () => {
        expect(MoneyMath.add('999999999999.99', '0.01')).toBe(
          '1000000000000.00',
        );
      });

      it('should handle zero correctly', () => {
        expect(MoneyMath.add('100.00', '0.00')).toBe('100.00');
      });

      it('should handle negative numbers', () => {
        expect(MoneyMath.add('-50.00', '100.00')).toBe('50.00');
      });
    });

    describe('subtract', () => {
      it('should subtract two positive numbers correctly', () => {
        expect(MoneyMath.subtract('100.50', '50.25')).toBe('50.25');
      });

      it('should subtract decimal numbers without floating-point errors', () => {
        expect(MoneyMath.subtract('0.3', '0.1')).toBe('0.20');
      });

      it('should handle zero correctly', () => {
        expect(MoneyMath.subtract('100.00', '0.00')).toBe('100.00');
      });

      it('should handle negative results', () => {
        expect(MoneyMath.subtract('50.00', '100.00')).toBe('-50.00');
      });
    });

    describe('multiply', () => {
      it('should multiply two positive numbers correctly', () => {
        expect(MoneyMath.multiply('10.50', '2')).toBe('21.00');
      });

      it('should multiply decimal numbers without floating-point errors', () => {
        expect(MoneyMath.multiply('0.1', '0.2')).toBe('0.02');
      });

      it('should handle zero correctly', () => {
        expect(MoneyMath.multiply('100.00', '0')).toBe('0.00');
      });

      it('should round to 2 decimal places', () => {
        expect(MoneyMath.multiply('10.00', '0.333')).toBe('3.33');
      });
    });

    describe('divide', () => {
      it('should divide two positive numbers correctly', () => {
        expect(MoneyMath.divide('100.00', '2')).toBe('50.00');
      });

      it('should divide decimal numbers without floating-point errors', () => {
        expect(MoneyMath.divide('1.00', '3')).toBe('0.33');
      });

      it('should throw error on division by zero', () => {
        expect(() => MoneyMath.divide('100.00', '0')).toThrow(
          'Division by zero',
        );
      });

      it('should round to 2 decimal places', () => {
        expect(MoneyMath.divide('10.00', '3')).toBe('3.33');
      });
    });
  });

  describe('Comparison Operations', () => {
    describe('compare', () => {
      it('should return -1 when first is less than second', () => {
        expect(MoneyMath.compare('50.00', '100.00')).toBe(-1);
      });

      it('should return 0 when both are equal', () => {
        expect(MoneyMath.compare('100.00', '100.00')).toBe(0);
      });

      it('should return 1 when first is greater than second', () => {
        expect(MoneyMath.compare('100.00', '50.00')).toBe(1);
      });

      it('should handle decimal precision', () => {
        expect(MoneyMath.compare('100.001', '100.00')).toBe(1);
      });
    });

    describe('greaterThan', () => {
      it('should return true when first is greater', () => {
        expect(MoneyMath.greaterThan('100.00', '50.00')).toBe(true);
      });

      it('should return false when equal', () => {
        expect(MoneyMath.greaterThan('100.00', '100.00')).toBe(false);
      });

      it('should return false when first is less', () => {
        expect(MoneyMath.greaterThan('50.00', '100.00')).toBe(false);
      });
    });

    describe('equals', () => {
      it('should return true when amounts are equal', () => {
        expect(MoneyMath.equals('100.00', '100.00')).toBe(true);
      });

      it('should return false when amounts differ', () => {
        expect(MoneyMath.equals('100.00', '100.01')).toBe(false);
      });

      it('should handle string and number comparison', () => {
        expect(MoneyMath.equals('100.00', 100)).toBe(true);
      });
    });
  });

  describe('Validation and Formatting', () => {
    describe('isValid', () => {
      it('should validate correct numbers', () => {
        expect(MoneyMath.isValid('100.00')).toBe(true);
        expect(MoneyMath.isValid(100)).toBe(true);
        expect(MoneyMath.isValid('0.01')).toBe(true);
      });

      it('should invalidate non-numeric values', () => {
        expect(MoneyMath.isValid('abc')).toBe(false);
        expect(MoneyMath.isValid(null)).toBe(false);
        expect(MoneyMath.isValid(undefined)).toBe(false);
      });

      it('should validate special numbers', () => {
        expect(MoneyMath.isValid(Infinity)).toBe(false);
        expect(MoneyMath.isValid(NaN)).toBe(false);
      });
    });

    describe('format', () => {
      it('should format to 2 decimal places', () => {
        expect(MoneyMath.format('100')).toBe('100.00');
        expect(MoneyMath.format('100.1')).toBe('100.10');
        expect(MoneyMath.format('100.123')).toBe('100.12');
      });

      it('should handle zero', () => {
        expect(MoneyMath.format('0')).toBe('0.00');
      });
    });
  });

  describe('Interest Calculations', () => {
    describe('calculateDailyInterest', () => {
      it('should calculate simple daily interest correctly', () => {
        // $1000 at 5% annual for 30 days
        // Expected: 1000 * 0.05 * (30/365) = 4.11
        const interest = MoneyMath.calculateDailyInterest(
          '1000.00',
          '0.05',
          30,
        );
        expect(interest).toBe('4.11');
      });

      it('should calculate interest for one day', () => {
        // $1000 at 5% annual for 1 day
        // Expected: 1000 * 0.05 * (1/365) = 0.14
        const interest = MoneyMath.calculateDailyInterest('1000.00', '0.05', 1);
        expect(interest).toBe('0.14');
      });

      it('should calculate interest for full year (365 days)', () => {
        // $1000 at 5% annual for 365 days
        // Expected: 1000 * 0.05 * (365/365) = 50.00
        const interest = MoneyMath.calculateDailyInterest(
          '1000.00',
          '0.05',
          365,
        );
        expect(interest).toBe('50.00');
      });

      it('should handle zero principal', () => {
        const interest = MoneyMath.calculateDailyInterest('0.00', '0.05', 30);
        expect(interest).toBe('0.00');
      });

      it('should handle zero rate', () => {
        const interest = MoneyMath.calculateDailyInterest(
          '1000.00',
          '0.00',
          30,
        );
        expect(interest).toBe('0.00');
      });

      it('should handle zero days', () => {
        const interest = MoneyMath.calculateDailyInterest('1000.00', '0.05', 0);
        expect(interest).toBe('0.00');
      });
    });

    describe('calculateInterestWithLeapYear', () => {
      it('should calculate interest in non-leap year', () => {
        const start = new Date('2023-01-01');
        const end = new Date('2023-01-31'); // 30 days
        // $1000 at 5% for 30 days in 365-day year
        // Interest = 1000 * 0.05 * (30 / 365) = 4.109589... = 4.11
        const interest = MoneyMath.calculateInterestWithLeapYear(
          '1000.00',
          '0.05',
          start,
          end,
        );
        expect(interest).toBe('4.11');
      });

      it('should calculate interest in leap year', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-12-31'); // 365 days (difference between dates)
        // $1000 at 5% for 365 days in 366-day year (leap year)
        // Interest = 1000 * 0.05 * (365 / 366) = 49.863...
        const interest = MoneyMath.calculateInterestWithLeapYear(
          '1000.00',
          '0.05',
          start,
          end,
        );
        expect(interest).toBe('49.86');
      });

      it('should handle period crossing Feb 29 in leap year', () => {
        const start = new Date('2024-02-15');
        const end = new Date('2024-03-15'); // Crosses Feb 29, 2024
        // Should use 366 as denominator
        const interest = MoneyMath.calculateInterestWithLeapYear(
          '1000.00',
          '0.05',
          start,
          end,
        );
        // 29 days: 1000 * 0.05 * (29 / 366) = 3.96...
        expect(interest).toBe('3.96');
      });

      it('should handle same day (zero interest)', () => {
        const date = new Date('2024-01-01');
        const interest = MoneyMath.calculateInterestWithLeapYear(
          '1000.00',
          '0.05',
          date,
          date,
        );
        expect(interest).toBe('0.00');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', () => {
      expect(MoneyMath.add('0.01', '0.01')).toBe('0.02');
    });

    it('should handle very large amounts', () => {
      const large = '999999999999999999.99';
      expect(MoneyMath.format(large)).toBe(large);
    });

    it('should maintain precision through multiple operations', () => {
      // Start with $100
      let amount = '100.00';

      // Add $0.10 ten times
      for (let i = 0; i < 10; i++) {
        amount = MoneyMath.add(amount, '0.10');
      }

      // Should be exactly $101.00, not 100.99999... or 101.00000...1
      expect(amount).toBe('101.00');
    });

    it('should handle complex calculation chain', () => {
      const result = MoneyMath.add(
        MoneyMath.subtract(
          MoneyMath.multiply('100.00', '1.5'),
          MoneyMath.divide('50.00', '2'),
        ),
        '10.00',
      );
      // (100 * 1.5) - (50 / 2) + 10 = 150 - 25 + 10 = 135
      expect(result).toBe('135.00');
    });
  });

  describe('Leap Year Detection', () => {
    it('should correctly identify leap years', () => {
      // Test through calculateInterestWithLeapYear which uses isLeapYear internally
      const leapYearStart = new Date('2024-02-28');
      const leapYearEnd = new Date('2024-03-01'); // Crosses Feb 29

      const nonLeapYearStart = new Date('2023-02-28');
      const nonLeapYearEnd = new Date('2023-03-01'); // No Feb 29

      // Both should calculate but with different denominators
      const leapResult = MoneyMath.calculateInterestWithLeapYear(
        '1000.00',
        '0.05',
        leapYearStart,
        leapYearEnd,
      );
      const nonLeapResult = MoneyMath.calculateInterestWithLeapYear(
        '1000.00',
        '0.05',
        nonLeapYearStart,
        nonLeapYearEnd,
      );

      // Results should differ because of different day counts
      expect(leapResult).not.toBe(nonLeapResult);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle wallet transactions accurately', () => {
      let balance = '1000.00';

      // Credit $250.50
      balance = MoneyMath.add(balance, '250.50');
      expect(balance).toBe('1250.50');

      // Debit $100.25
      balance = MoneyMath.subtract(balance, '100.25');
      expect(balance).toBe('1150.25');

      // Credit $0.01
      balance = MoneyMath.add(balance, '0.01');
      expect(balance).toBe('1150.26');
    });

    it('should prevent floating-point accumulation errors', () => {
      let balance = '0.00';

      // Add $0.10 one hundred times
      for (let i = 0; i < 100; i++) {
        balance = MoneyMath.add(balance, '0.10');
      }

      // Should be exactly $10.00
      expect(balance).toBe('10.00');
    });
  });
});
