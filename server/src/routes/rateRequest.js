import { Router } from 'express';
import { Resend } from 'resend';
import { query } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

/**
 * POST /api/send-rate-request
 * Sends a rate comparison request to Annie Mac Home Mortgage via Resend.
 * Logs the send to activity_log for tracking.
 */
router.post('/', async (req, res) => {
  const { senderName, propertyAddress, leadData, checklistId } = req.body;
  const { userId } = req.user;

  if (!senderName || !propertyAddress) {
    return res.status(400).json({ error: 'senderName and propertyAddress are required' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured (missing RESEND_API_KEY)' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  // Free Resend tier: can only send to your verified email until a domain is added.
  const recipient = 'richard@homesweetmaine.com';
  const subject = `${senderName} is requesting a rate comparison for their buyer`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #1b3c6b; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; color: #ffffff;">Rate Comparison Request</h1>
        <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px; color: #94a3b8;">Sent by ${senderName}</p>
      </div>

      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
            <strong>${senderName}</strong> has a buyer under contract and is requesting a competitive rate comparison from Annie Mac Home Mortgage. The buyer currently has financing in place — details below.
          </p>
        </div>

        <h2 style="color: #1b3c6b; font-size: 18px; margin-top: 0; border-bottom: 2px solid #1b3c6b; padding-bottom: 8px;">Property Details</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; width: 40%; border: 1px solid #e5e7eb; color: #374151;">Property Address</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${propertyAddress}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">MLS #</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.mlsNumber || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Purchase Price</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${leadData?.purchasePrice || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Closing Date</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.closingDate || 'N/A'}</td>
          </tr>
        </table>

        <h2 style="color: #1b3c6b; font-size: 18px; border-bottom: 2px solid #1b3c6b; padding-bottom: 8px;">Buyer Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; width: 40%; border: 1px solid #e5e7eb; color: #374151;">Buyer Name</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.buyerName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Buyer Email</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.buyerEmail || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Buyer Phone</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.buyerPhone || 'N/A'}</td>
          </tr>
        </table>

        <h2 style="color: #1b3c6b; font-size: 18px; border-bottom: 2px solid #1b3c6b; padding-bottom: 8px;">Current Financing</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; width: 40%; border: 1px solid #e5e7eb; color: #374151;">Current Lender</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.currentLender || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Loan Type</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.loanType || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Down Payment</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.downPayment || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Est. Credit Score</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.creditScore || 'N/A'}</td>
          </tr>
        </table>

        <h2 style="color: #1b3c6b; font-size: 18px; border-bottom: 2px solid #1b3c6b; padding-bottom: 8px;">Requesting Agent</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; width: 40%; border: 1px solid #e5e7eb; color: #374151;">Agent Name</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${senderName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Agent Email</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.agentEmail || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Agent Phone</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.agentPhone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f0f4f8; font-weight: 600; border: 1px solid #e5e7eb; color: #374151;">Brokerage</td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #111827;">${leadData?.brokerage || 'N/A'}</td>
          </tr>
        </table>

        ${leadData?.notes ? `
        <h2 style="color: #1b3c6b; font-size: 18px; border-bottom: 2px solid #1b3c6b; padding-bottom: 8px;">Additional Notes</h2>
        <p style="background: #f0f4f8; padding: 14px; border-radius: 6px; border: 1px solid #e5e7eb; color: #374151; line-height: 1.5;">${leadData.notes}</p>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
        <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
          This rate comparison request was sent via Pocket PRC on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.
        </p>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Pocket PRC <onboarding@resend.dev>',
      to: [recipient],
      subject,
      html: htmlBody,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: error.message || 'Failed to send email' });
    }

    console.log('Rate request email sent:', data.id);

    // Log to activity_log
    if (checklistId) {
      await query(
        `INSERT INTO activity_log (user_id, checklist_id, action, details)
         VALUES ($1, $2, 'rate_request_sent_anniemac', $3)`,
        [userId, checklistId, JSON.stringify({ recipient, propertyAddress, emailId: data.id })]
      );
    }

    res.json({
      success: true,
      message: `Rate comparison request sent to Annie Mac Home Mortgage (${recipient})`,
      emailId: data.id,
    });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

export default router;
