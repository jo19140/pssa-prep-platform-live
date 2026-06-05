import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  answerPssaSessionItem,
  consumePssaRouteRateLimit,
  pssaErrorResponse,
  pssaRouteJson,
  requirePssaPostGuards,
  validateAnswerBody,
} from "@/lib/content/pssaFormSession";

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return withNoStore(auth.error);
  const guards = requirePssaPostGuards(req);
  if (guards.ok === false) return guards.response;
  const limited = await consumePssaRouteRateLimit(req, auth.user, "answer");
  if (limited) return limited;
  try {
    const body = validateAnswerBody(await req.json().catch(() => null));
    return pssaRouteJson(await answerPssaSessionItem(db, { auth: auth.user, ...body }));
  } catch (error) {
    return pssaErrorResponse(error);
  }
}

function withNoStore(response: Response) {
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
