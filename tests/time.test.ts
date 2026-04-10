import assert from 'node:assert/strict';
import test from 'node:test';

import {
    formatCalendarDateInput,
    hourToShichen,
    isValidCalendarDate,
    parseCalendarDateInput,
} from '../src/utils/time';

test('hourToShichen maps 24-hour values into shichen buckets', () => {
    assert.equal(hourToShichen(23), 0);
    assert.equal(hourToShichen(0), 0);
    assert.equal(hourToShichen(1), 0);
    assert.equal(hourToShichen(12), 12);
    assert.equal(hourToShichen(17), 16);
});

test('isValidCalendarDate rejects impossible dates', () => {
    assert.equal(isValidCalendarDate(2024, 2, 29), true);
    assert.equal(isValidCalendarDate(2025, 2, 29), false);
    assert.equal(isValidCalendarDate(2026, 4, 31), false);
    assert.equal(isValidCalendarDate(2026, 4, 30), true);
});

test('calendar date helpers format and parse browser date input values', () => {
    assert.equal(
        formatCalendarDateInput({ year: 1990, month: 1, day: 9 }),
        '1990-01-09',
    );

    assert.deepEqual(parseCalendarDateInput('1990-01-09'), {
        year: 1990,
        month: 1,
        day: 9,
    });

    assert.equal(parseCalendarDateInput('1990-02-30'), null);
    assert.equal(parseCalendarDateInput('1990/01/09'), null);
});
