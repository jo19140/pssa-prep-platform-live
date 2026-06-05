import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  consumePssaRouteRateLimit,
  getPssaSessionState,
  pssaErrorResponse,
  pssaRouteJson,
  validateStateQuery,
} from "@/lib/content/pssaFormSession";

export async function GET(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return withNoStore(auth.error);
  const limited = await consumePssaRouteRateLimit(req, auth.user, "state");
  if (limited) return limited;
  try {
    const query = validateStateQuery(new URL(req.url));
    return pssaRouteJson(await getPssaSessionState(db, { auth: auth.user, sessionId: query.sessionId }));
  } catch (error) {
    return pssaErrorResponse(error);
  }
}

function withNoStore(response: Response) {
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
