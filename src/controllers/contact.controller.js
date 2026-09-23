import { submitContactEnquiry } from "../services/contact.service.js";

export async function createContactEnquiry(request, response) {
  await submitContactEnquiry(request.validatedBody);

  response.status(202).json({
    message: "Your enquiry has been sent to the TradeUply support team.",
    success: true,
  });
}
