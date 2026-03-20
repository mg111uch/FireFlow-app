import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const formData = await req.formData();

  const paymentId = formData.get('razorpay_payment_id');
  const orderId = formData.get('razorpay_order_id');
  const signature = formData.get('razorpay_signature');

  // Get correct host (works for mobile + LAN)
  const host = req.headers.get('host'); // e.g. 192.168.1.5:3000
  const protocol = req.headers.get('x-forwarded-proto') || 'http';

  const baseUrl = `${protocol}://${host}`;

  const url = new URL('/payment/callback', baseUrl);

  url.searchParams.set('razorpay_payment_id', paymentId as string);
  url.searchParams.set('razorpay_order_id', orderId as string);
  url.searchParams.set('razorpay_signature', signature as string);

  // FORCE GET redirect (303 instead of 307)
  return NextResponse.redirect(url, 303);
}