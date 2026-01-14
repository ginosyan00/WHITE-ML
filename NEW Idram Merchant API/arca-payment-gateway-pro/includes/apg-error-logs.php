<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// wp verify nonce
require_once ('apg-wp-verify-nonce.php');

global $wpdb, $arca_config;

$act = (isset($_GET["act"])) ? sanitize_text_field($_GET["act"]) : "";
$id = (isset($_GET["id"]) && is_numeric($_GET["id"])) ? intval($_GET["id"]) : 0;

// get test or real logs
$rest_serverID = ( isset($_GET["rest_serverID"]) && is_numeric($_GET["rest_serverID"]) ) ? intval($_GET["rest_serverID"]) : $arca_config->rest_serverID ;

$strMgs = $errMgs = "";

if ( $act == "delete" ) {
    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}arca_pg_errorlogs WHERE id = %d",
            $id
        )
    );
    $strMgs = __( "Done!", 'arca-payment-gateway' );
} else if ( $act == "delete_all" ){

    //$wpdb->query("DELETE FROM " . $wpdb->prefix . "arca_pg_errorlogs");
    $wpdb->query("DELETE FROM {$wpdb->prefix}arca_pg_errorlogs");
    $strMgs = __( "Done!", 'arca-payment-gateway' );
}
?>

<div class="wrap apg" id="apg-errorLogs">

    <h1>
        <?php esc_html_e("Error logs", 'arca-payment-gateway' ) ?>
        <span class="apg-test-mode">
            <?php if ( $arca_config->rest_serverID == 2 ) { esc_html_e("TEST MODE", 'arca-payment-gateway' ); } ?>
        </span>
    </h1>

    <p>
        <?php
        if ( $errMgs != "" || $strMgs != "" ) {
            echo wp_kses_post($errMgs), wp_kses_post($strMgs);
        }
        ?>
    </p>

    <div class="apg-main-container">

        <p>
            <a style="margin-right:20px" class="linkDelate button" onclick="return confirmDelete();" href="<?php echo esc_url("?page=errorlogs&act=delete_all"); ?><?php apg_wp_nonce_arg(); ?>"><?php esc_html_e("Delete All", 'arca-payment-gateway' )?></a>
            <a class="button<?php echo (($rest_serverID == 1) ? '-primary' : '');?>" href="<?php echo esc_url("?page=errorlogs&rest_serverID=1"); ?>"><?php esc_html_e("Real Orders", 'arca-payment-gateway' )?></a>
            <a class="button<?php echo (($rest_serverID == 2) ? '-primary' : '');?>" href="<?php echo esc_url("?page=errorlogs&rest_serverID=2"); ?>"><?php esc_html_e("Test Orders", 'arca-payment-gateway' )?></a>
        </p>

        <table>
            <tr>
                <th><?php esc_html_e("ID", 'arca-payment-gateway' )?></th>
                <th><?php esc_html_e("Date", 'arca-payment-gateway' )?></th>
                <th><?php esc_html_e("Error", 'arca-payment-gateway' )?></th>
                <th><?php esc_html_e("Actions", 'arca-payment-gateway' )?></th>
            </tr>

            <?php
            $result = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$wpdb->prefix}arca_pg_errorlogs WHERE rest_serverID = %d ORDER BY id DESC",
                    $rest_serverID
                )
            );
            foreach ( $result as $row ) {
                ?>
                <tr>
                    <td><?php echo esc_html($row->id); ?></td>
                    <td><?php echo esc_html($row->dateTime); ?></td>
                    <td><?php echo esc_html($row->error); ?></td>
                    <td class="actions">
                        <a class="linkDelate button" onclick="return confirmDelete();" href="<?php echo esc_url("?page=errorlogs&act=delete&id=" . $row->id); ?><?php apg_wp_nonce_arg(); ?>"><?php esc_html_e("Delete", 'arca-payment-gateway' )?></a>
                    </td>
                </tr>
                <?php
            }
            ?>
        </table>

    </div>

</div>
