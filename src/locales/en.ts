import type { LocaleMessages } from './types';

export const en: LocaleMessages = {
    app: {
        title: 'WuXing Calibrate',
        loading: 'Loading...',
        disclaimer: 'For entertainment purposes only.',
    },
    welcome: {
        desc: 'Enter your birth time to receive your daily talisman',
    },
    form: {
        year: 'Year',
        month: 'Month',
        day: 'Day',
        shichenLabel: 'Birth Hour',
        submit: 'Get My Talisman',
        calculating: 'Calibrating...',
        validationError: 'Please enter your complete birth time.',
        shichenOptions: [
            { label: 'Rat (23:00-01:00)', value: 0 },
            { label: 'Ox (01:00-03:00)', value: 2 },
            { label: 'Tiger (03:00-05:00)', value: 4 },
            { label: 'Rabbit (05:00-07:00)', value: 6 },
            { label: 'Dragon (07:00-09:00)', value: 8 },
            { label: 'Snake (09:00-11:00)', value: 10 },
            { label: 'Horse (11:00-13:00)', value: 12 },
            { label: 'Goat (13:00-15:00)', value: 14 },
            { label: 'Monkey (15:00-17:00)', value: 16 },
            { label: 'Rooster (17:00-19:00)', value: 18 },
            { label: 'Dog (19:00-21:00)', value: 20 },
            { label: 'Pig (21:00-23:00)', value: 22 },
        ],
    },
    ceremony: {
        text: 'Calibrating your five elements...',
        elements: ['Metal', 'Wood', 'Water', 'Fire', 'Earth'],
    },
    elements: {
        gold: 'Metal',
        wood: 'Wood',
        water: 'Water',
        fire: 'Fire',
        earth: 'Earth',
    },
    talisman: {
        guidanceLabel: 'Spiritual Guidance',
        detailExpand: 'View Detailed Analysis ▼',
        detailCollapse: 'Collapse Analysis ▲',
        signatureTitle: 'Birth Element Signature',
        signatureDesc: 'Your baseline five-element energy from birth time',
        energyTitle: 'Today\'s Energy Distribution',
        scoreLabel: 'Balance Score',
        strongestLabel: 'Strongest Element',
        scoreUnit: 'pts',
    },
    products: {
        title: 'Recommended Items',
        refresh: 'Refresh',
    },
    share: {
        saveBtn: 'Save Talisman Card',
        brandLine: 'WuXing Calibrate · Daily Talisman',
    },
    recalibrate: 'Recalibrate Birth Elements',
};
