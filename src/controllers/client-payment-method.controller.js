import {
  completeClientPaymentMethodQrUpload,
  createClientPaymentMethod,
  createClientPaymentMethodQrSignature,
  deleteClientPaymentMethod,
  listClientPaymentMethods,
  updateClientPaymentMethod,
} from "../services/client-payment-method.service.js";

export async function getClientWalletPaymentMethods(request, response) {
  const methods = await listClientPaymentMethods(request.clientAuth.sub);
  response.status(200).json({ data: { methods }, success: true });
}

export async function addClientWalletPaymentMethod(request, response) {
  const method = await createClientPaymentMethod(
    request.clientAuth.sub,
    request.validatedBody,
  );
  response.status(201).json({
    data: { method },
    message: "Your wallet payment method was added successfully.",
    success: true,
  });
}

export async function editClientWalletPaymentMethod(request, response) {
  const method = await updateClientPaymentMethod(
    request.clientAuth.sub,
    request.params.methodId,
    request.validatedBody,
  );
  response.status(200).json({
    data: { method },
    message: "Your wallet payment method was updated successfully.",
    success: true,
  });
}

export async function removeClientWalletPaymentMethod(request, response) {
  const result = await deleteClientPaymentMethod(
    request.clientAuth.sub,
    request.params.methodId,
  );
  response.status(200).json({
    data: result,
    message: "Your wallet payment method was deleted successfully.",
    success: true,
  });
}

export async function getClientWalletQrUploadSignature(request, response) {
  const upload = await createClientPaymentMethodQrSignature(
    request.clientAuth.sub,
    request.params.methodId,
  );
  response.status(200).json({ data: { upload }, success: true });
}

export async function completeClientWalletQrUpload(request, response) {
  const method = await completeClientPaymentMethodQrUpload(
    request.clientAuth.sub,
    request.params.methodId,
    request.validatedBody,
  );
  response.status(200).json({
    data: { method },
    message: "Your wallet QR code was uploaded successfully.",
    success: true,
  });
}
