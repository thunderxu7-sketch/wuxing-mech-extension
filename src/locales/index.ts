import React, { createContext, useContext } from 'react';
import type { Locale, LocaleMessages } from './types';
import { zh } from './zh';
import { en } from './en';

export type { Locale, LocaleMessages };

const messages: Record<Locale, LocaleMessages> = { zh, en };

export function getMessages(locale: Locale): LocaleMessages {
    return messages[locale];
}

interface LocaleContextValue {
    locale: Locale;
    m: LocaleMessages;
    setLocale: (l: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
    locale: 'zh',
    m: zh,
    setLocale: () => {},
});

export const useLocale = () => useContext(LocaleContext);

export { React };
