import { sendContactEnquiryEmail } from "./email.service.js";

export async function submitContactEnquiry(enquiry) {
  await sendContactEnquiryEmail(enquiry);
}
