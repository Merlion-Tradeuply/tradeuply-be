import {
  createClientInvestment,
  getClientInvestment,
  listClientInvestments,
  transferInvestmentCapital,
} from "../services/client-investment.service.js";

export async function addClientInvestment(request, response) {
  const investment = await createClientInvestment(
    request.clientAuth.sub,
    request.validatedBody,
  );
  response.status(201).json({
    data: { investment },
    message: "Your investment was created successfully.",
    success: true,
  });
}

export async function getClientInvestments(request, response) {
  const investments = await listClientInvestments(request.clientAuth.sub);
  response.status(200).json({ data: { investments }, success: true });
}

export async function getClientInvestmentDetails(request, response) {
  const investment = await getClientInvestment(
    request.clientAuth.sub,
    request.params.investmentId,
  );
  response.status(200).json({ data: { investment }, success: true });
}

export async function returnClientInvestmentCapital(request, response) {
  const investment = await transferInvestmentCapital(
    request.clientAuth.sub,
    request.params.investmentId,
  );
  response.status(200).json({
    data: { investment },
    message: "Your investment capital was returned to your wallet.",
    success: true,
  });
}
