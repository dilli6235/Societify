import type { Request, Response } from 'express';
import { paymentService } from './payments.service';
import { ok } from '@/core/http/ApiResponse';

class PaymentController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await paymentService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  recordManual = async (req: Request, res: Response): Promise<void> => {
    const payment = await paymentService.recordManual(req.tenant!.societyId, req.body);
    res.status(201).json(ok(payment));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await paymentService.updatePayment(req.tenant!.societyId, req.params.id, req.body)));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await paymentService.deletePayment(req.tenant!.societyId, req.params.id);
    res.json(ok({ deleted: true }));
  };

  createOrder = async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.createOnlineOrder(
      req.tenant!.db,
      req.tenant!.societyId,
      req.body,
    );
    res.status(201).json(ok(result));
  };

  verify = async (req: Request, res: Response): Promise<void> => {
    const payment = await paymentService.verifyAndCapture(req.tenant!.societyId, req.body);
    res.json(ok(payment));
  };

  /**
   * Public webhook (no auth, no tenant middleware). Requires the captured raw
   * body for signature verification. Always 200 on accepted/ignored events so
   * the gateway doesn't retry indefinitely; only signature failures 4xx.
   */
  webhook = async (req: Request, res: Response): Promise<void> => {
    const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('');
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    await paymentService.handleWebhook(rawBody, signature);
    res.json({ success: true });
  };
}

export const paymentController = new PaymentController();
