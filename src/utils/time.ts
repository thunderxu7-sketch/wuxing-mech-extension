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
