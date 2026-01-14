<?php
include_once 'apg-function.php';

class apg_BINDING
{
    private $apg_vpos_accuonts;

    public function __construct()
    {
        // get config
        global $arca_config;
        $this->apg_vpos_accuonts    = json_decode( $arca_config->vpos_accuonts, true );

    }

    public function MakeBindingPayment($amount, $order)
    {
        global $wpdb, $arca_config;

        $orderDetails   = json_encode(['MakeBindingPayment'], JSON_UNESCAPED_UNICODE);
        $wc_orderId     = $order->get_id();
        $wc_currency    = $order->get_currency();

        $currency = $wpdb->get_var($wpdb->prepare(
            "SELECT code FROM {$wpdb->prefix}arca_pg_currency 
            WHERE (abbr = %s OR code = %s) AND active = 1",
            $wc_currency,
            $wc_currency
        ));

        $description    =	wp_parse_url( get_site_url() )['host'];


        // create order blank row in db
        $table = $wpdb->prefix . 'arca_pg_orders';
        $data = array(
            'productId'     => 0,
            'wc_orderId'    => $wc_orderId,
            'amount'        => $amount,
            'currency'      => $currency,
            'orderDetails'  => $orderDetails,
            'rest_serverID' => $arca_config->rest_serverID,
            'orderDate'     => current_time('mysql'),
            'bankId'        => $arca_config->bankId,
        );
        $format = array(
            '%d',
            '%d',
            //'%d',
            '%f',
            '%s',
            '%s',
            '%d',
            '%s',
            '%d',
        );
        $insert = $wpdb->insert($table, $data, $format);
        if ($insert){

            // get orderNumber from created row
            $orderNumber  = $wpdb->insert_id;

            // REST - order registration request
            $register_url =  "https://ipay". APG_URL_IF_TEST_MODE .".arca.am:". APG_PORT_IF_TEST_MODE ."/payment/rest/register.do";
            $args = array(
                'headers'     => array('Content-Type: text/html; charset=UTF-8'),
                'body'        => array(
                    'userName'    => str_replace("_api", "_binding", $this->apg_vpos_accuonts[$currency]["api_userName"]),
                    'password'    => $this->apg_vpos_accuonts[$currency]["api_password"],
                    'orderNumber' => ($arca_config->orderNumberPrefix != "") ? $arca_config->orderNumberPrefix . '-' . $orderNumber : $orderNumber,
                    'amount'      => $amount * 100,
                    'currency'    => $currency,
                    'returnUrl'   => "?",
                    'description' => $description,
                    'jsonParams'  => json_encode(array("FORCE_3DS2" => "true"), JSON_UNESCAPED_UNICODE),

                    // for subscription
                    'clientId'    => $order->get_user_id(),

                ),
                'method'      => 'POST',
                'data_format' => 'body',
            );
            $response = wp_remote_post( $register_url, $args );

            if( is_object($response) ){
                //arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $wc_orderId, $gwp_donationId);
            } else {
                $response = json_decode($response['body']);
            }

            // check REST response to JSON format
            if (is_object($response) && isset($response->errorCode)) {

                // combine log
                $OrderStatusExtended = json_encode(
                    array(
                        "register.do" => array_merge(
                            array("request" => $args['body']),
                            array("response" => $response)
                        )
                    )
                );

                if ($response->errorCode == 0) {

                    $orderId = $response->orderId;

                    // update order row from REST response
                    $wpdb->query(
                        $wpdb->prepare(
                            "UPDATE " . $wpdb->prefix . "arca_pg_orders 
                                SET OrderStatusExtended = %s, errorCode = %s, paymentState = %s, orderId = %s 
                                WHERE orderNumber = %d",
                            $OrderStatusExtended,
                            '0', // ErrorCode
                            'Registered', // PaymentState
                            $orderId,
                            $orderNumber
                        )
                    );


                    // REST - order paymentOrderBinding request
                    $register_url =  "https://ipay". APG_URL_IF_TEST_MODE .".arca.am:". APG_PORT_IF_TEST_MODE ."/payment/rest/paymentOrderBinding.do";
                    $args = array(
                        'headers'     => array('Content-Type: text/html; charset=UTF-8'),
                        'body'        => array(
                            'userName'  => str_replace("_api", "_binding", $this->apg_vpos_accuonts[$currency]["api_userName"]),
                            'password'  => $this->apg_vpos_accuonts[$currency]["api_password"],
                            'mdOrder'   => $orderId,

                            // POXELA PETQ USERI BINDINGID I HET
                            'bindingId'     => $this->getBindingID( $wc_orderId ),

                        ),
                        'method'      => 'POST',
                        'data_format' => 'body',
                    );
                    $response = wp_remote_post( $register_url, $args );

                    if( is_object($response) ){
                        //arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $wc_orderId, $gwp_donationId);
                    } else {
                        $response = $response['body'];
                    }

                    // Декодируем JSON в массив
                    $response = json_decode($response, true);


                    // get previous stored requests
                    $OrderStatusExtended = json_decode(
                        $wpdb->get_var(
                            $wpdb->prepare(
                                "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                                $orderId
                            )
                        ),
                        true
                    );

                    // combine log
                    $OrderStatusExtended_new =
                        array(
                            "paymentOrderBinding.do" => array_merge(
                                array("request" => $args['body']),
                                array("response" => $response)
                            )
                        );

                    // add new request
                    $OrderStatusExtended = array_merge($OrderStatusExtended, $OrderStatusExtended_new );

                    $OrderStatusExtended = json_encode( $OrderStatusExtended );

                    $paymentState = 'paymentOrderBinding';

                    // update order payment REST response data
                    $wpdb->query($wpdb->prepare(
                        "UPDATE " . $wpdb->prefix . "arca_pg_orders 
                                SET OrderStatusExtended = %s, paymentState = %s 
                                WHERE orderId = %s",
                        $OrderStatusExtended,
                        $paymentState,
                        $orderId
                    ));


                    // getOrderStatusExtended request
                    $orderStatus_url =  "https://ipay". APG_URL_IF_TEST_MODE .".arca.am:". APG_PORT_IF_TEST_MODE ."/payment/rest/getOrderStatusExtended.do";
                    $args = array(
                        'headers'     => array('Content-Type: text/html; charset=UTF-8'),
                        'body'        => array(
                            'userName'  => str_replace("_api", "_binding", $this->apg_vpos_accuonts[$currency]["api_userName"]),
                            'password'  => $this->apg_vpos_accuonts[$currency]["api_password"],
                            'orderId'     => $orderId,
                        ),
                        'method'      => 'POST',
                        'data_format' => 'body',
                    );
                    $response = wp_remote_post( $orderStatus_url, $args );

                    if( is_object($response) ){
                        //arca_pg_errorCatch("REST respons error: " . json_encode($response, JSON_UNESCAPED_UNICODE), $wc_orderId, $gwp_donationId);
                    } else {
                        $response = $response['body'];
                    }

                    // get order payment state from REST response
                    $paymentState = (isset(json_decode($response)->paymentAmountInfo->paymentState)) ? json_decode($response)->paymentAmountInfo->paymentState : "state-not-found";

                    if ( $paymentState == 'DEPOSITED' ) {

                        // get wc order
                        $apg_wc_order = wc_get_order($wc_orderId);

                        // get ws order status processing or failed
                        $apg_wc_orderStatus = ( $paymentState == 'DEPOSITED' ) ? $arca_config->wc_order_status : 'failed';

                        // Декодируем JSON в массив
                        $response = json_decode($response, true);


                        // get previous stored requests
                        $OrderStatusExtended = json_decode(
                            $wpdb->get_var(
                                $wpdb->prepare(
                                    "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE orderId = %s",
                                    $orderId
                                )
                            ),
                            true
                        );

                        // combine log
                        $OrderStatusExtended_new =
                            array(
                                "getOrderStatusExtended.do" => array_merge(
                                    array("request" => $args['body']),
                                    array("response" => $response)
                                )
                            );

                        // add new request
                        $OrderStatusExtended = array_merge($OrderStatusExtended, $OrderStatusExtended_new );

                        $OrderStatusExtended = json_encode( $OrderStatusExtended );

                        // update order payment REST response data
                        $wpdb->query($wpdb->prepare(
                            "UPDATE " . $wpdb->prefix . "arca_pg_orders 
                                SET OrderStatusExtended = %s, paymentState = %s 
                                WHERE orderId = %s",
                            $OrderStatusExtended,
                            $paymentState,
                            $orderId
                        ));


                        // set wc order status
                        $apg_wc_order->set_status($apg_wc_orderStatus, 'wc_apg_gatewey');
                        $apg_wc_order->save();


                        // set email sent if email exist in wc order
                        $wpdb->query($wpdb->prepare(
                            "UPDATE " . $wpdb->prefix . "arca_pg_orders 
                            SET mailSent = %d 
                            WHERE orderId = %s",
                            1,
                            $orderId
                        ));


                        // eHDM print for woocommerce orders
                        if( $paymentState == 'DEPOSITED' && has_action('eHDM-print') ) {

                            $wc_order_total = $apg_wc_order->get_total();

                            $cardAmount = $wc_order_total;  // Անկանխիկ վճարված գումար (double)
                            $cashAmount = 0;                // Առձեռն /կանխիկ/ վճարված գումար (double)
                            $partialAmount = 0;             // Մասնակի վճարման գումար (double)
                            $prePaymentAmount = 0;          // Կանխավճարի օգտագործման գումար (double)
                            $cashierId = 1;                 // Գանձապահի համարը (int)
                            $mode = 2;                      // Կտրոնի տպման ռեժիմ: 2 – Ապրանքներ ռեժիմ 3 – Կանխավճար (int)
                            $partnerTin = null;             // Գնորդի ՀՎՀՀ (string)

                            $items = apply_filters('eHDM-getWoocommersOrderItems', $wc_orderId); // Ապրանքների ցանկ (array)

                            do_action('eHDM-print',
                                [
                                    'orderId' => $orderId,
                                    'wc_orderId' => $wc_orderId,
                                    'cardAmount' => $cardAmount,
                                    'cashAmount' => $cashAmount,
                                    'partialAmount' => $partialAmount,
                                    'prePaymentAmount' => $prePaymentAmount,
                                    'cashierId' => $cashierId,
                                    'mode' => $mode,
                                    'partnerTin' => $partnerTin,
                                    'items' => $items,
                                ]
                            );
                        }
                        // end eHDM print

                        return true;

                    } else {

                        //arca_pg_errorCatch("REST respons error, errorCode: " . sanitize_text_field($response->errorCode), $wc_orderId, $gwp_donationId);
                        return false;

                    }

                } else {

                    // update error number from REST system
                    $wpdb->query(
                        $wpdb->prepare(
                            "UPDATE " . $wpdb->prefix . "arca_pg_orders 
                            SET OrderStatusExtended = %s, errorCode = %s, paymentState = %s 
                            WHERE orderNumber = %d",
                            $OrderStatusExtended,
                            $response->errorCode,
                            'Registration failed', // PaymentState
                            $orderNumber
                        )
                    );

                    //arca_pg_errorCatch("REST respons error, errorCode: " . sanitize_text_field($response->errorCode), $wc_orderId, $gwp_donationId);
                    return false;
                }

            } else {
                // REST response is not JSON data
                //arca_pg_errorCatch("REST response is not JSON data, response: " . sanitize_text_field($response), $wc_orderId, $gwp_donationId);
                return false;
            }

        } else {
            //arca_pg_errorCatch("Error on insert new order row, wpdb error: " . $wpdb->error, $wc_orderId, $gwp_donationId);
            return false;
        }


    }


