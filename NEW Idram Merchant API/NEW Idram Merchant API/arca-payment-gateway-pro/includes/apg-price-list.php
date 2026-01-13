<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// wp verify nonce
require_once ('apg-wp-verify-nonce.php');

global $wpdb, $arca_config;

$act = (isset($_GET["act"])) ? sanitize_text_field($_GET["act"]) : "";
$productId = (isset($_GET["productId"]) && is_numeric($_GET["productId"])) ? intval($_GET["productId"]) : 0;
$strMgs = $errMgs = "";

if ( $act == "delete" ) {

    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}arca_pg_pricelist WHERE productId = %d",
            $productId
        )
    );

    $strMgs = __( "Done!", 'arca-payment-gateway' );
}

if ( $_SERVER["REQUEST_METHOD"] == "POST" ) {

    // get productName
    if ( !empty($_POST["productName"]) ) {
        $productName = sanitize_text_field($_POST["productName"]);
    } else {
        $errMgs .= __( "incorrect productName", 'arca-payment-gateway' ) . "<br>";
    }

    // get productDescription
    if ( !empty($_POST["productDescription"]) ) {
        $productDescription = sanitize_text_field($_POST["productDescription"]);
    } else {

        if ( $arca_config->bankId == 10 ) {
            $errMgs .= __( "Incorrect description", 'arca-payment-gateway' ) . "<br>";
        } else {
            $productDescription = "";
        }

    }

    // validate productPrice
    if( !empty($_POST["productPrice"]) ) {
        $productPrice = sanitize_text_field(json_encode($_POST["productPrice"]));
    } else {
        $errMgs .= __( "incorrect productPrice", 'arca-payment-gateway' ) . "<br>";
    }

    $act = (isset($_POST["act"])) ? sanitize_text_field($_POST["act"]) : "";

    if ( $errMgs == "" && $act == "insert" ) {

        $data = array(
            'productName'  => $productName,
            'productDescription'	=>	$productDescription,
            'productPrice' => $productPrice,
        );

        $format = array('%s', '%s', '%s');
        //$insert = $wpdb->insert( $wpdb->prefix."arca_pg_pricelist", $data, $format );
        $insert = $wpdb->insert( "{$wpdb->prefix}arca_pg_pricelist", $data, $format );

        if ( $insert ) {
            $strMgs = __( "Done!", 'arca-payment-gateway' );
        } else {
            $strMgs = __( "sql Error:", 'arca-payment-gateway' ) . $wpdb->error . "<br>";
        }

    } elseif ( $errMgs == "" && $act == "save" ) {

        $productId = (isset($_POST["productId"]) && is_numeric($_POST["productId"])) ? intval($_POST["productId"]) : 0;
        $table = $wpdb->prefix."arca_pg_pricelist";

        $data = array(
            'productId'				=>	$productId,
            'productName'			=>	$productName,
            'productDescription'	=>	$productDescription,
            'productPrice'  		=>	$productPrice
        );

        $format = array('%d', '%s', '%s', '%s');
        $where = array('productId' => $productId);
        $where_format = array('%d');

        $wpdb->update( $table, $data, $where, $format, $where_format );

        $strMgs = __( "Done!", 'arca-payment-gateway' );

    }
}
$arca_pg_nonce = wp_create_nonce('arca_pg_ajax_nonce');
?>

