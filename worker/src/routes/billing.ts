// BOSS HQ — Billing Routes
// Minimal API surface for the revenue system.
// All business logic lives in services. Routes only parse, call, and respond.

import { jsonResponse } from '../cors'
import { mockProvider }  from '../providers/mockProvider'
import { InvoiceLockError } from '../providers/DataProvider'

import { getCampaignMetrics, getGlobalMetrics } from '../services/reportService'
import { generateInvoice, sendInvoice }         from '../services/invoiceService'
import { recordPayment }                         from '../services/paymentService'
import { InvoiceError }                          from '../services/invoiceService'
import { PaymentError }                          from '../services/paymentService'

// Provider injected here — swap mockProvider → realProvider when ready
const provider = mockProvider

export async function billingRouter(
  request: Request,
  origin: string | null
): Promise<Response> {
  const url     = new URL(request.url)
  const path    = url.pathname          // e.g. /api/billing/metrics
  const method  = request.method
  const segments = path.split('/').filter(Boolean)
  // segments: ['api', 'billing', ...]

  try {

    // GET /api/billing/metrics — global metrics
    if (method === 'GET' && segments[2] === 'metrics' && segments.length === 3) {
      const data = getGlobalMetrics(provider)
      return jsonResponse({ success: true, data }, 200, origin)
    }

    // GET /api/billing/campaigns/:id/metrics — campaign metrics
    if (method === 'GET' && segments[2] === 'campaigns' && segments[4] === 'metrics') {
      const campaignId = segments[3]
      const data = getCampaignMetrics(provider, campaignId)
      if (!data) return jsonResponse({ success: false, error: `Campaign not found: ${campaignId}` }, 404, origin)
      return jsonResponse({ success: true, data }, 200, origin)
    }

    // POST /api/billing/campaigns/:id/invoice — generate invoice
    if (method === 'POST' && segments[2] === 'campaigns' && segments[4] === 'invoice') {
      const campaignId = segments[3]
      const data = generateInvoice(provider, campaignId)
      return jsonResponse({ success: true, data }, 200, origin)
    }

    // POST /api/billing/invoices/:id/send — lock invoice
    if (method === 'POST' && segments[2] === 'invoices' && segments[4] === 'send') {
      const invoiceId = segments[3]
      const data = sendInvoice(provider, invoiceId)
      return jsonResponse({ success: true, data }, 200, origin)
    }

    // POST /api/billing/invoices/:id/payment — record payment
    if (method === 'POST' && segments[2] === 'invoices' && segments[4] === 'payment') {
      const invoiceId = segments[3]
      const body = await request.json() as Record<string, unknown>
      const amount = Number(body.amount)
      if (!amount || isNaN(amount)) {
        return jsonResponse({ success: false, error: 'amount is required and must be a number' }, 422, origin)
      }
      const data = recordPayment(provider, invoiceId, amount)
      return jsonResponse({ success: true, data }, 200, origin)
    }

    return jsonResponse({ success: false, error: 'Not found' }, 404, origin)

  } catch (err) {
    if (err instanceof InvoiceError || err instanceof PaymentError) {
      return jsonResponse({ success: false, error: err.message }, 422, origin)
    }
    if (err instanceof InvoiceLockError) {
      return jsonResponse({ success: false, error: err.message }, 409, origin)
    }
    return jsonResponse({ success: false, error: String(err) }, 500, origin)
  }
}
