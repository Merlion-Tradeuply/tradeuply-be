import {
  deleteTransactions,
  listTransactions,
} from "../services/transaction.service.js";

export async function getTransactions(request, response) {
  const result = await listTransactions(request.validatedQuery);

  response.status(200).json({ data: result, success: true });
}

export async function removeTransactions(request, response) {
  const result = await deleteTransactions(request.validatedBody.ids);
  response.status(200).json({
    data: result,
    message: `${result.deletedCount} transaction${result.deletedCount === 1 ? "" : "s"} deleted successfully.`,
    success: true,
  });
}
