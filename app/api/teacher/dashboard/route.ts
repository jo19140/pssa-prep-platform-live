import { handleTeacherDashboardRequest } from "@/lib/teacherDashboardRouteHandler";

export async function GET(req: Request) {
  return handleTeacherDashboardRequest(req);
}
