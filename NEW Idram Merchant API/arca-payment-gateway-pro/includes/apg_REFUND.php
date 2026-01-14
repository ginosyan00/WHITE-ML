<?php
if ( ! defined( 'ABSPATH' ) ) exit;

include_once 'apg-function.php';

class apgREFUND
{
    private $apg_vpos_accuonts;

    public function __construct()
    {
        global $arca_config;
        $this->apg_vpos_accuonts    = json_decode( $arca_config->vpos_accuonts, true );
    }

    public function refundPayment($orderId)
    {
        global $wpdb;

        // get bank id
        $bank_id = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT bankId FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                $orderId
            )
        );
        if ( !$bank_id ) return 'Failed, Bank ID not found';

        // switch API
        switch ($bank_id) {
            case "4":
                // InecoBank API
                return $this->refundPayment_InecoBank($orderId);
                break;
            case "10":
                // AmeriaBank API
                return $this->refundPayment_AmeriaBank($orderId);
                break;
            case "12":
                // iDram API
                return $this->refundPayment_iDram($orderId);
                break;
            default:
                // ArCa API
                return $this->refundPayment_ArCa($orderId);
                break;
        }

    }

    public function cancelPayment($orderId)
    {
        global $wpdb;

        // get bank id
        $bank_id = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT bankId FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                $orderId
            )
        );
        if ( !$bank_id ) return 'Failed, Bank ID not found';

        // switch API
        switch ($bank_id) {
            case "4":
                // InecoBank API
                return 'No action found for this operation.';
                break;
            case "10":
                // AmeriaBank API
                return $this->cancelPayment_AmeriaBank($orderId);
                break;
            default:
                // ArCa API
                return $this->cancelPayment_ArCa($orderId);
                break;
        }

    }

    private function refundPayment_InecoBank($orderId)
    {
        global $wpdb;

        $orderId = sanitize_text_field( $orderId ?? null );

        $table_name = $wpdb->prefix . 'arca_pg_orders';
        $result = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM " . $wpdb->prefix . "arca_pg_orders WHERE orderId = %s",
            $orderId
        ));

        // REST - order refound request
        $requestUrl = 'https://pg.inecoecom.am/payment/rest/refund.do';

        $args = array(
            'headers'   => array('Content-Type: text/html; charset=UTF-8'),
            'body'      => array(
                'userName'  => $this->apg_vpos_accuonts[$result->currency]["api_userName"],
                'password'  => $this->apg_vpos_accuonts[$result->currency]["api_password"],
                'orderId'   => $result->orderId,
                'amount'    => $result->amount,
                'currency'  => $result->currency,
                'language'  => 'en',
            ),
            'method'      => 'POST',
            'data_format' => 'body',
        );
        $response = wp_remote_post( $requestUrl, $args );

        if( is_object($response) ){
            $this->arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $wc_orderId, $gwp_donationId);
        } else {
            $response = json_decode($response['body']);
        }

        // check REST response to JSON format
        if (is_object($response) && isset($response->errorCode)) {

            if ($response->errorCode == 0) {

                // get previous stored response data
                $OrderStatusExtended = json_decode(
                    $wpdb->get_var(
                        $wpdb->prepare(
                            "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                            $orderId
                        )
                    ),
                    true
                );

                // add new response
                $OrderStatusExtended = array_merge($OrderStatusExtended, array( "Refund Response" => $response ) );

                // json encode
                $OrderStatusExtended = json_encode( $OrderStatusExtended );

                // update order response data
                $wpdb->query(
                    $wpdb->prepare(
                        "UPDATE " . $wpdb->prefix . "arca_pg_orders SET OrderStatusExtended = %s, paymentState = 'Refunded' WHERE orderId = %s",
                        $OrderStatusExtended,
                        $orderId
                    )
                );


                // set wc order status
                if ( $result->wc_orderId ) {
                    $apg_wc_order = wc_get_order($result->wc_orderId);
                    $apg_wc_order->set_status('wc-refunded', 'wc_apg_gatewey');
                    $apg_wc_order->save();
                }

                return "Refunded";

            } else {
                $this->arca_pg_errorCatch("Refund - REST respons error: " . sanitize_text_field($response->errorCode));
                return "Failed";
            }

        } else {
            $this->arca_pg_errorCatch("Refund - REST response is not JSON data, response: " . sanitize_text_field($response));
            return "Failed";
        }
    }

    private function refundPayment_AmeriaBank($orderId)
    {
        global $wpdb;

        // You cannot add calls like "sanitize_text_field($orderId ?? null)" directly to the SQL query.
        $orderId = sanitize_text_field( $orderId ?? null );

        $table_name = $wpdb->prefix . 'arca_pg_orders';
        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                $orderId
            )
        );

        // AmeriaBank - refund payment request
        $requestUrl = "https://services". APG_IF_TEST_MODE .".ameriabank.am/VPOS/api/VPOS/RefundPayment";
        $args = array(
            'headers'	=> array('Content-Type: text/html; charset=UTF-8'),
            'body'		=> array(
                'paymentID'		=> $orderId,
                'Username'		=> $this->apg_vpos_accuonts[$result->currency]["api_userName"],
                'Password'		=> $this->apg_vpos_accuonts[$result->currency]["api_password"],
                'amount'		=> $result->amount,
            ),
            'method'		=> 'POST',
            'data_format'	=> 'body',
        );
        $response = wp_remote_post( $requestUrl, $args );

        if( is_object($response) ){
            $this->arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $wc_orderId, $gwp_donationId);
        } else {
            $response = json_decode($response['body']);
        }

        // check REST response to JSON format
        if (is_object($response) && isset($response->ResponseCode)) {

            if ($response->ResponseCode == '00') {

                // get previous stored response data
                $OrderStatusExtended = json_decode(
                    $wpdb->get_var(
                        $wpdb->prepare(
                            "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                            $orderId
                        )
                    ),
                    true
                );


                // add new response
                $OrderStatusExtended = array_merge($OrderStatusExtended, array( "Refund Response" => $response ) );

                // json encode
                $OrderStatusExtended = json_encode( $OrderStatusExtended );

                // update order response data
                $wpdb->query(
                    $wpdb->prepare(
                        "UPDATE {$wpdb->prefix}arca_pg_orders SET OrderStatusExtended = %s, paymentState = 'Refunded' WHERE orderId = %s",
                        $OrderStatusExtended,
                        $orderId
                    )
                );


                // set wc order status
                if ( $result->wc_orderId ) {
                    $apg_wc_order = wc_get_order($result->wc_orderId);
                    $apg_wc_order->set_status('wc-refunded', 'wc_apg_gatewey');
                    $apg_wc_order->save();
                }

                return "Refunded";

            } else {
                $this->arca_pg_errorCatch("Refund - REST respons error: " . sanitize_text_field($response->ResponseCode));
                return "Failed";
            }

        } else {
            $this->arca_pg_errorCatch("Refund - REST response is not JSON data, response: " . sanitize_text_field($response));
            return "Failed";
        }

    }

    private function cancelPayment_AmeriaBank($orderId)
    {
        global $wpdb;

        $orderId = sanitize_text_field( $orderId ?? null );

        $table_name = $wpdb->prefix . 'arca_pg_orders';
        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM $table_name WHERE orderId = %s",
                $orderId
            )
        );

        // AmeriaBank - refund payment request
        $requestUrl = "https://services". APG_IF_TEST_MODE .".ameriabank.am/VPOS/api/VPOS/CancelPayment";
        $args = array(
            'headers'	=> array('Content-Type: text/html; charset=UTF-8'),
            'body'		=> array(
                'paymentID'		=> $orderId,
                'Username'		=> $this->apg_vpos_accuonts[$result->currency]["api_userName"],
                'Password'		=> $this->apg_vpos_accuonts[$result->currency]["api_password"],
                'amount'		=> $result->amount,
            ),
            'method'		=> 'POST',
            'data_format'	=> 'body',
        );
        $response = wp_remote_post( $requestUrl, $args );

        if( is_object($response) ){
            $this->arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $result->wc_orderId, $result->gwp_donationId);
        } else {
            $response = json_decode($response['body']);
        }

        // check REST response to JSON format
        if (is_object($response) && isset($response->ResponseCode)) {

            if ($response->ResponseCode == '00') {

                // get previous stored response data
                $OrderStatusExtended = json_decode(
                    $wpdb->get_var(
                        $wpdb->prepare(
                            "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                            $orderId
                        )
                    ),
                    true
                );

                // add new response
                $OrderStatusExtended = array_merge($OrderStatusExtended, array( "Cancelation Response" => $response ) );

                // json encode
                $OrderStatusExtended = json_encode( $OrderStatusExtended );

                // update order response data
                $wpdb->query(
                    $wpdb->prepare(
                        "UPDATE " . $wpdb->prefix . "arca_pg_orders SET OrderStatusExtended = %s, paymentState = 'Canceled' WHERE orderId = %s",
                        $OrderStatusExtended,
                        $orderId
                    )
                );

                // set wc order status
                if ( $result->wc_orderId ) {
                    $apg_wc_order = wc_get_order($result->wc_orderId);
                    $apg_wc_order->set_status('wc-cancelled', 'wc_apg_gatewey');
                    $apg_wc_order->save();
                }

                return "Canceled";

            } else {
                $this->arca_pg_errorCatch("Refund - REST respons error: " . sanitize_text_field($response->ResponseCode));
                return "Failed";
            }

        } else {
            $this->arca_pg_errorCatch("Refund - REST response is not JSON data, response: " . sanitize_text_field($response));
            return "Failed";
        }

    }

    private function refundPayment_ArCa($orderId)
    {
        global $wpdb;

        $orderId = sanitize_text_field( $orderId ?? null );

        $table_name = $wpdb->prefix . 'arca_pg_orders';
        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                $orderId
            )
        );

        // REST - order refound request
        $requestUrl =  "https://ipay". APG_URL_IF_TEST_MODE .".arca.am:". APG_PORT_IF_TEST_MODE ."/payment/rest/refund.do";
        $args = array(
            'headers'   => array('Content-Type: text/html; charset=UTF-8'),
            'body'      => array(
                'userName'  => $this->apg_vpos_accuonts[$result->currency]["api_userName"],
                'password'  => $this->apg_vpos_accuonts[$result->currency]["api_password"],
                'orderId'   => $result->orderId,
                'amount'    => $result->amount * 100,
                'currency'  => $result->currency,
                'language'  => 'en',
            ),
            'method'      => 'POST',
            'data_format' => 'body',
        );
        $response = wp_remote_post( $requestUrl, $args );

        if( is_object($response) ){
            $this->arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $result->wc_orderId, $result->gwp_donationId);
        } else {
            $response = json_decode($response['body']);
        }

        // check REST response to JSON format
        if (is_object($response) && isset($response->errorCode)) {

            if ($response->errorCode == 0) {

                // get previous stored response data
                $OrderStatusExtended = json_decode(
                    $wpdb->get_var(
                        $wpdb->prepare(
                            "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                            $orderId
                        )
                    ),
                    true
                );

                // add new response
                $OrderStatusExtended = array_merge($OrderStatusExtended, array( "Refund Response" => $response ) );

                // json encode
                $OrderStatusExtended = json_encode( $OrderStatusExtended );

                // update order response data
                $wpdb->query(
                    $wpdb->prepare(
                        "UPDATE {$wpdb->prefix}arca_pg_orders 
                        SET OrderStatusExtended = %s, paymentState = 'Refunded' 
                        WHERE orderId = %s",
                        $OrderStatusExtended,
                        $orderId
                    )
                );

                // set wc order status
                if ( $result->wc_orderId ) {
                    $apg_wc_order = wc_get_order($result->wc_orderId);
                    $apg_wc_order->set_status('wc-refunded', 'wc_apg_gatewey');
                    $apg_wc_order->save();
                }

                return "Refunded";

            } else {
                $this->arca_pg_errorCatch("Refund - REST respons error: " . sanitize_text_field($response->errorCode));
                return "Failed";
            }

        } else {
            $this->arca_pg_errorCatch("Refund - REST response is not JSON data, response: " . sanitize_text_field($response));
            return "Failed";
        }

    }

    private function cancelPayment_ArCa($orderId)
    {
        global $wpdb;

        $orderId = sanitize_text_field( $orderId ?? null );

        $table_name = $wpdb->prefix . 'arca_pg_orders';
        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table_name} WHERE orderId = %s",
                $orderId
            )
        );

        // REST - order refound request
        $requestUrl =  "https://ipay". APG_URL_IF_TEST_MODE .".arca.am:". APG_PORT_IF_TEST_MODE ."/payment/rest/reverse.do";
        $args = array(
            'headers'   => array('Content-Type: text/html; charset=UTF-8'),
            'body'      => array(
                'userName'  => $this->apg_vpos_accuonts[$result->currency]["api_userName"],
                'password'  => $this->apg_vpos_accuonts[$result->currency]["api_password"],
                'orderId'   => $result->orderId,
                'amount'    => $result->amount  * 100,
                'currency'  => $result->currency,
                'language'  => 'en',
            ),
            'method'      => 'POST',
            'data_format' => 'body',
        );
        $response = wp_remote_post( $requestUrl, $args );


        if( is_object($response) ){
            $this->arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $result->wc_orderId, $result->gwp_donationId);
        } else {
            $response = json_decode($response['body']);
        }

        // check REST response to JSON format
        if (is_object($response) && isset($response->errorCode)) {

            if ($response->errorCode == 0) {

                // get previous stored response data
                $OrderStatusExtended = json_decode(
                    $wpdb->get_var(
                        $wpdb->prepare(
                            "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                            $orderId
                        )
                    ),
                    true
                );

                // add new response
                $OrderStatusExtended = array_merge($OrderStatusExtended, array( "Cancelation Response" => $response ) );

                // json encode
                $OrderStatusExtended = json_encode( $OrderStatusExtended );

                // update order response data
                $wpdb->query(
                    $wpdb->prepare(
                        "UPDATE {$wpdb->prefix}arca_pg_orders SET OrderStatusExtended = %s, paymentState = 'Canceled' WHERE orderId = %s",
                        $OrderStatusExtended,
                        $orderId
                    )
                );

                // set wc order status
                if ( $result->wc_orderId ) {
                    $apg_wc_order = wc_get_order($result->wc_orderId);
                    $apg_wc_order->set_status('wc-refunded', 'wc_apg_gatewey');
                    $apg_wc_order->save();
                }

                return "Canceled";

            } else {
                $this->arca_pg_errorCatch("Refund - REST respons error: " . sanitize_text_field($response->errorCode));
                return "Failed";
            }

        } else {
            $this->arca_pg_errorCatch("Refund - REST response is not JSON data, response: " . sanitize_text_field($response));
            return "Failed";
        }

    }

    private function refundPayment_iDram($orderId)
    {
        return "The refund method for Idram is unavailable.";
    }

    private function arca_pg_errorCatch($errMgs = "")
    {
        global $wpdb, $arca_config;

        if ($errMgs == ""){
            $errMgs = "unknown-error";
        }
        $errMgs = trim($errMgs);
        $errMgs = preg_replace('/,$/', '', $errMgs);
        $table  = $wpdb->prefix . 'arca_pg_errorlogs';
        $data   = array(
            'error'     => $errMgs,
            'rest_serverID' => $arca_config->rest_serverID,
        );
        $format = array(
            '%s',
            '%d'
        );
        $wpdb->insert($table, $data, $format);

    }

}