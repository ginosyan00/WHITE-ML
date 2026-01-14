<?php
if ( ! defined( 'ABSPATH' ) ) exit;

add_action('admin_menu', 'arca_pg_add_plugin_admin_menu');
function arca_pg_add_plugin_admin_menu(){

   global $wpdb;
   // get notifications
    $notification = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT 
            c.rest_serverID AS sid, 
            c.adminLastVisitDate AS alvdate,
            (
                SELECT COUNT(orderNumber) 
                FROM {$wpdb->prefix}arca_pg_orders o 
                WHERE o.orderDate > c.adminLastVisitDate AND o.rest_serverID = c.rest_serverID
            ) AS nCount,
            (
                SELECT COUNT(id) 
                FROM {$wpdb->prefix}arca_pg_errorlogs e 
                WHERE e.dateTime > c.adminLastVisitDate AND e.rest_serverID = c.rest_serverID
            ) AS eCount
        FROM {$wpdb->prefix}arca_pg_config c 
        WHERE c.active = %d",
            1
        )
    );

   add_menu_page("ArCa Gateway", ($notification->nCount + $notification->eCount > 0) ? sprintf('ArCa Gateway <span class="awaiting-mod apg-notification">%d</span>', $notification->nCount) : "ArCa Gateway", "manage_options", "dashboard", "arca_pg_display_page_dashboard", ARCAPG_URL.'/images/icon.png');
   add_submenu_page("dashboard", __("Dashboard", 'arca-payment-gateway' ) , __("Dashboard", 'arca-payment-gateway' ) , "manage_options", "dashboard", "arca_pg_display_page_dashboard", 1);
   add_submenu_page("dashboard", __("Orders", 'arca-payment-gateway' ) , __("Orders", 'arca-payment-gateway' ) , "manage_options", "orderlog", "arca_pg_display_page_orders", 2);
   add_submenu_page("dashboard", __("Error logs", 'arca-payment-gateway' ) , __("Error logs", 'arca-payment-gateway' ) , "manage_options", "errorlogs", "arca_pg_display_page_errorLogs", 3);
   add_submenu_page("dashboard", __("Price list", 'arca-payment-gateway' ) , __("Price list", 'arca-payment-gateway' ) , "manage_options", "pricelist", "arca_pg_display_page_priceList", 4);
   add_submenu_page("dashboard", __("Checkout form", 'arca-payment-gateway' ) , __("Checkout form", 'arca-payment-gateway' ) , "manage_options", "checkoutform", "arca_pg_display_page_checkoutForm", 5);
   add_submenu_page("dashboard", __("Currency", 'arca-payment-gateway' ) , __("Currency", 'arca-payment-gateway' ) , "manage_options", "currency", "arca_pg_display_page_currency", 6);
   add_submenu_page("dashboard", __("vPOS Settings", 'arca-payment-gateway' ) , __("vPOS Settings", 'arca-payment-gateway' ) , "manage_options", "config", "arca_pg_display_page_vpos_configuration", 7);
   add_submenu_page("dashboard", __("Idram Settings", 'arca-payment-gateway' ) , __("Idram Settings", 'arca-payment-gateway' ) , "manage_options", "idramconfig", "arca_pg_display_page_idram_configuration", 8);
   add_submenu_page("dashboard", __("Support", 'arca-payment-gateway' ) , __("Support", 'arca-payment-gateway' ) , "manage_options", "support", "arca_pg_display_page_support", 9);
   add_submenu_page("dashboard", __("How To Use", 'arca-payment-gateway' ) , __("How To Use", 'arca-payment-gateway' ) , "manage_options", "how_to_use", "arca_pg_display_page_HowToUse", 10);

}
function arca_pg_display_page_HowToUse(){
   require_once("apg-how-to-use.php");
}
function arca_pg_display_page_dashboard(){
   require_once("apg-dashboard.php");
}
function arca_pg_display_page_orders(){
   require_once("apg-orders.php");
}
function arca_pg_display_page_errorLogs(){
   require_once("apg-error-logs.php");
}
function arca_pg_display_page_priceList(){
   require_once("apg-price-list.php");
}
function arca_pg_display_page_checkoutForm(){
   require_once("apg-checkout-form.php");
}
function arca_pg_display_page_currency(){
   require_once("apg-currency.php");
}
function arca_pg_display_page_vpos_configuration(){
   require_once("apg-config.php");
}
function arca_pg_display_page_idram_configuration(){
   require_once("apg-idram-config.php");
}
function arca_pg_display_page_support(){
   require_once("apg-support.php");
}
