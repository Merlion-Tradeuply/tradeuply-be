import {
  createInvestmentPlan,
  deleteInvestmentPlans,
  listInvestmentPlans,
  listPublicInvestmentPlans,
  updateInvestmentPlan,
} from "../services/investment-plan.service.js";

export async function publicInvestmentPlans(_request, response) {
  const plans = await listPublicInvestmentPlans();
  response.status(200).json({ data: { plans }, success: true });
}

export async function getInvestmentPlans(request, response) {
  const result = await listInvestmentPlans(request.validatedQuery);
  response.status(200).json({ data: result, success: true });
}

export async function addInvestmentPlan(request, response) {
  const plan = await createInvestmentPlan(request.validatedBody);
  response.status(201).json({
    data: { plan },
    message: "The investment plan was created successfully.",
    success: true,
  });
}

export async function editInvestmentPlan(request, response) {
  const plan = await updateInvestmentPlan(request.params.planId, request.validatedBody);
  response.status(200).json({
    data: { plan },
    message: "The investment plan was updated successfully.",
    success: true,
  });
}

export async function removeInvestmentPlans(request, response) {
  const result = await deleteInvestmentPlans(request.validatedBody.ids);
  response.status(200).json({
    data: result,
    message: `${result.deletedCount} investment plan${result.deletedCount === 1 ? "" : "s"} deleted successfully.`,
    success: true,
  });
}