    private function getBindingID($renewal_order_id )
    {
        global $wpdb;

        $parent_order_id = $this->get_parent_order_id_by_subscription_order($renewal_order_id);

        // Получаем JSON из таблицы по wc_orderId
        $json_string = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT OrderStatusExtended FROM {$wpdb->prefix}arca_pg_orders WHERE wc_orderId = %d",
                $parent_order_id
            )
        );

        $binding_id = null;

        if ($json_string) {
            $data = json_decode($json_string, true);
            // Поддержка обоих вариантов — старого и нового ключа
            if (isset($data['getOrderStatusExtended.do']['response']['bindingInfo']['bindingId'])) {
                $binding_id = $data['getOrderStatusExtended.do']['response']['bindingInfo']['bindingId'];
            } elseif (isset($data['Response 2']['bindingInfo']['bindingId'])) {
                $binding_id = $data['Response 2']['bindingInfo']['bindingId'];
            }
        }

        // Выводим результат
        if ($binding_id) {
            return esc_html($binding_id);
        } else {
            return null;
        }

    }

    private function get_parent_order_id_by_subscription_order($order_id) {
        // Получаем подписки, связанные с этим заказом
        $subscriptions = wcs_get_subscriptions_for_order($order_id, array('order_type' => 'renewal'));

        if (!empty($subscriptions)) {
            // Берем первую подписку (обычно одна)
            $subscription = array_shift($subscriptions);

            // Получаем родительский заказ подписки
            $parent_order = $subscription->get_parent();

            if ($parent_order) {
                return $parent_order->get_id(); // ← Возвращает ID родительского заказа
            }
        }

        return null; // Родительский заказ не найден
    }


}