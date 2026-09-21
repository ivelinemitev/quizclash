type RouteParams = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { code } = await params;
  const { getRoomStub } = await import("@/lib/rooms/client");
  const state = await getRoomStub(code).getPublicState();
  return Response.json(state);
}
