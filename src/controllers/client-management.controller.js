import {
  deleteManagedClients,
  getManagedClient,
  listManagedClients,
  updateManagedClient,
} from "../services/client-management.service.js";
import { creditInvestmentBonus } from "../services/client-investment.service.js";

export async function getClients(request, response) {
  const result = await listManagedClients(request.validatedQuery);
  response.status(200).json({ data: result, success: true });
}

export async function getClientDetails(request, response) {
  const result = await getManagedClient(request.params.clientId);
  response.status(200).json({ data: result, success: true });
}

export async function addClientInvestmentBonus(request, response) {
  const result = await creditInvestmentBonus(
    request.params.clientId,
    request.params.investmentId,
    request.validatedBody,
    request.user,
  );
  response.status(201).json({
    data: result,
    message: "The investment bonus was credited successfully.",
    success: true,
  });
}

export async function editClient(request, response) {
  const client = await updateManagedClient(
    request.params.clientId,
    request.validatedBody,
  );
  response.status(200).json({
    data: { client },
    message: "The client was updated successfully.",
    success: true,
  });
}

export async function removeClients(request, response) {
  const result = await deleteManagedClients(request.validatedBody.ids);
  response.status(200).json({
    data: result,
    message: `${result.deletedCount} client${result.deletedCount === 1 ? "" : "s"} deleted successfully.`,
    success: true,
  });
}
