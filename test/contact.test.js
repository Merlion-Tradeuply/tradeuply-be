import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createContactEnquiryEmail } from "../src/templates/contact-enquiry.email.js";
import { contactEnquirySchema } from "../src/validators/contact.validator.js";

const validEnquiry = {
  email: " Visitor@Example.com ",
  fullName: "Demo Visitor",
  message: "I need help understanding my account access options.",
  subject: "Account Access",
};

describe("contact enquiries", () => {
  it("normalizes and validates a contact submission", () => {
    const enquiry = contactEnquirySchema.parse(validEnquiry);

    assert.equal(enquiry.email, "visitor@example.com");
    assert.equal(enquiry.fullName, "Demo Visitor");
  });

  it("rejects unsupported subjects and short messages", () => {
    const result = contactEnquirySchema.safeParse({
      ...validEnquiry,
      message: "Too short",
      subject: "Unexpected subject",
    });

    assert.equal(result.success, false);
  });

  it("escapes untrusted contact content in the HTML email", () => {
    const content = createContactEnquiryEmail({
      ...validEnquiry,
      fullName: "<script>alert(1)</script>",
      message: "Please review <strong>this enquiry</strong> safely.",
    });

    assert.doesNotMatch(content.html, /<script>/);
    assert.doesNotMatch(content.html, /<strong>this enquiry<\/strong>/);
    assert.match(content.html, /&lt;script&gt;/);
  });
});
