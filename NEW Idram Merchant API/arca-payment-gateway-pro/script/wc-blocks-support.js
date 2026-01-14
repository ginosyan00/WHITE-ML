(function () {
    "use strict";
    const { createElement } = window.wp.element;
    const { decodeEntities } = window.wp.htmlEntities;
    const { __ } = window.wp.i18n;
    const { registerPaymentMethod } = window.wc.wcBlocksRegistry;

    const paymentData = window.wc_apg_gatewey_data;
    if (!paymentData) {
        throw new Error("ArCa Payment Gateway initialization data is not available");
    }

    const description = () => decodeEntities(paymentData.description || "");

    registerPaymentMethod({
        name: paymentData.name,
        label: createElement('img', { src: paymentData.logo_url, alt: paymentData.title }),
        ariaLabel: paymentData.description,
        canMakePayment: () => true,
        content: createElement(description, null),
        edit: createElement(description, null),
        supports: paymentData.supports || []
    });
})();
