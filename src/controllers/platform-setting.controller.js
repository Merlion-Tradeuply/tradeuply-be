import {
  getPlatformSettings,
  updatePlatformSettings,
} from "../services/platform-setting.service.js";

export async function readPlatformSettings(_request, response) {
  const settings = await getPlatformSettings();
  response.status(200).json({ data: { settings }, success: true });
}

export async function editPlatformSettings(request, response) {
  const settings = await updatePlatformSettings(
    request.validatedBody,
    request.user._id,
  );
  response.status(200).json({
    data: { settings },
    message: "Platform settings were updated successfully.",
    success: true,
  });
}
