import { Client } from "../models/client.model.js";
import { getUserResponse } from "../services/user.service.js";

export async function dashboardOverview(request, response) {
  const [totalClients, activeClients, pendingVerification, suspendedClients] =
    await Promise.all([
      Client.countDocuments({ deletedAt: null }),
      Client.countDocuments({ deletedAt: null, status: "active" }),
      Client.countDocuments({ deletedAt: null, status: "pending_verification" }),
      Client.countDocuments({ deletedAt: null, status: "suspended" }),
    ]);

  response.status(200).json({
    data: {
      summary: {
        activeClients,
        pendingVerification,
        suspendedClients,
        totalClients,
      },
      user: getUserResponse(request.user),
    },
    message: "Dashboard access granted.",
    success: true,
  });
}
