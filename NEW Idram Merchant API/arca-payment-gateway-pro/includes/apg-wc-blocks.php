<?php
if (!defined('ABSPATH')) exit;

// Manually include the Composer autoloader
if (file_exists(WP_PLUGIN_DIR . '/woocommerce/vendor/autoload.php')) {
    require_once WP_PLUGIN_DIR . '/woocommerce/vendor/autoload.php';
}

// Class for integration with WooCommerce Blocks
final class wc_apg_gatewey_Blocks_Support extends Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType {

    protected $name;

    private $gatewey_name, $gatewey_title, $gatewey_description, $logo_url;

    public function __construct($gatewey_name, $gatewey_title, $gatewey_description, $logo_url)
    {
        $this->name = $gatewey_name;
        $this->gatewey_name = $gatewey_name;
        $this->gatewey_title = $gatewey_title;
        $this->gatewey_description = $gatewey_description;
        $this->logo_url = $logo_url;
    }
    public function initialize() {
        $this->settings = get_option("woocommerce_{$this->gatewey_name}_settings", ['aaaa']);
    }

    public function is_active() {
        $payment_gateways = WC()->payment_gateways()->payment_gateways();
        return isset($payment_gateways[$this->gatewey_name]) && $payment_gateways[$this->gatewey_name]->is_available();
    }

    public function get_payment_method_script_handles() {
        $dependencies = [
            'wc-blocks-registry',
            'wc-settings',
            'wp-element',
            'wp-html-entities',
            'wp-i18n'
        ];

        wp_register_script(
            "wc-apg-gatewey-blocks-integration_{$this->gatewey_name}",
            ARCAPG_URL . '/script/wc-blocks-support.js',
            $dependencies,
            ARCAPG_VERSION,
            true
        );

        // Pass the settings to wcSettings
        wp_localize_script("wc-apg-gatewey-blocks-integration_{$this->gatewey_name}", 'wc_apg_gatewey_data', [
            'name'          => $this->gatewey_name,
            'title'         => $this->settings['title'] ?? '',
            'description'   => $this->settings['description'] ?? '',
            'logo_url'      => $this->logo_url,
            'supports'      => $this->get_supported_features(),
        ]);

        wp_set_script_translations(
            "wc-apg-gatewey-blocks-integration_{$this->gatewey_name}",
            $this->gatewey_name
        );

        return [ "wc-apg-gatewey-blocks-integration_{$this->gatewey_name}" ];
    }

    public function get_payment_method_data() {
        return [
            'name'          => $this->gatewey_name,
            'title'         => $this->settings['title'] ?? '',
            'description'   => $this->settings['description'] ?? '',
            'logo_url'      => $this->logo_url,
            'supports'      => $this->get_supported_features(),
        ];
    }

    public function get_supported_features() {
        $payment_gateways = WC()->payment_gateways()->payment_gateways();
        return isset($payment_gateways[$this->gatewey_name]) ? $payment_gateways[$this->gatewey_name]->supports : [];
    }
}