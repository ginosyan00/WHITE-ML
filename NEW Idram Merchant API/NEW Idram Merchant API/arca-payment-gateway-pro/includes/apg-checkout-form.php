<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// wp verify nonce
require_once ('apg-wp-verify-nonce.php');

global $wpdb, $arca_config;

$errMgs = $strMgs = "";

// get payment form elements from $arca_confog
$formElements = json_decode( $arca_config->checkoutFormElements );

if ( $_SERVER["REQUEST_METHOD"] == "POST" ) {

    $act = ( isset($_POST["act"]) ) ? sanitize_text_field($_POST["act"]) : "";
    if ( $act == "save" ) {

        $elementName = (isset($_POST["elementName"])) ? sanitize_text_field($_POST["elementName"]) : "";
        $elementEnabled = (isset($_POST["elementEnabled"])) ? sanitize_text_field($_POST["elementEnabled"]) : false;
        $elementRequired = (isset($_POST["elementRequired"])) ? sanitize_text_field($_POST["elementRequired"]) : false;

        $formElements->$elementName->enabled = $elementEnabled;
        $formElements->$elementName->required = $elementRequired;

        $table = $wpdb->prefix."arca_pg_config";
        $data = array(
            'checkoutFormElements'  => json_encode($formElements),
        );

        $format = array('%s');
        $where = array('rest_serverID' => $arca_config->rest_serverID);
        $where_format = array('%d');

        // update payment form elements
        $wpdb->update( $table, $data, $where, $format, $where_format );

        $strMgs = __( "Done!", 'arca-payment-gateway' );

    }else if($act == "set-checkout-form-page"){

        $checkoutFormPage = (isset($_POST["checkoutFormPage"])) ? sanitize_text_field($_POST["checkoutFormPage"]) : "";

        $table = $wpdb->prefix . "arca_pg_config";
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$table} SET checkoutFormPage = %s",
                $checkoutFormPage
            )
        );

        $strMgs = __( "Done!", 'arca-payment-gateway' );

    }else if ($act == "arca-privacy-and-policy"){

        $privacyPolicyPage = (isset($_POST["privacyPolicyPage"])) ? sanitize_text_field($_POST["privacyPolicyPage"]) : "";

        $table = $wpdb->prefix . "arca_pg_config";
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$table} SET privacyPolicyPage = %s",
                $privacyPolicyPage
            )
        );

        $strMgs = __( "Done!", 'arca-payment-gateway' );

    }else if ($act == "save-email"){

        // validate mailFrom
        if ( !empty($_POST["mailFrom"]) ) {
            $mailFrom = sanitize_email($_POST["mailFrom"]);
            if ( !filter_var($mailFrom, FILTER_VALIDATE_EMAIL) ) {
                $errMgs .= __( "Incorrect email address", 'arca-payment-gateway' ) . "<br>";
            }
        } else {
            $mailFrom = "";
        }

        if( $errMgs == "" ) {

            // update mailFrom
            $table = $wpdb->prefix . 'arca_pg_config';
            $wpdb->query(
                $wpdb->prepare(
                    "UPDATE {$table} SET mailFrom = %s",
                    $mailFrom
                )
            );

            $strMgs = __( "Done!", 'arca-payment-gateway' );
        }

    }

}

