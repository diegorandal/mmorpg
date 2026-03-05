import { NextResponse } from 'next/server';

export async function POST() {
  const uuid = crypto.randomUUID().replace(/-/g, '');

  // TODO: Store the ID field in your database so you can verify the payment later

  // esto es backend, aca se genera el UUID y se lo enviamos al frontend, y se guarda en la DB

  return NextResponse.json({ id: uuid });
}
