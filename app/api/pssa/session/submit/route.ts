import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  consumePssaRouteRateLimit,
  pssaErrorResponse,
  pssaRouteJson,
  requirePssaPostGuards,
  submitPssaSession,
  validateSubmitBody,
} from "@/lib/content/pssaFormSession";

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return withNoStore(auth.error);
  const guards = requirePssaPostGuards(req);
  if (guards.ok === false) return guards.response;
  const limited = await consumePssaRouteRateLimit(req, auth.user, "submit");
  if (limited) return limited;
  try {
    const body = validateSubmitBody(await req.json().catch(() => null));
    return pssaRouteJson(await submitPssaSession(db, { auth: auth.user, ...body }));
  } catch (error) {
    return pssaErrorResponse(error);
  }
}

function withNoStore(response: Response) {
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
