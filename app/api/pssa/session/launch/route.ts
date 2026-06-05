import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  consumePssaRouteRateLimit,
  launchPssaFormSession,
  pssaErrorResponse,
  pssaRouteJson,
  requirePssaPostGuards,
  validateLaunchBody,
} from "@/lib/content/pssaFormSession";

export async function POST(req: Request) {
  const auth = await requireUser(["ADMIN", "TEACHER"]);
  if (auth.error) return withNoStore(auth.error);
  const guards = requirePssaPostGuards(req);
  if (guards.ok === false) return guards.response;
  const limited = await consumePssaRouteRateLimit(req, auth.user, "launch");
  if (limited) return limited;
  try {
    const body = validateLaunchBody(await req.json().catch(() => null));
    const result = await launchPssaFormSession(db, { auth: auth.user, userId: String(body.userId), formId: String(body.formId) });
    return pssaRouteJson(result, { status: 201 });
  } catch (error) {
    return pssaErrorResponse(error);
  }
}

function withNoStore(response: Response) {
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