// ArCa Payments Gateway configs
$arca_config = $wpdb->get_row("select * from " . $wpdb->prefix . "arca_pg_config where active = 1");
?>
<div class="wrap apg" id="apg-checkoutForm">

    <h1><?php esc_html_e("Checkout form", 'arca-payment-gateway' ) ?></h1>

    <p>
        <?php
        if ( $errMgs != "" || $strMgs != "" ) {
            echo wp_kses_post($errMgs), wp_kses_post($strMgs);
        }
        ?>
    </p>

    <div class="apg-main-container">

        <h2><?php esc_html_e("Billing details", 'arca-payment-gateway' ) ?></h2>


        <table>
            <tr>
                <th><?php esc_html_e("Input name", 'arca-payment-gateway' )?></th>
                <th class="center"><?php esc_html_e("Type", 'arca-payment-gateway' )?></th>
                <th class="center"><?php esc_html_e("Enabled", 'arca-payment-gateway' )?></th>
                <th class="center"><?php esc_html_e("Required", 'arca-payment-gateway' )?></th>
                <th class="actions"><?php esc_html_e("Actions", 'arca-payment-gateway' )?></th>
            </tr>
            <?php foreach ( $formElements as $elementName => $elementOptions ) { ?>
                <form method="post">
                    <tr>
                        <td>
                            <?php //_e( $elementOptions->label, 'arca-payment-gateway' )?>
                            <?php echo esc_html( $elementOptions->label )?>
                        </td>
                        <td class="center"><?php echo esc_html(ucfirst($elementOptions->type)) ?></td>
                        <td class="center"><input type="checkbox" name="elementEnabled" value="true" <?php echo ($elementOptions->enabled) ? "checked" : "" ?>></td>
                        <td class="center"><input type="checkbox" name="elementRequired" value="true" <?php echo ($elementOptions->required) ? "checked" : "" ?>></td>
                        <td class="actions">
                            <?php apg_wp_nonce_field(); ?>
                            <input type="hidden" name="act" value="save">
                            <input type="hidden" name="elementName" value="<?php echo esc_attr($elementName); ?>">
                            <input class="submitLink button button-primary" type="submit" value="<?php esc_html_e("Save", 'arca-payment-gateway' )?>">
                        </td>
                    </tr>
                </form>
            <?php } ?>
        </table>

        <br>

        <legend><?php esc_html_e("Shortcode", 'arca-payment-gateway' ) ?></legend>

        <div id="shortcode-1" class="copyToClipboard shortcode" onclick="CopyToClipboard('shortcode-1')" title="<?php esc_html_e("Copy", 'arca-payment-gateway' ) ?>">
            [arca-pg-form]
            <span class="dashicons dashicons-admin-page"></span>
        </div>

        <br>

        <legend><?php esc_html_e("Email from:", 'arca-payment-gateway' ) ?></legend>
        <form method="post" id="mailFrom">
            <input type="text" name="mailFrom" value="<?php echo esc_attr($arca_config->mailFrom); ?>">
            <?php apg_wp_nonce_field(); ?>
            <input type="hidden" name="act" value="save-email">
            <input class="submitLink button-primary" type="submit" value="<?php esc_html_e("Save", 'arca-payment-gateway' )?>">
        </form>
        <p><?php esc_html_e("Specify the email address from which the payer will receive the invoice, admin email is default.", 'arca-payment-gateway' ) ?></p>

        <br>

        <h2><?php esc_html_e("Checkuot page", 'arca-payment-gateway' )?></h2>

        <form method="post">
            <select name="checkoutFormPage">
                <option value="<?php echo esc_attr($arca_config->checkoutFormPage); ?>"><?php echo esc_html($arca_config->checkoutFormPage); ?></option>
                <optgroup label="<?php esc_html_e("Select to change", 'arca-payment-gateway' )?>">
                    <?php
                    // get all pages
                    $pages = get_pages( [
                        'sort_order'   => 'ASC',
                        'sort_column'  => 'post_title',
                        'hierarchical' => 1,
                        'exclude'      => '',
                        'include'      => '',
                        'meta_key'     => '',
                        'meta_value'   => '',
                        'authors'      => '',
                        'child_of'     => 0,
                        'parent'       => -1,
                        'exclude_tree' => '',
                        'number'       => '',
                        'offset'       => 0,
                        'post_type'    => 'page',
                        'post_status'  => 'publish',
                    ] );
                    foreach( $pages as $post ){
                        // get end decode post slug
                        $arca_pg_postName = urldecode($post->post_name);
                        echo "<option value='" . esc_attr($arca_pg_postName) . "'>" . esc_html($post->post_title) . (($arca_config->checkoutFormPage == $arca_pg_postName) ? " &larr;" : "") . "</option>";
                    }
                    ?>
                </optgroup>
            </select>
            <?php apg_wp_nonce_field(); ?>
            <input type="hidden" name="act" value="set-checkout-form-page">
            <input class="submitLink button button-primary" type="submit" value="<?php esc_html_e("Save", 'arca-payment-gateway' )?>">
        </form>

        <br>

        <h2><?php esc_html_e("Privacy Policy Page", 'arca-payment-gateway' )?></h2>

        <form method="post">
            <select name="privacyPolicyPage">
                <option value="<?php echo esc_attr($arca_config->privacyPolicyPage); ?>"><?php echo esc_html($arca_config->privacyPolicyPage); ?></option>
                <optgroup label="<?php esc_html_e("Select to change", 'arca-payment-gateway' )?>">
                    <?php
                    // get all pages
                    $pages = get_pages( [
                        'sort_order'   => 'ASC',
                        'sort_column'  => 'post_title',
                        'hierarchical' => 1,
                        'exclude'      => '',
                        'include'      => '',
                        'meta_key'     => '',
                        'meta_value'   => '',
                        'authors'      => '',
                        'child_of'     => 0,
                        'parent'       => -1,
                        'exclude_tree' => '',
                        'number'       => '',
                        'offset'       => 0,
                        'post_type'    => 'page',
                        'post_status'  => 'publish',
                    ] );
                    foreach( $pages as $post ){
                        // get end decode post slug
                        $arca_pg_postName = urldecode($post->post_name);
                        echo "<option value='" . esc_attr($arca_pg_postName) . "'>" . esc_html($post->post_title) . (($arca_config->privacyPolicyPage == $arca_pg_postName) ? " &larr;" : "") . "</option>";
                    }
                    ?>
                </optgroup>
            </select>
            <?php apg_wp_nonce_field(); ?>
            <input type="hidden" name="act" value="arca-privacy-and-policy">
            <input class="submitLink button button-primary" type="submit" value="<?php esc_html_e("Save", 'arca-payment-gateway' )?>">
        </form>

        <br>

    </div>

</div>