<div class="wrap apg" id="apg-priceList">

    <h1 class="entry-title"><?php esc_html_e("Price list", 'arca-payment-gateway' ) ?></h1>

    <p>
        <?php
        if ( $errMgs != "" || $strMgs != "" ){
            echo wp_kses_post($errMgs), wp_kses_post($strMgs);
        }
        ?>
    </p>

    <div class="apg-main-container">

        <h2 class="entry-title"><?php esc_html_e("Add new product", 'arca-payment-gateway' ) ?></h2>

        <form method="post">
            <table>
                <tr>
                    <th><?php esc_html_e("Product name", 'arca-payment-gateway' ) ?> *</th>
                    <th><?php esc_html_e("Product description", 'arca-payment-gateway' ) ?> <?php echo ($arca_config->bankId == 10) ? "*": ""; ?></th>
                    <?php
                    // collect currencies title group
                    $currencies = $wpdb->get_results(
                        "SELECT abbr FROM {$wpdb->prefix}arca_pg_currency WHERE active = 1"
                    );

                    foreach ( $currencies as $currency ) {
                        ?>
                        <th title="<?php esc_html_e("Product price", 'arca-payment-gateway' ) ?>"><?php echo esc_html($currency->abbr) ?></th>
                        <?php
                    }
                    ?>
                    <th><?php esc_html_e("Actions", 'arca-payment-gateway' ) ?></th>
                </tr>
                <tr>
                    <td><input type="text" name="productName"></td>
                    <td><input type="text" name="productDescription"></td>
                    <?php
                    // collect currencies inputs group
                    $currencies = $wpdb->get_results(
                        "SELECT code FROM {$wpdb->prefix}arca_pg_currency WHERE active = 1"
                    );
                    foreach ($currencies as $currency) {
                        ?>
                        <td><input class="price" type="text" name="productPrice[<?php echo esc_attr($currency->code) ?>]"></td>
                        <?php
                    }
                    ?>
                    <td class="actions">
                        <?php apg_wp_nonce_field(); ?>
                        <input type="hidden" name="act" value="insert">
                        <input class="button button-primary" type="submit" value="<?php esc_html_e("Add", 'arca-payment-gateway' ) ?>">
                    </td>
                </tr>
            </table>
        </form>

        <br>

        <h2><?php esc_html_e("Price list", 'arca-payment-gateway' ) ?></h2>

        <table>
            <tr>
                <th><?php esc_html_e("ID", 'arca-payment-gateway' ) ?></th>
                <th><?php esc_html_e("Product name", 'arca-payment-gateway' ) ?> *</th>
                <th><?php esc_html_e("Product description", 'arca-payment-gateway' ) ?> <?php echo ($arca_config->bankId == 10) ? "*": ""; ?></th>
                <?php
                // collect currencies title group
                $currencies = $wpdb->get_results(
                    "SELECT abbr FROM {$wpdb->prefix}arca_pg_currency WHERE active = 1"
                );

                foreach ($currencies as $currency) {
                    ?>
                    <th title="<?php esc_html_e("Product price", 'arca-payment-gateway' ) ?>"><?php echo esc_html($currency->abbr) ?></th>
                    <?php
                }
                ?>
                <th><?php esc_html_e("Actions", 'arca-payment-gateway' ) ?></th>
            </tr>
            <?php
            $result = $wpdb->get_results(
                "SELECT * FROM {$wpdb->prefix}arca_pg_pricelist ORDER BY productId ASC"
            );
            foreach ($result as $row) {
                ?>
                <tr>
                    <form method="post">
                        <td><?php echo esc_html($row->productId); ?></td>
                        <td><input type="text" name="productName" value="<?php echo esc_attr($row->productName); ?>"></td>
                        <td><input type="text" name="productDescription" value="<?php echo esc_attr($row->productDescription); ?>"></td>
                        <?php
                        $currencies = $wpdb->get_results("select code from ".$wpdb->prefix."arca_pg_currency where active = 1");
                        foreach ($currencies as $currency) {
                            ?>
                            <td><input class="price" type="text" name="productPrice[<?php echo esc_attr($currency->code) ?>]" value="<?php echo esc_attr(arca_pg_getPriceFromJson( $row->productPrice, $currency->code )) ?>"></td>
                            <?php
                        }
                        ?>
                        <td class="actions">
                            <input type="hidden" name="productId" value="<?php echo esc_attr($row->productId); ?>">
                            <?php apg_wp_nonce_field(); ?>
                            <input type="hidden" name="act" value="save">
                            <input class="button button-primary" type="submit" value="<?php esc_html_e("Save", 'arca-payment-gateway' )?>">
                            <a class="arca-pg-thickbox button" href="<?php echo esc_url( add_query_arg(array(
                                'action' => 'arca_pg_popup',
                                'productId' => $row->productId,
                                'width' => '700',
                                'height' => '450',
                                'nonce' => $arca_pg_nonce,
                                'TB_iframe' => '1',
                            ), admin_url('admin-ajax.php')) ); ?>" title="<?php esc_html_e("Shortcode", 'arca-payment-gateway' ) ?>"><?php esc_html_e("Shortcode", 'arca-payment-gateway' ) ?></a>
                            <a class="linkDelate button" onclick="return confirmDelete();" href="<?php echo esc_url("?page=pricelist&act=delete&productId=".$row->productId); ?><?php apg_wp_nonce_arg(); ?>"><?php esc_html_e("Delete", 'arca-payment-gateway' )?></a>
                        </td>
                    </form>
                </tr>
                <?php
            }
            ?>
        </table>

    </div>

</div>