import { api, Env } from "../../../../server/service";
export const dynamic = "force-dynamic";
function handle(req: Request) {
  const headers = new Headers(req.headers);
  headers.delete("oai-authenticated-user-id");
  headers.delete("oai-authenticated-user-email");
  return api(new Request(req, { headers }), process.env as Env);
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
