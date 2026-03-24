import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/test-printnode-computer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ⚠️ Repassa o token do usuário logado — obrigatório para auth funcionar
        Authorization: req.headers.authorization ?? "",
      },
      body: JSON.stringify(req.body),
    }
  );

  const data = await response.json();
  return res.status(response.status).json(data);
}
