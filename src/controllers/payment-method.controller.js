import {
  completePaymentMethodQrUpload,
  createPaymentMethodQrUploadSignature,
  createPaymentMethod,
  deletePaymentMethods,
  getAdminPaymentMethods,
  getClientPaymentMethods,
  updatePaymentMethod,
  uploadPaymentMethodQrCode,
} from "../services/payment-method.service.js";

export async function clientPaymentMethods(_request, response) {
  const methods = await getClientPaymentMethods();
  response.status(200).json({ data: { methods }, success: true });
}

export async function getPaymentMethods(_request, response) {
  const methods = await getAdminPaymentMethods();
  response.status(200).json({ data: { methods }, success: true });
}

export async function addPaymentMethod(request, response) {
  const method = await createPaymentMethod(request.validatedBody);
  response.status(201).json({
    data: { method },
    message: "The payment method was created successfully.",
    success: true,
  });
}

export async function editPaymentMethod(request, response) {
  const method = await updatePaymentMethod(request.params.methodId, request.validatedBody);
  response.status(200).json({
    data: { method },
    message: "The payment method was updated successfully.",
    success: true,
  });
}

export async function removePaymentMethods(request, response) {
  const result = await deletePaymentMethods(request.validatedBody.ids);
  response.status(200).json({
    data: result,
    message: `${result.deletedCount} payment method${result.deletedCount === 1 ? "" : "s"} deleted successfully.`,
    success: true,
  });
}

export async function uploadPaymentMethodQr(request, response) {
  const result = await uploadPaymentMethodQrCode(request.params.methodId, request.file);
  response.status(200).json({
    data: result,
    message: "The payment method QR code was uploaded successfully.",
    success: true,
  });
}

export async function getPaymentMethodQrUploadSignature(request, response) {
  const upload = await createPaymentMethodQrUploadSignature(request.params.methodId);
  response.status(200).json({ data: { upload }, success: true });
}

export async function completePaymentMethodQr(request, response) {
  const result = await completePaymentMethodQrUpload(
    request.params.methodId,
    request.validatedBody,
  );
  response.status(200).json({
    data: result,
    message: "The payment method QR code was uploaded successfully.",
    success: true,
  });
}
