import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const formData = await req.formData();

  const paymentId = formData.get('payment_id');
  const orderId = formData.get('order_id');
  const signature = formData.get('signature');

  const host = req.headers.get('host'); 
  const protocol = req.headers.get('x-forwarded-proto') || 'http';

  const baseUrl = `${protocol}://${host}`;

  const url = new URL('/payment/callback', baseUrl);

  url.searchParams.set('payment_id', paymentId as string);
  url.searchParams.set('order_id', orderId as string);
  url.searchParams.set('signature', signature as string);

  // FORCE GET redirect (303 instead of 307)
  return NextResponse.redirect(url, 303);
}