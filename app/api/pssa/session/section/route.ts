import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  consumePssaRouteRateLimit,
  endPssaSessionSection,
  pssaErrorResponse,
  pssaRouteJson,
  requirePssaPostGuards,
  resumePssaSessionSection,
  reviewPssaSessionSection,
  validateSectionBody,
} from "@/lib/content/pssaFormSession";

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return withNoStore(auth.error);
  const guards = requirePssaPostGuards(req);
  if (guards.ok === false) return guards.response;
  const limited = await consumePssaRouteRateLimit(req, auth.user, "section");
  if (limited) return limited;
  try {
    const body = validateSectionBody(await req.json().catch(() => null));
    if (body.action === "review") return pssaRouteJson(await reviewPssaSessionSection(db, { auth: auth.user, sessionId: body.sessionId, sectionIndex: body.sectionIndex }));
    if (body.action === "resume") return pssaRouteJson(await resumePssaSessionSection(db, { auth: auth.user, sessionId: body.sessionId, sectionIndex: body.sectionIndex }));
    return pssaRouteJson(await endPssaSessionSection(db, { auth: auth.user, sessionId: body.sessionId, sectionIndex: body.sectionIndex }));
  } catch (error) {
    return pssaErrorResponse(error);
  }
}

function withNoStore(response: Response) {
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
