import { getClientDashboard } from "../services/client-dashboard.service.js";

export async function clientDashboard(request, response) {
  const dashboard = await getClientDashboard(request.clientAuth.sub);
  response.status(200).json({ data: dashboard, success: true });
}
