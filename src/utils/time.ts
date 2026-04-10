export interface CalendarDateParts {
    year: number;
    month: number;
    day: number;
}

export function hourToShichen(hour: number): number {
    if (hour === 23) {
        return 0;
    }

    return Math.floor(hour / 2) * 2;
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

export function formatCalendarDateInput({ year, month, day }: CalendarDateParts): string {
    return [
        year.toString().padStart(4, '0'),
        month.toString().padStart(2, '0'),
        day.toString().padStart(2, '0'),
    ].join('-');
}

export function parseCalendarDateInput(value: string): CalendarDateParts | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        return null;
    }

    const [, yearString, monthString, dayString] = match;
    const year = Number.parseInt(yearString, 10);
    const month = Number.parseInt(monthString, 10);
    const day = Number.parseInt(dayString, 10);

    if (!isValidCalendarDate(year, month, day)) {
        return null;
    }

    return { year, month, day };
}
