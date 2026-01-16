/**
 * Test: Payment Gateways API Route
 * 
 * Integration tests for GET /api/v1/payments/gateways
 * 
 * Note: These are basic tests. For full testing, install Jest/Vitest.
 */

import { GET } from '@/app/api/v1/payments/gateways/route';
import { NextRequest } from 'next/server';

describe('GET /api/v1/payments/gateways', () => {
  it('should return enabled gateways', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/payments/gateways');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should only return enabled gateways', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/payments/gateways');
    const response = await GET(request);
    
    const data = await response.json();
    
    if (data.data.length > 0) {
      data.data.forEach((gateway: any) => {
        expect(gateway.enabled).toBe(true);
      });
    }
  });

  it('should return gateways sorted by position', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/payments/gateways');
    const response = await GET(request);
    
    const data = await response.json();
    
    if (data.data.length > 1) {
      for (let i = 1; i < data.data.length; i++) {
        expect(data.data[i].position).toBeGreaterThanOrEqual(data.data[i - 1].position);
      }
    }
  });

  it('should not expose sensitive config data', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/payments/gateways');
    const response = await GET(request);
    
    const data = await response.json();
    
    data.data.forEach((gateway: any) => {
      expect(gateway).not.toHaveProperty('config');
    });
  });
});

/**
 * Manual Test Instructions:
 * 
 * 1. Start development server:
 *    npm run dev
 * 
 * 2. Test endpoint:
 *    curl http://localhost:3000/api/v1/payments/gateways
 * 
 * 3. Expected response:
 *    {
 *      "data": [
 *        {
 *          "id": "...",
 *          "type": "idram",
 *          "name": "Idram",
 *          "testMode": true,
 *          "position": 0
 *        }
 *      ]
 *    }
 */







