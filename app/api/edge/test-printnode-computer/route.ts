import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/test-printnode-computer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ⚠️ Repassa o token do usuário — obrigatório para auth na Edge Function
        Authorization: req.headers.get("authorization") ?? "",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
