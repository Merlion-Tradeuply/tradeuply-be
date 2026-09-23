import { convertCurrency } from "../services/currency.service.js";

export async function getCurrencyConversion(request, response) {
  const conversion = await convertCurrency(
    request.validatedQuery.from,
    request.validatedQuery.to,
    request.validatedQuery.amount,
  );
  response.status(200).json({ data: { conversion }, success: true });
}
