# <a id="_Toc8708"></a>Idram Payment System merchant interface description  

  

[Idram Payment System merchant interface description	1 ](#_Toc8708)

[1\. Requirements	1 ](#_Toc8709)

[2\. Payment via Idram Wallet \(Web\)	1 ](#_Toc8710)

[3\.  Payment via Idram Wallet \(Mobile app\)	3 ](#_Toc8711)

[4\.  Bank Card \(VISA/MasterCard\)	4 ](#_Toc8712)

[5\.  Order Confirmation	4 ](#_Toc8713)

 

  

## <a id="_Toc8709"></a>1\.__ __Requirements  

This document describes the interaction scheme between a merchant and Idram Merchant Interface\. There are 3 URLs, 1 secret key and 1 email address for each merchant working with the Idram system\.   

- SUCCESS\_URL   
- FAIL\_URL   
- RESULT\_URL   
- SECRET\_KEY   
- EMAIL   

At the moment these 5 parameters are set by Idram payment system technical personnel after signing an agreement with merchant company\.   

SUCCESS\_URL  

A script or html page URL, to which user has to be redirected when transaction has been complete successfully  

FAIL\_URL  

A script or html page URL, to which user has to be redirected when transaction has been 

failed  

RESULT\_URL  

The URL of script which processes Idram system requests  

SECRET\_KEY  

A secret key, known only to merchant and Idram system  

EMAIL  

Email address, to which payment confirmation will be sent if “OK” reply was not received from merchant during payment confirmation process   

  

## <a id="_Toc8710"></a>2\.__ __Payment via Idram Wallet \(Web\)  

The merchant must generate html form, containing the following hidden fields:   

Field  

Description  

EDP\_LANGUAGE  

\(RU,EN,AM\)   

In this field merchant sets Idram interface language   

EDP\_REC\_ACCOUNT  

IdramID of the merchant, which receives customer’s payment   

EDP\_DESCRIPTION  

Product or service description\.  

If set, it is assigned to the payment description in Idram transaction  

EDP\_AMOUNT  

Payment amount, which merchant requests from the customer\. The amount must be greater than zero\. Fraction must be separated by period \(dot\)  

EDP\_BILL\_NO  

In this field merchant sets bill ID according to his accounting system  

EDP\_EMAIL  

Email address, to which payment confirmation will be sent if “OK” reply was not received from merchant during payment confirmation process\. If set, it overloads EMAIL field value for the current operation  

Additional merchant 

fields  

All fields not having "EDP\_" prefix, are automatically processed by Idram service and posted to the merchant’s web\-site after payment completion  

  

The form must send a request to [https://banking\.idram\.am/Payment/GetPayment \(](https://banking.idram.am/Payment/GetPayment)by action parameter\) using POST method\. Idram interface uses utf\-8 encoding\. It means that EDP\_DESCRIPTION field must contain text encoded with utf\-8\.   

Below is an example of the payment request html form\.   

<form action="https://banking\.idram\.am/Payment/GetPayment" method="POST">  

 	  	<input type="hidden" name="EDP\_LANGUAGE" value="EN">  

 	  	<input type="hidden" name="EDP\_REC\_ACCOUNT" value="100000114">  

 	  	<input type="hidden" name="EDP\_DESCRIPTION" value="Order description">  

 	  	<input type="hidden" name="EDP\_AMOUNT" value="1900">  

 	  	<input type="hidden" name="EDP\_BILL\_NO" value ="1806">  

 	  	<input type="submit" value="submit">  

 	</form>   	  

  

After user clicks on “Submit” button he is redirected to the Idram payment system web\-page and passes the authentication\. After that Idram system sends two POST \(Content\-Type = x\-www\-form\-urlencoded\) requests to aforementioned URL \(RESULT\_URL\): first \(a\) for confirmation of order authenticity, and second \(b\) for confirmation of payment transaction\. See Order Confirmation section \(section 5\)\.  

  

If you need to open Idram in your native mobile application like webview you need to handle WKNavigationDelegate\.  

  

  

For applications written in Swift:  

func webView\(\_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, 

decisionHandler: @escaping \(WKNavigationActionPolicy\) \-> Void\) \{  if navigationAction\.navigationType == WKNavigationType\.linkActivated \{  if let url = navigationAction\.request\.url, url\.absoluteString\.contains\("idramapp://"\) \{  if UIApplication\.shared\.canOpenURL\(webUrl\) \{  UIApplication\.shared\.open\(webUrl\)   

\}  

decisionHandler\(WKNavigationActionPolicy\.cancel\) return  

\}  

\}   

decisionHandler\(WKNavigationActionPolicy\.allow\)  

\}  

  

For applications written in Objective\-C:  

\- \(void\)webView:\(WKWebView \*\)webView decidePolicyForNavigationAction:\(WKNavigationAction  

\*\)navigationAction decisionHandler:\(void \(^\)\(WKNavigationActionPolicy\)\)decisionHandler \{  if \(navigationAction\.navigationType == WKNavigationTypeLinkActivated\) \{  NSURL \*url 

= navigationAction\.request\.URL;   if\(\[url\.absoluteString containsString:@"idramapp://"\]\) \{   

\[\[UIApplication sharedApplication\] openURL:url options:@\{\} completionHandler:nil\]; decisionHandler\(WKNavigationActionPolicyCancel\);  return;   

\}   

\}   

decisionHandler\(WKNavigationActionPolicyAllow\);   

\}  

  

In your Info\.plist file add the following:  

<key>LSApplicationQueriesSchemes</key>   

<array>   

<string>idramapp</string>   

</array>  

  

## <a id="_Toc8711"></a>3\.__ __Payment via Idram Wallet \(Mobile app\)  

In this case from merchant mobile app can be opened Idram Mobile Wallet and payment will be done directly in mobile wallet\.  

Manual of it is here for iOS and Android platforms:  

https://github\.com/karapetyangevorg/IdramMerchantPayment [https://github\.com/karapetyangevorg/IdramMerchantPayment\-Android  ](https://github.com/karapetyangevorg/IdramMerchantPayment-Android)or  

idramapp://payment?receiverName=\{\{metchant\_name\}\}&receiverId=\{\{EDP\_REC\_ACCOUNT\}\}&title =\{\{EDP\_BILL\_NO\}\}&amount=\{\{EDP\_AMOUNT\}\}&callbackUrlScheme=\{\{scheme\_url\}\}  

  

Backend integration is the same as a web version\. See Order Confirmation section \(section 5\)\.  

## <a id="_Toc8712"></a>4\.__ __Bank Card \(VISA/MasterCard\)  

Bank Card payment interface can be ported into Merchant’s web page using iframe\.  

  

URL for loading it:   

https://money\.idram\.am/AM/ccepayMerchant\.aspx?EDP\_REC\_ACCOUNT=100000114&EDP\_AMO UNT=1000&EDP\_BILL\_NO=1  

  

In frame form client will input the bank card details and will see the transaction result\.  

  

Back end integration is the same as a web version\. See Order Confirmation section \(section 5\)\.  

## <a id="_Toc8713"></a>5\.__ __Order Confirmation  

1. Order authenticity confirmation \(preliminary request\)\.  

  

Before transferring funds from customer’s IdramID to merchant’s IdramID, Idram Merchant Interface initiates http two POST \(Content\-Type = x\-www\-form\-urlencoded\) request to RESULT\_URL \(see above\)\.  

  

This request checks the authenticity of the payment order\. This form sends payment parameters to the merchant immediately before its execution\. It contains following fields \(parameters with query string\):  

  

EDP\_PRECHECK  

Value is set to "YES"\. This parameters shows that current request is preliminary  

EDP\_BILL\_NO  

This field contains bill ID according to the merchant’s accounting system, received from merchant’s web\-site  

EDP\_REC\_ACCOUNT  

Merchant IdramID \(in Idram system\) to which customer made the payment  

EDP\_AMOUNT  

Amount that must be paid by the customer\. Fraction must be separated by period \(dot\)  

  

The merchant must check all received data and if they are correct \(i\.e\. such order was actually made and the EDP\_AMOUNT amount matches with the order amount registered in own system\) it must send “OK” message back \(without any html formatting\) with HTTP code 200\. Otherwise, Idram will not allow customer pay the bill, i\.e\. money will not be transferred and system will redirect the customer to FAIL\_URL\. 

  

 

1. Payment confirmation\.  

This http POST \(Content\-Type = x\-www\-form\-urlencoded\) request sends payment parameters to the merchant after its completion\. It has the following fields \(parameters with query string\):  

  

EDP\_BILL\_NO  

This field contains bill ID according to the merchant’s accounting system  

EDP\_REC\_ACCOUNT  

Merchant IdramID \(in Idram system\) to which customer made the payment  

EDP\_PAYER\_ACCOUNT  

Customer IdramID \(in Idram system\) from which customer made the payment  

EDP\_AMOUNT  

\(format\-0\.00\)  

Amount that must be paid by the customer\. Fraction must be separated by period \(dot\)  

EDP\_TRANS\_ID  format \- char\(14\)  

Payment transaction ID in Idram system\. A unique number in Idram system\.  

EDP\_TRANS\_DATE 

format \-dd/mm/yyyy   

Transaction date  

  

EDP\_CHECKSUM: Payment data checksum allows to check the source and the integrity of the data sent to the RESULT\_URL by “Payment confirmation” request\. The checksum is calculated for the following fields:   

- 
	- EDP\_REC\_ACCOUNT   
	- EDP\_AMOUNT 
	- SECRET\_KEY   
	- EDP\_BILL\_NO   
	- EDP\_PAYER\_ACCOUNT   
	- EDP\_TRANS\_ID   
	- EDP\_TRANS\_DATE  

Which are concatenated \(imploded\) by colon \(":"\)\.  

Then the MD5 hash of the concatenated string is calculated and its value is assigned to the EDP\_CHECKSUM parameter\. The merchant must execute same calculation \(but instead of EDP\_AMOUNT it should use the order amount registered in own system\) in order to check the source and integrity of the data\.  

The merchant must also check all received data and if they are correct \(i\.e\. such order was actually made, and sent amount matches with the one generated in the merchant system\) it must send “OK” message back \(without any html formatting\) with HTTP code 200, otherwise: 

- 
	- ⁠In the case where the HTTP code is 200, but the Message is not "OK", the transaction is automatically canceled on the Idram side and an email alert is sent to Idram support team\. 
	- For any HTTP code in the 2XX range \(excluding 200\), the transaction is autocanceled and email alert is sent to Idram support team\. 
	- When HTTP code is NOT 2XX, then the transaction is still considered successful on the Idram side\. However, an email alert is sent to Idram support team to notify them of the non\-typical response\. 

