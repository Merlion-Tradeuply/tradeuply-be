import {
  createClientInvestment,
  listClientInvestments,
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
