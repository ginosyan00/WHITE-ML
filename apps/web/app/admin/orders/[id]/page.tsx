'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { Card, Button } from '@shop/ui';
import { apiClient } from '../../../../lib/api-client';
import { useTranslation } from '../../../../lib/i18n-client';

interface OrderDetails {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: number;
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  customer?: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  billingAddress?: any | null;
  shippingAddress?: any | null;
  shippingMethod?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  payment?: {
    id: string;
    provider: string;
    method?: string | null;
    amount: number;
    currency: string;
    status: string;
    cardLast4?: string | null;
    cardBrand?: string | null;
    providerTransactionId?: string | null;
  } | null;
  items: Array<{
    id: string;
    productTitle: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
    variantOptions?: Array<{
      attributeKey?: string;
      value?: string;
    }>;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export default function OrderDetailsPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = typeof params?.id === 'string' ? params.id : '';
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatCurrency = (amount: number, currency: string = 'AMD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to get color hex/rgb from color name
  const getColorValue = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      'beige': '#F5F5DC', 'black': '#000000', 'blue': '#0000FF', 'brown': '#A52A2A',
      'gray': '#808080', 'grey': '#808080', 'green': '#008000', 'red': '#FF0000',
      'white': '#FFFFFF', 'yellow': '#FFFF00', 'orange': '#FFA500', 'pink': '#FFC0CB',
      'purple': '#800080', 'navy': '#000080', 'maroon': '#800000', 'olive': '#808000',
      'teal': '#008080', 'cyan': '#00FFFF', 'magenta': '#FF00FF', 'lime': '#00FF00',
      'silver': '#C0C0C0', 'gold': '#FFD700',
    };
    const normalizedName = colorName.toLowerCase().trim();
    return colorMap[normalizedName] || '#CCCCCC';
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/admin');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  useEffect(() => {
    // If we somehow don't have an order id, don't call the API
    if (!orderId) {
      console.error('❌ [ADMIN][OrderDetails] Missing orderId from route params');
      setError(t('admin.orders.orderDetails.orderIdMissing'));
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📂 [ADMIN][OrderDetails] Loading order details page...', { orderId });
        const response = await apiClient.get<OrderDetails>(`/api/v1/admin/orders/${orderId}`);
        console.log('✅ [ADMIN][OrderDetails] Order details loaded:', response);
        setOrder(response);
      } catch (err: any) {
        console.error('❌ [ADMIN][OrderDetails] Failed to load order details:', err);
        setError(err?.message || t('admin.orders.orderDetails.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn && isAdmin) {
      loadOrder();
    }
  }, [isLoggedIn, isAdmin, orderId]);

  const handleSyncPayment = async () => {
    if (!order || !orderId) return;

    try {
      setSyncing(true);
      setMessage(null);

      const response = await apiClient.post(`/api/v1/admin/orders/${orderId}/sync-payment`);
      
      // Reload order to get updated status
      const updatedOrder = await apiClient.get<OrderDetails>(`/api/v1/admin/orders/${orderId}`);
      setOrder(updatedOrder);

      setMessage({ type: 'success', text: 'Payment status synced successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error syncing payment:', err);
      setMessage({ 
        type: 'error', 
        text: err?.message || 'Failed to sync payment status' 
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const handleRefund = async () => {
    if (!order || !orderId) return;

    const confirmed = window.confirm(
      `Are you sure you want to refund this payment?\n\nAmount: ${formatCurrency(order.total, order.currency || 'AMD')}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setRefunding(true);
      setMessage(null);

      const response = await apiClient.post(`/api/v1/admin/orders/${orderId}/refund`, {
        amount: order.total, // Full refund by default
      });
      
      // Reload order to get updated status
      const updatedOrder = await apiClient.get<OrderDetails>(`/api/v1/admin/orders/${orderId}`);
      setOrder(updatedOrder);

      setMessage({ type: 'success', text: 'Refund processed successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error processing refund:', err);
      setMessage({ 
        type: 'error', 
        text: err?.message || 'Failed to process refund' 
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setRefunding(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.orders.orderDetails.loadingOrderDetails')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/orders')}
              className="text-gray-600 hover:text-gray-900 mb-2 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('admin.orders.orderDetails.backToOrders')}
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t('admin.orders.orderDetails.title')} {order ? `#${order.number}` : ''}
            </h1>
            {order && (
              <p className="mt-1 text-sm text-gray-500">
                {t('admin.orders.orderDetails.createdAt')} {new Date(order.createdAt).toLocaleString()}
                {order.updatedAt ? ` • ${t('admin.orders.orderDetails.updatedAt')} ${new Date(order.updatedAt).toLocaleString()}` : ''}
              </p>
            )}
          </div>
        </div>

        {error && (
          <Card className="p-4 mb-4 border border-red-200 bg-red-50">
            <div className="text-sm text-red-700">{error}</div>
          </Card>
        )}

        {message && (
          <Card className={`p-4 mb-4 border ${
            message.type === 'success' 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            <div className={`text-sm ${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {message.text}
            </div>
          </Card>
        )}

        {!order && !error && (
          <Card className="p-4">
            <div className="text-sm text-gray-600">{t('admin.orders.orderDetails.orderNotFound')}</div>
          </Card>
        )}

        {order && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('admin.orders.orderDetails.summary')}</h2>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>
                      <span className="font-medium">{t('admin.orders.orderDetails.orderNumber')}</span> {order.number}
                    </div>
                    <div>
                      <span className="font-medium">{t('admin.orders.orderDetails.total')}</span>{' '}
                      {formatCurrency(order.total, order.currency || 'AMD')}
                    </div>
                    <div>
                      <span className="font-medium">{t('admin.orders.orderDetails.status')}</span> {order.status}
                    </div>
                    <div>
                      <span className="font-medium">{t('admin.orders.orderDetails.payment')}</span> {order.paymentStatus}
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('admin.orders.orderDetails.customer')}</h2>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>
                      {(order.customer?.firstName || '') +
                        (order.customer?.lastName ? ' ' + order.customer.lastName : '') ||
                        t('admin.orders.unknownCustomer')}
                    </div>
                    {order.customerPhone && <div>{order.customerPhone}</div>}
                    {order.customerEmail && <div>{order.customerEmail}</div>}
                  </div>
                </div>
              </div>
            </Card>

            {/* Addresses & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 md:p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('admin.orders.orderDetails.shippingAddress')}</h2>
                {order.shippingMethod === 'pickup' ? (
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>
                      <span className="font-medium">{t('admin.orders.orderDetails.shippingMethod')}</span>{' '}
                      {t('checkout.shipping.storePickup')}
                    </div>
                    <p className="text-gray-500 mt-2">{t('checkout.shipping.storePickupDescription')}</p>
                  </div>
                ) : order.shippingMethod === 'delivery' && order.shippingAddress ? (
                  <div className="text-sm text-gray-700 space-y-1">
                    <div className="mb-2">
                      <span className="font-medium">{t('admin.orders.orderDetails.shippingMethod')}</span>{' '}
                      {t('checkout.shipping.delivery')}
                    </div>
                    {(order.shippingAddress.address || order.shippingAddress.addressLine1) && (
                      <div>
                        <span className="font-medium">{t('checkout.form.address')}:</span>{' '}
                        {order.shippingAddress.address || order.shippingAddress.addressLine1}
                        {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                      </div>
                    )}
                    {order.shippingAddress.city && (
                      <div>
                        <span className="font-medium">{t('checkout.form.city')}:</span> {order.shippingAddress.city}
                      </div>
                    )}
                    {order.shippingAddress.postalCode && (
                      <div>
                        <span className="font-medium">{t('checkout.form.postalCode')}:</span> {order.shippingAddress.postalCode}
                      </div>
                    )}
                    {(order.shippingAddress.phone || order.shippingAddress.shippingPhone) && (
                      <div className="mt-2">
                        <span className="font-medium">{t('checkout.form.phoneNumber')}:</span>{' '}
                        {order.shippingAddress.phone || order.shippingAddress.shippingPhone}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    <p>{t('admin.orders.orderDetails.noShippingAddress')}</p>
                    {order.shippingMethod && (
                      <p>
                        {t('admin.orders.orderDetails.shippingMethod')}{' '}
                        {order.shippingMethod === 'pickup' 
                          ? t('admin.orders.orderDetails.pickup')
                          : order.shippingMethod === 'delivery'
                          ? t('checkout.shipping.delivery')
                          : order.shippingMethod}
                      </p>
                    )}
                  </div>
                )}
              </Card>

              <Card className="p-4 md:p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('admin.orders.orderDetails.paymentInfo')}</h2>
                {order.payment ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-700 space-y-1">
                      {order.payment.method && <div>{t('admin.orders.orderDetails.method')} {order.payment.method}</div>}
                      <div>
                        {t('admin.orders.orderDetails.amount')}{' '}
                        {formatCurrency(order.payment.amount, order.payment.currency || 'AMD')}
                      </div>
                      <div>{t('admin.orders.orderDetails.status')} {order.payment.status}</div>
                      {order.payment.cardBrand && order.payment.cardLast4 && (
                        <div>
                          {t('admin.orders.orderDetails.card')} {order.payment.cardBrand} ••••{order.payment.cardLast4}
                        </div>
                      )}
                    </div>
                    
                    {/* Payment Actions */}
                    {order.payment.providerTransactionId && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={handleSyncPayment}
                          disabled={syncing}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {syncing ? (
                            <>
                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Syncing...
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Sync from Bank
                            </>
                          )}
                        </button>
                        
                        {order.paymentStatus === 'paid' && order.payment.status === 'completed' && (
                          <button
                            onClick={handleRefund}
                            disabled={refunding || order.paymentStatus === 'refunded'}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {refunding ? (
                              <>
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Refund
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">{t('admin.orders.orderDetails.noPaymentInfo')}</div>
                )}
              </Card>
            </div>

            {/* Items */}
            <Card className="p-4 md:p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('admin.orders.orderDetails.items')}</h2>
              {Array.isArray(order.items) && order.items.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">{t('admin.orders.orderDetails.product')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">{t('admin.orders.orderDetails.sku')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">{t('admin.orders.orderDetails.colorSize')}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">{t('admin.orders.orderDetails.qty')}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">{t('admin.orders.orderDetails.price')}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">{t('admin.orders.orderDetails.totalCol')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {order.items.map((item) => {
                        // Extract color and size from variant options (case-insensitive matching)
                        const colorOption = item.variantOptions?.find(opt => {
                          const key = opt.attributeKey?.toLowerCase()?.trim();
                          return key === 'color' || key === 'colour';
                        });
                        const sizeOption = item.variantOptions?.find(opt => {
                          const key = opt.attributeKey?.toLowerCase()?.trim();
                          return key === 'size';
                        });
                        const color = colorOption?.value;
                        const size = sizeOption?.value;

                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-2">{item.productTitle}</td>
                            <td className="px-3 py-2 text-gray-500">{item.sku}</td>
                            <td className="px-3 py-2">
                              {(color || size) ? (
                                <div className="flex flex-wrap gap-2 items-center">
                                  {color && (
                                    <div className="flex items-center gap-1.5">
                                      <div 
                                        className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                                        style={{ 
                                          backgroundColor: getColorValue(color),
                                        }}
                                        title={color}
                                      />
                                      <span className="text-xs text-gray-700 capitalize">{color}</span>
                                    </div>
                                  )}
                                  {size && (
                                    <span className="text-xs text-gray-700 uppercase">{size}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(item.unitPrice, order.currency || 'AMD')}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(item.total, order.currency || 'AMD')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">{t('admin.orders.orderDetails.noItemsFound')}</div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}


