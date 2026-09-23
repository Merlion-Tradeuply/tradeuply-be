import { listClientTransactions } from "../services/client-transaction.service.js";

export async function getClientTransactions(request, response) {
  const result = await listClientTransactions(
    request.clientAuth.sub,
    request.validatedQuery,
  );
  response.status(200).json({ data: result, success: true });
}
