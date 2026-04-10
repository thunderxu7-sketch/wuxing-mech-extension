export type Locale = 'zh' | 'en';

export interface LocaleMessages {
    app: {
        title: string;
        loading: string;
        disclaimer: string;
    };
    welcome: {
        desc: string;
    };
    form: {
        dateLabel: string;
        year: string;
        month: string;
        day: string;
        shichenLabel: string;
        submit: string;
        calculating: string;
        validationError: string;
        invalidDateError: string;
        shichenOptions: Array<{ label: string; value: number }>;
    };
    ceremony: {
        text: string;
        elements: string[];
    };
    elements: Record<string, string>;
    talisman: {
        guidanceLabel: string;
        detailExpand: string;
        detailCollapse: string;
        signatureTitle: string;
        signatureDesc: string;
        energyTitle: string;
        scoreLabel: string;
        strongestLabel: string;
        scoreUnit: string;
    };
    products: {
        title: string;
        refresh: string;
    };
    share: {
        saveBtn: string;
        copyBtn: string;
        copySuccess: string;
        copyError: string;
        linkLabel: string;
        brandLine: string;
    };
    launch: {
        analyticsPermissionTitle: string;
        analyticsPermissionDesc: string;
        analyticsPermissionBtn: string;
        analyticsPermissionGranted: string;
        settingsSummary: string;
        settingsTitle: string;
        settingsDesc: string;
        enabledLabel: string;
        siteLabel: string;
        endpointLabel: string;
        originLabel: string;
        permissionLabel: string;
        queueLabel: string;
        queueEmpty: string;
        statusNotConfigured: string;
        permissionMissing: string;
        saveBtn: string;
        verifyBtn: string;
        retryQueueBtn: string;
        saveSuccess: string;
        invalidEndpointError: string;
        verifySuccess: string;
        verifyDisabledError: string;
        verifyEndpointError: string;
        verifyPermissionError: string;
        verifyNetworkError: string;
        retrySuccess: string;
        retryPartial: string;
    };
    recalibrate: string;
}
